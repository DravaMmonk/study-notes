/* global process */
// A game's change log (<game>/changes.jsonl, append only) and the lock its writers share. Each entry says what its
// change did to every file it touched — the file's hash before and after (null: not there) — so the log and the files
// can be checked against each other: an undo goes back only from the state its entry left, and a file changed outside
// the operation set (by hand, by git) shows as drift until an `adopt` entry takes the files as they are.
//
//   { seq, at, why?, by?, ops, step, files: [{ file, before, after }], inverse, undoes? }   a change
//   { seq, at, why, adopt: true, files: [{ file, after }] }                            the files taken as they are
//
// Writers (a changeset, an undo, an adoption) hold the game's lock (withLock) from checking the files against the
// texts they were made on to appending the entry, so two processes never interleave, and seq is the last entry's + 1
// under it.
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

export const LOG = 'changes.jsonl'
const LOCK = 'changes.lock'

/** The hash a log entry keeps of a file's text (null: no file). */
export const hashOf = (text) => (text === null || text === undefined ? null : createHash('sha256').update(text).digest('hex').slice(0, 16))

/** The game's change log, oldest first. */
export function readLog(ws) {
  const file = resolve(ws.dir, LOG)
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)) : []
}

/** The seq of the log's last entry (0 for none): what a writer checks its base against. */
export const headOf = (ws) => readLog(ws).at(-1)?.seq ?? 0

/** Append an entry under the next seq (call it holding the lock). */
export function append(ws, entry) {
  const seq = headOf(ws) + 1
  appendFileSync(resolve(ws.dir, LOG), `${JSON.stringify({ seq, at: new Date().toISOString(), ...entry })}\n`)
  return seq
}

const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

// Whether the process that took a lock is still running.
const alive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

/** Run `fn` holding game `ws`'s lock (another writer waits, up to `wait` ms; a lock its writer left by dying is taken). */
export function withLock(ws, fn, { wait = 5000 } = {}) {
  const path = resolve(ws.dir, LOCK)
  const until = Date.now() + wait
  for (;;) {
    try {
      writeFileSync(path, String(process.pid), { flag: 'wx' })
      break
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      const holder = Number(readFileSync(path, 'utf8'))
      if (holder && !alive(holder)) rmSync(path, { force: true })
      else if (Date.now() > until) throw new Error(`${ws.id} is being changed by another writer (${LOCK}); try again`)
      else pause(50)
    }
  }
  try {
    return fn()
  } finally {
    rmSync(path, { force: true })
  }
}

/** What the log last says each file holds: Map file → hash (null: removed), from every entry's `after`. */
export function loggedState(ws) {
  const known = new Map()
  for (const entry of readLog(ws)) for (const f of entry.files ?? []) if (typeof f === 'object') known.set(f.file, f.after)
  return known
}

/**
 * The files whose text is not what the log last says (changed outside the operation set): [file]. `texts`: Map file → its text now (null: no file), for every file of the game.
 */
export function driftOf(ws, texts) {
  const log = readLog(ws)
  // A file the log never touched is judged only once an adoption has taken in every file the game had.
  const whole = log.some((e) => e.adopt)
  const known = loggedState(ws)
  return [...texts].filter(([file, text]) => (known.has(file) ? known.get(file) !== hashOf(text) : whole && text !== null)).map(([file]) => file)
}

/**
 * Who wrote what, and how much of what agents wrote a person then changed: [{ by, changes, files, revised }] by author,
 * `files` the files its changes wrote and `revised` those a person's later change touched while the agent's was still
 * the last word on them. Undos count as their author's changes; entries that say no author are 'unknown'.
 */
export function authorship(log) {
  const authors = new Map()
  const of = (by) => authors.get(by) ?? authors.set(by, { by, changes: 0, files: new Set(), revised: new Set() }).get(by)
  const last = new Map()
  for (const entry of log.filter((e) => !e.adopt)) {
    const by = entry.by ?? 'unknown'
    of(by).changes += 1
    for (const { file } of entry.files) {
      const before = last.get(file)
      if (before?.startsWith('agent:') && !by.startsWith('agent:')) of(before).revised.add(file)
      of(by).files.add(file)
      last.set(file, by)
    }
  }
  return [...authors.values()].map((a) => ({ by: a.by, changes: a.changes, files: a.files.size, revised: a.revised.size }))
}
