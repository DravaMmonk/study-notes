// A changeset: several operations (operations.js) applied to a game together, as one change.
//
//   { why?: text, ops: [{ op: 'level.move', …its arguments }] }
//
// Each operation's arguments are checked against its schema, then it runs on the workspace (workspace.js) in order;
// one that fails stops the changeset with nothing written. Then the save step the whole change needs is generated
// (migrate.js) and added to game.json's saves, and the game is checked as a whole: its content against its vocabulary,
// the course audit, the copy checks and its domain's checks (reference answers run, naive ones fail) — npm run check's
// rules (../checks.js). Only a changeset with no failure is written, with an entry in the game's change log
// (<game>/changes.jsonl, append only): what ran, the save step, the files and the changeset that undoes it. One that
// is refused, or only previewed, leaves the workspace as it found it.
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validate } from '../schema.js'
import { checkContent } from '../vocabulary.js'
import { checkGame } from '../checks.js'
import { domainOf } from '../content-node.js'
import { OPERATIONS } from './operations.js'
import { saveOps } from './migrate.js'
import { hubCount } from './workspace.js'

export const LOG = 'changes.jsonl'

/**
 * A course as the migration generator reads it (migrate.js), or null when the content does not fit its vocabulary:
 * its levels with what each requires, as the course lays them out (../../course.js: by its eras, or without eras each
 * level after the one before it), and what each builds.
 */
function courseOf(domain, content) {
  if (checkContent(domain.vocabulary, content).length) return null
  const { course } = domain.spec(content)
  const levels = course.levels.map((l, k) => ({ id: l.id, requires: course.plan ? course.plan.requires.get(l.id) ?? [] : k ? [course.levels[k - 1].id] : [] }))
  return { levels, builds: (id) => (course.index.has(id) ? course.builds(course.levels[course.index.get(id)]) : []) }
}

/**
 * Apply `changeset` to the open game `ws`. write: put it on disk when it passes (otherwise it is a dry run);
 * check: run the whole game's checks (off: only its content against the vocabulary, for a quick preview); domain: the
 * game's domain module (its own by default). Returns { ok, says, problems, step (the save step added, or null), diff,
 * files, inverse (the changeset undoing it), notes }.
 */
export async function runChangeset(ws, changeset, { write = false, check = true, undoes = null, domain: given = null } = {}) {
  const content0 = ws.content()
  const domain = given ?? (await domainOf(content0))
  const { vocabulary } = domain
  const start = ws.snapshot()
  const says = []
  const inverse = []
  const idOps = []
  const placed = new Set()
  const own = new Set()
  const fail = (problems) => {
    ws.restore(start)
    return { ok: false, says, problems, step: null, diff: '', files: [], inverse: null, notes: [] }
  }
  for (const [k, { op: name, ...args }] of (changeset.ops ?? []).entries()) {
    const op = OPERATIONS[name]
    const where = `op ${k + 1} (${name})`
    if (!op) return fail([`${where}: no such operation; the operations are ${Object.keys(OPERATIONS).join(', ')}`])
    const wrong = validate(op.params, args, { vocabulary, levels: new Set(ws.levels.keys()) })
    if (wrong.length) return fail(wrong.map((p) => `${where}: ${p.at === '(root)' ? '' : `${p.at.slice(1)}: `}${p.says}`))
    try {
      const done = op.apply(ws, args, { vocabulary, domain })
      says.push(done.says)
      inverse.unshift(...done.inverse)
      idOps.push(...(done.saves ?? []))
      for (const op of done.saves ?? []) for (const [from, to] of Object.entries(op.rename ?? {})) if (placed.delete(from) && to !== null) placed.add(to)
      for (const id of done.placed ?? []) placed.add(id)
      for (const id of done.own ?? []) own.add(id)
    } catch (error) {
      return fail([`${where}: ${error.message}`])
    }
  }

  // The save step: the operations' own ops, the levels whose kept state no longer applies, new prerequisites, new builds.
  const notes = []
  const before = courseOf(domain, content0)
  const content1 = ws.content()
  const after = courseOf(domain, content1)
  if (!before || !after) notes.push(`the content ${before ? 'after' : 'before'} the changeset does not fit its vocabulary: the save step has only the operations’ own ops and the domain’s`)
  const renamed = new Map()
  for (const op of idOps) for (const [from, to] of Object.entries(op.rename ?? {})) renamed.set(to, renamed.get(from) ?? from)
  const stale = domain.changes ? [...ws.levels.keys()].filter((id) => !own.has(id)).filter((id) => {
    const old = start.levels.get(renamed.get(id) ?? id)
    return old !== undefined && domain.changes.stale(old, ws.levels.get(id))
  }) : []
  let step = null
  try {
    const ops = saveOps({ before: after && before, after, idOps, placed, stale, drop: domain.changes?.drop })
    if (ops.length) {
      const saves = ws.game.saves ?? []
      // A step says why it was written where the game's schema has room for it.
      const why = changeset.why && vocabulary.game.fields?.saves?.of?.fields?.why ? { why: changeset.why } : {}
      step = { version: Math.max(1, ...saves.map((s) => s.version)) + 1, ...why, ops }
      ws.game = { ...ws.game, saves: [...saves, step] }
    }
  } catch (error) {
    return fail([`save migration: ${error.message}`])
  }

  const content = ws.content()
  // The hub's count goes with the change (workspace.js), so it is checked against the levels there are now.
  const listed = hubCount(ws.hub, ws.id) === null ? null : ws.levels.size
  const lines = check ? await checkGame(content, { domain, listed }) : checkContent(vocabulary, content).map((p) => ({ fail: true, text: `content: ${p.at}: ${p.says}` }))
  const problems = lines.filter((l) => l.fail).map((l) => l.text)
  const diff = ws.diff()
  const files = ws.changes().map((c) => c.file)
  const ok = problems.length === 0
  if (ok && write) {
    ws.write()
    log(ws, { why: changeset.why, ops: changeset.ops, step, files, inverse, ...(undoes !== null && { undoes }) })
  } else ws.restore(start)
  return { ok, says, problems, step, diff, files, inverse: { why: `undo: ${changeset.why ?? says.join('; ')}`, ops: inverse }, notes }
}

/** The game's change log, oldest first. */
export function readLog(ws) {
  const file = resolve(ws.dir, LOG)
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)) : []
}

function log(ws, entry) {
  const seq = (readLog(ws).at(-1)?.seq ?? 0) + 1
  appendFileSync(resolve(ws.dir, LOG), `${JSON.stringify({ seq, at: new Date().toISOString(), ...entry })}\n`)
}

/** The last change of the log not undone yet (an undo is never itself undone this way: apply the change again). */
export function lastUndoable(ws) {
  const entries = readLog(ws)
  const undone = new Set(entries.map((e) => e.undoes).filter((x) => x !== undefined))
  return entries.filter((e) => e.undoes === undefined && !undone.has(e.seq)).at(-1) ?? null
}

/** Undo the last change of the log (write: put it on disk). */
export async function undo(ws, options = {}) {
  const entry = lastUndoable(ws)
  if (!entry) return { ok: false, says: [], problems: ['nothing to undo'], step: null, diff: '', files: [], inverse: null, notes: [] }
  return runChangeset(ws, { why: `undo #${entry.seq}${entry.why ? `: ${entry.why}` : ''}`, ops: entry.inverse }, { ...options, undoes: entry.seq })
}
