import { kindSchemas } from '../plugin-kinds.js'
import { contentKindSchemas } from '../content-kinds.js'
// A changeset: several operations (operations.js) applied to a game together, as one change.
//
//   { why?: text, by?: who, ops: [{ op: 'tag.set', …its arguments }] }
//
// `by` says who made the change, as the change log keeps it: a person's hand ('studio', 'cli') or an agent
// ('agent:<step>:<model>'). What a person changed of what an agent wrote is read from it (games/DIRECTION.md 4).
//
// A workspace opened for one side (workspace.js `scope`: the package, or the game) runs only that side's operations
// (operations.js opScope). Each operation's arguments are checked against its schema, then it runs on the workspace (workspace.js) in order;
// one that fails stops the changeset with nothing written. Then the game is checked as a whole: its content against
// its vocabulary, the course audit, the copy checks and its domain's checks (reference answers run, naive ones fail) —
// npm run check's rules (../checks.js). Only a changeset with no failure is written, with an entry in the game's change
// log (<game>/changes.jsonl, append only): what ran, the files and the changeset that undoes it. One that is refused,
// or only previewed, leaves the workspace as it found it. `cache`: the game's kept checks (../check-cache.js), so only the
// levels the changeset touches, and the levels after them its puzzles and answers reach, are checked again.
import { expandNames } from '../names.js'
import { parsePath } from './edit.js'
import { assertStableIds } from './identity.js'
import { shapeAt, validate } from '../schema.js'
import { OBJECT_SCHEMAS } from '../objects.js'
import { PART, PARTS_FILE } from '../parts/schema.js'
import { tasksSchema } from '../tasks.js'
import { ENTRY, checkContent } from '../vocabulary.js'
import { withParts } from '../parts/define.js'
import { checkGame } from '../checks.js'
import { runtimeOf } from '../content-node.js'
import { courseLevelCount } from '../content.js'
import { dependencyProblemsInProject } from '../project-dependencies.js'
import { OPERATIONS, opScope } from './operations.js'
import { hubCount } from './workspace.js'
import { append, hashOf, headOf, readLog, withLock } from './log.js'

export { LOG, readLog } from './log.js'

/**
 * Apply `changeset` to the open game `ws`. write: put it on disk when it passes (otherwise it is a dry run);
 * check: run the whole game's checks (off: only its content against the vocabulary, for a quick preview); domain: the
 * game's domain module (its own by default). Returns { ok, says, problems, failed (the index of the operation that
 * failed, or null), lines (every line of the check), diff, files, changes ([{ file, before, after }] texts), content
 * (the game as the changeset leaves it, null when an operation failed), inverse (the changeset undoing it) }.
 */
export async function runChangeset(ws, changeset, { write = false, check = true, undoes = null, base = null, domain: given = null, cache = null } = {}) {
  let domain = given ?? (await runtimeOf(ws.content(), ws.root))
  ws.schemas = domain.vocabulary
  const start = ws.snapshot()
  const says = []
  const inverse = []
  const fail = (problems, op = null) => {
    ws.restore(start)
    return { ok: false, says, problems, failed: op, lines: [], diff: '', files: [], changes: [], content: null, inverse: null }
  }
  for (const [k, { op: name, ...supplied }] of (changeset.ops ?? []).entries()) {
    const op = OPERATIONS[name]
    const where = `op ${k + 1} (${name})`
    if (!op) return fail([`${where}: no such operation; the operations are ${Object.keys(OPERATIONS).join(', ')}`], k)
    let args
    try {
      args = sourceArguments(ws, name, supplied, domain.vocabulary)
    } catch (error) {
      return fail([`${where}: ${error.en ?? error.message}`], k)
    }
    // A domain that defines its parts as data names them by the game's parts/<name>.json as each operation finds it.
    const vocabulary = withParts(domain.vocabulary, ws.partDefs)
    if (args.layer && args.layer !== ws.layer) return fail([`${where}: open layer ${args.layer} to edit its objects`], k)
    if (ws.scope && opScope({ op: name, ...args }) !== ws.scope) return fail([`${where}: this is the ${opScope({ op: name, ...args })} workspace's to change, not the ${ws.scope} workspace's`], k)
    const wrong = validate(op.params, args, { vocabulary, levels: new Set(ws.levels.keys()) })
    if (wrong.length) return fail(wrong.map((p) => `${where}: ${p.at === '(root)' ? '' : `${p.at.slice(1)}: `}${p.says}`), k)
    try {
      const previous = ws.snapshot()
      const done = op.apply(ws, args, { vocabulary, domain })
      if (ws.packageLayers !== previous.packageLayers && !given) {
        domain = await runtimeOf(ws.content(), ws.root)
        ws.schemas = domain.vocabulary
      }
      if (name.startsWith('kind.')) {
        const layers = ws.packageLayers.map(layer => layer.id !== ws.packageId ? layer : { ...layer, objects: [...layer.objects.filter(o => o.kind !== 'kind'), ...[...ws.contentObjects.kind].map(([name, value]) => ({ kind: 'kind', name, value }))] })
        // Rebuild from the unextended layer vocabulary, so replacing a declaration is a hard switch.
        const { layerVocabulary } = await import('../content-node.js')
        ws.schemas = layerVocabulary(layers)
        domain = { ...domain, vocabulary: ws.schemas }
        for (const kind of Object.keys(ws.contentObjects)) if (!kindSchemas(ws.schemas)[kind]) {
          if (ws.contentObjects[kind].size) throw new Error(`cannot remove nonempty kind ${kind}`)
          delete ws.contentObjects[kind]; delete ws.kindFolders[kind]
        }
        for (const [kind, definition] of Object.entries(ws.schemas.objectKinds)) if (!definition.extends) { ws.kindFolders[kind] = definition.folder; ws.contentObjects[kind] ??= new Map() }
      }
      ws.normalize(withParts(domain.vocabulary, ws.partDefs), previous)
      says.push(done.says)
      inverse.unshift(...done.inverse)
    } catch (error) {
      return fail([`${where}: ${error.message}`], k)
    }
  }

  // Whatever throws from here on (a domain's spec, its checks, the whole game's check) refuses the changeset and
  // leaves the workspace as it was found: fail restores it.
  try {
    if (!given) domain = await runtimeOf(ws.content(), ws.root)
    return await settle({ ws, changeset, domain, start, says, inverse, write, check, undoes, base, cache })
  } catch (error) {
    return fail([`the changeset could not be settled: ${error.message}`])
  }
}

// Tool results carry full names. Operations edit this layer's source spelling before writing it back.
function sourceArguments(ws, operation, supplied, vocabulary) {
  const prefix = `${ws.packageId}/`
  const local = (value) => typeof value === 'string' && value.startsWith(prefix) ? value.slice(prefix.length) : value
  const selectors = [...Object.keys(contentKindSchemas), 'level', 'part', 'entry', 'tag', 'relation', 'section', 'task', 'to', 'after']
  const selected = Object.fromEntries(Object.entries(supplied).map(([key, value]) => [key, selectors.includes(key) ? local(value) : value]))
  const source = (value, schema) => expandNames(value, ws.packageId, { parts: new Set(Object.keys(ws.partDefs?.parts ?? {})), schema, vocabulary, resolve: local })
  const args = source(selected, OPERATIONS[operation].params)
  if (operation.startsWith('kind.')) args.kind = local(args.kind)
  if (operation.startsWith('object.')) args.name = local(args.name)
  if (args.entry !== undefined) args.entry = local(args.entry)
  if (args.tag !== undefined) args.tag = local(args.tag)
  if (args.path !== undefined && (operation.startsWith('parts.') || args.in === 'parts')) {
    const path = parsePath(args.path)
    if (path[0] === 'parts' && path.length > 1) args.path = [path[0], local(path[1]), ...path.slice(2)]
  }
  const targets = {
    ...Object.fromEntries(Object.entries(contentKindSchemas).map(([kind, schema]) => [kind, [schema, ws.contentObjects[kind].get(args[kind])]])),
    level: [vocabulary.level, ws.levels.get(args.level)],
    task: [tasksSchema(vocabulary), undefined],
    entry: [ENTRY, ws.entries.get(args.entry)],
    game: [undefined, ws.game],
    ...Object.fromEntries(Object.entries({ tag: 'tags', relation: 'relations', section: 'sections', tray: 'trays' }).map(([kind, plural]) => [kind, [OBJECT_SCHEMAS[plural], ws[plural]?.get(args[kind])]])),
    part: [PART, ws.partDefs?.parts?.[args.part]],
    parts: [PARTS_FILE, ws.partDefs],
  }
  const [schema, base] = operation.startsWith('object.') ? [kindSchemas(vocabulary)[args.kind], ws.contentObjects[args.kind]?.get(args.name)] : targets[operation.split('.')[0]] ?? []
  if (operation.startsWith('game.') && args.value !== undefined && args.path !== undefined) {
    const gameSchema = shapeAt(vocabulary.game, ws.game, parsePath(args.path), { vocabulary })
    args.value = expandNames(supplied.value, ws.packaged ? ws.packageId : `@${ws.id}`, { parts: new Set(Object.keys(ws.partDefs?.parts ?? {})), schema: gameSchema, vocabulary, textKeys: false })
  }
  if (schema) {
    if (args.data) {
      args.data = source(supplied.data, schema)
      if (args.data.id) args.data = { ...args.data, id: local(args.data.id) }
      if (operation.endsWith('.put')) assertStableIds(base ?? {}, args.data)
    }
    if (args.fields) args.fields = source(args.fields, schema)
    if (base && args.value !== undefined && args.path !== undefined) args.value = source(supplied.value, shapeAt(schema, base, parsePath(args.path), { vocabulary }))
  }
  if (operation.startsWith('text.') && typeof args.value === 'string') args.value = source(args.value, { type: 'text' })
  if (operation === 'level.blueprint' && typeof args.text === 'string') args.text = source(args.text.split('\n'), { type: 'board' }).join('\n')
  return args
}

// The whole game's check, and the write or the restore, after every operation of a changeset has run.
async function settle({ ws, changeset, domain, start, says, inverse, write, check, undoes, base, cache }) {
  const content = ws.content()
  // The hub's count goes with the change (workspace.js), so it is checked against the levels there are now.
  const listed = ws.packaged || hubCount(ws.hub, ws.id) === null ? null : courseLevelCount(content, ws.levels.size)
  let lines
  if (check) lines = await checkGame(content, { domain, listed, cache, root: ws.root })
  else {
    const wrong = checkContent(domain, content)
    if (!wrong.length) wrong.push(...dependencyProblemsInProject(content, ws.root))
    lines = wrong.map((p) => ({ fail: true, text: `content: ${p.at}: ${p.says}` }))
  }
  const problems = lines.filter((l) => l.fail).map((l) => l.text)
  const changes = ws.changes()
  const diff = ws.diff()
  const files = changes.map((c) => c.file)
  const ok = problems.length === 0
  let refused = null
  if (ok && write) {
    // Written only onto the log the caller saw (`base`, the seq of its last entry, when given) and onto the files as
    // they were opened; the files' hashes go in the entry.
    refused = withLock(ws, () => {
      if (base !== null && headOf(ws) !== base) return `the game changed since you saw it (its log is at #${headOf(ws)}, not #${base}): load it again`
      try {
        ws.write()
      } catch (error) {
        return error.message
      }
      append(ws, { ...(ws.layer && { layer: ws.layer }), why: changeset.why, ...(changeset.by && { by: changeset.by }), ops: changeset.ops, files: changes.map((c) => ({ file: c.file, before: hashOf(c.before), after: hashOf(c.after) })), inverse, ...(undoes !== null && { undoes }) })
      return null
    })
  }
  if (!ok || !write || refused) ws.restore(start)
  if (refused) return { ok: false, says, problems: [refused], failed: null, lines, diff, files, changes, content, inverse: null }
  return { ok, says, problems, failed: null, lines, diff, files, changes, content, inverse: { why: `undo: ${changeset.why ?? says.join('; ')}`, ops: inverse } }
}

/** The last change of the log not undone yet (an undo is never itself undone this way: apply the change again). */
export function lastUndoable(ws) {
  const entries = readLog(ws)
  const undone = new Set(entries.map((e) => e.undoes).filter((x) => x !== undefined))
  return entries.filter((e) => !e.adopt && e.undoes === undefined && !undone.has(e.seq)).at(-1) ?? null
}

/**
 * Undo the last change of the log (write: put it on disk): only from the files as that change left them, so a file
 * changed since (by hand, or by a later change) is never written back over.
 */
export async function undo(ws, { seq = null, ...options } = {}) {
  const entry = lastUndoable(ws)
  const refused = (problem) => ({ ok: false, says: [], problems: [problem], failed: null, lines: [], diff: '', files: [], changes: [], content: null, inverse: null })
  if (!entry) return refused('nothing to undo')
  if (seq !== null && seq !== entry.seq) return refused(`#${seq} is not the change undo would undo now (#${entry.seq} is): the log has changed since`)
  if (entry.layer && entry.layer !== ws.layer) return refused(`open layer ${entry.layer} to undo its change`)
  const disk = ws.onDisk()
  const moved = entry.files.filter((f) => (disk.has(f.file) || f.file.includes('/i18n/')) && hashOf(disk.get(f.file)) !== f.after).map((f) => f.file)
  if (moved.length) return refused(`#${entry.seq} cannot be undone: changed since it was made: ${moved.join(', ')}`)
  return runChangeset(ws, { why: `undo #${entry.seq}${entry.why ? `: ${entry.why}` : ''}`, ops: entry.inverse }, { ...options, undoes: entry.seq })
}

/** Take the game's files as they are now into the log (after a change outside the operation set): the entry's seq. */
export function adopt(ws, why) {
  return withLock(ws, () => append(ws, { why, adopt: true, files: [...ws.onDisk()].map(([file, text]) => ({ file, after: hashOf(text) })) }))
}
