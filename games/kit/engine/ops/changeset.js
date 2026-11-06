// A changeset: several operations (operations.js) applied to a game together, as one change.
//
//   { why?: text, ops: [{ op: 'level.move', …its arguments }] }
//
// Each operation's arguments are checked against its schema, then it runs on the workspace (workspace.js) in order;
// one that fails stops the changeset with nothing written. Then the game is checked as a whole: its content against
// its vocabulary, the course audit, the copy checks and its domain's checks (reference answers run, naive ones fail) —
// npm run check's rules (../checks.js). Only a changeset with no failure is written, with an entry in the game's change
// log (<game>/changes.jsonl, append only): what ran, the files and the changeset that undoes it. One that is refused,
// or only previewed, leaves the workspace as it found it.
import { validate } from '../schema.js'
import { checkContent } from '../vocabulary.js'
import { withParts } from '../parts/define.js'
import { checkGame } from '../checks.js'
import { domainOf } from '../content-node.js'
import { OPERATIONS } from './operations.js'
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
export async function runChangeset(ws, changeset, { write = false, check = true, undoes = null, base = null, domain: given = null } = {}) {
  const domain = given ?? (await domainOf(ws.content()))
  const start = ws.snapshot()
  const says = []
  const inverse = []
  const fail = (problems, op = null) => {
    ws.restore(start)
    return { ok: false, says, problems, failed: op, lines: [], diff: '', files: [], changes: [], content: null, inverse: null }
  }
  for (const [k, { op: name, ...args }] of (changeset.ops ?? []).entries()) {
    const op = OPERATIONS[name]
    // A domain that defines its parts as data names them by the game's parts.json as each operation finds it.
    const vocabulary = withParts(domain.vocabulary, ws.partDefs)
    const where = `op ${k + 1} (${name})`
    if (!op) return fail([`${where}: no such operation; the operations are ${Object.keys(OPERATIONS).join(', ')}`], k)
    const wrong = validate(op.params, args, { vocabulary, levels: new Set(ws.levels.keys()) })
    if (wrong.length) return fail(wrong.map((p) => `${where}: ${p.at === '(root)' ? '' : `${p.at.slice(1)}: `}${p.says}`), k)
    try {
      const done = op.apply(ws, args, { vocabulary, domain })
      says.push(done.says)
      inverse.unshift(...done.inverse)
    } catch (error) {
      return fail([`${where}: ${error.message}`], k)
    }
  }

  // Whatever throws from here on (a domain's spec, its checks, the whole game's check) refuses the changeset and
  // leaves the workspace as it was found: fail restores it.
  try {
    return await settle({ ws, changeset, domain, start, says, inverse, write, check, undoes, base })
  } catch (error) {
    return fail([`the changeset could not be settled: ${error.message}`])
  }
}

// The whole game's check, and the write or the restore, after every operation of a changeset has run.
async function settle({ ws, changeset, domain, start, says, inverse, write, check, undoes, base }) {
  const content = ws.content()
  // The hub's count goes with the change (workspace.js), so it is checked against the levels there are now.
  const listed = hubCount(ws.hub, ws.id) === null ? null : ws.levels.size
  const lines = check ? await checkGame(content, { domain, listed }) : checkContent(domain, content).map((p) => ({ fail: true, text: `content: ${p.at}: ${p.says}` }))
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
      append(ws, { why: changeset.why, ops: changeset.ops, files: changes.map((c) => ({ file: c.file, before: hashOf(c.before), after: hashOf(c.after) })), inverse, ...(undoes !== null && { undoes }) })
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
export async function undo(ws, options = {}) {
  const entry = lastUndoable(ws)
  const refused = (problem) => ({ ok: false, says: [], problems: [problem], failed: null, lines: [], diff: '', files: [], changes: [], content: null, inverse: null })
  if (!entry) return refused('nothing to undo')
  const disk = ws.onDisk()
  const moved = entry.files.filter((f) => disk.has(f.file) && hashOf(disk.get(f.file)) !== f.after).map((f) => f.file)
  if (moved.length) return refused(`#${entry.seq} cannot be undone: changed since it was made: ${moved.join(', ')}`)
  return runChangeset(ws, { why: `undo #${entry.seq}${entry.why ? `: ${entry.why}` : ''}`, ops: entry.inverse }, { ...options, undoes: entry.seq })
}

/** Take the game's files as they are now into the log (after a change outside the operation set): the entry's seq. */
export function adopt(ws, why) {
  return withLock(ws, () => append(ws, { why, adopt: true, files: [...ws.onDisk()].map(([file, text]) => ({ file, after: hashOf(text) })) }))
}
