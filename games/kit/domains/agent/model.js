// The model of 《软件工厂》: a deterministic stand-in for a large language model. A real model cannot run a level (it is
// not deterministic, it costs money, its tests cannot be exhausted), so this one is a set of written rules, the part's
// whole specification, each a wall the course is built around (games/factory/DESIGN.md 2.2):
//
//   only the context      an edit is written right only when what it asks and the segment it changes are both in view
//   it makes things up    asked to write a segment it has not seen, it writes code calling a function that does not exist
//   a window              the context is cut to the last `window` tokens; what falls off is gone, and it cannot tell
//   trap edits            an edit marked `trap` is first written as a plausible wrong version; with a failing test of
//                         it in view, it is written right
//   it says it is done    once it has written what it knows to write, it says it is done, tests or not
//
// A call reads a context (a list of entries, world.js) and gives one action:
//   { type: 'write', edits: [{ at, how: 'right' | 'wrong' | 'madeup' }] }  { type: 'read', file }  { type: 'list' }
//   { type: 'test' }  { type: 'done', why: 'finished' | 'no-issue' }
// In `once` mode (one call, nothing to call back) it writes all it knows at once, making up what it has not seen. In
// `loop` mode it may ask instead: to read a file it knows it needs, to list the repository when it does not know where a
// function lives, to run the tests when the issue only describes a symptom. An ask that came back with nothing (no tool
// answered: its action is in the context with no answer after it) is not asked again; it tries the next way, and in the
// end guesses.
import { fileOf, segOf, tokensOf } from './world.js'

/** The part of a context the model sees: the last entries that fit in `window` tokens. */
export function cut(entries, window) {
  let room = window
  let k = entries.length
  while (k > 0 && entries[k - 1].tokens <= room) {
    room -= entries[k - 1].tokens
    k -= 1
  }
  return { seen: entries.slice(k), dropped: entries.slice(0, k) }
}

const same = (a, b) => a.type === b.type && (a.file ?? null) === (b.file ?? null)

/** What the model makes of what it sees, for the rules and the views: the issue, what it knows to change, where. */
export function read(seen) {
  const issue = seen.findLast((e) => e.kind === 'issue')?.issue ?? null
  if (!issue) return { issue: null }
  const files = new Set([...(issue.pasted ?? []), ...seen.filter((e) => e.kind === 'file' && !e.missing).map((e) => e.file)])
  const listing = seen.findLast((e) => e.kind === 'list')
  // The last write of each segment, and the last report.
  const wrote = new Map()
  seen.forEach((e, i) => { if (e.kind === 'act' && e.action.type === 'write') for (const w of e.action.edits) wrote.set(w.at, i) })
  const reportAt = seen.findLastIndex((e) => e.kind === 'report')
  const report = reportAt < 0 ? null : seen[reportAt]
  const failing = new Set(report?.fails.map((f) => f.at) ?? [])
  // What it knows needs changing: the edits the issue gives away, and every failure a report shows.
  const known = [...new Set([...issue.edits.filter((e) => e.seen !== 'none').map((e) => e.at), ...(report?.fails.map((f) => f.at) ?? [])])]
  const trap = (where) => issue.edits.some((e) => e.at === where && e.trap)
  // An edit needs writing when it was never written in view, or a report after its last write fails it.
  const need = known.filter((where) => !wrote.has(where) || (reportAt > wrote.get(where) && failing.has(where)))
  // Where a segment lives: the issue names its file, a listing shows it, or a report names it.
  const located = (where) => issue.edits.some((e) => e.at === where && e.seen === 'file') || Boolean(listing?.files.some((f) => f.file === fileOf(where) && f.segs.includes(segOf(where)))) || failing.has(where)
  const asked = (action) => seen.some((e) => e.kind === 'act' && same(e.action, action))
  return { issue, files, listing, report, failing, known, need, trap, located, asked }
}

/** One call: the action the model gives for a context, in `once` or `loop` mode, with a window of `window` tokens. */
export function call(entries, { mode = 'loop', window = 4000 } = {}) {
  const { seen, dropped } = cut(entries, window)
  const view = read(seen)
  const result = (action) => ({ action, seen, dropped, tokens: tokensOf(seen) })
  if (!view.issue) return result({ type: 'done', why: 'no-issue' })
  const { files, need, trap, failing, located, asked, report, issue } = view
  // A write of what it can see; a trap is right only once a report fails it.
  const how = (where) => (!files.has(fileOf(where)) ? 'madeup' : trap(where) && !failing.has(where) ? 'wrong' : 'right')
  if (!need.length) {
    // A symptom with nothing to go on yet: in a loop, it runs the tests to see what fails.
    if (mode === 'loop' && issue.symptom && !report && !asked({ type: 'test' })) return result({ type: 'test' })
    return result({ type: 'done', why: 'finished' })
  }
  if (mode === 'once') return result({ type: 'write', edits: need.map((where) => ({ at: where, how: how(where) })) })
  const visible = need.filter((where) => files.has(fileOf(where)))
  if (visible.length) return result({ type: 'write', edits: visible.map((where) => ({ at: where, how: how(where) })) })
  const target = need[0]
  if (located(target) && !asked({ type: 'read', file: fileOf(target) })) return result({ type: 'read', file: fileOf(target) })
  if (!view.listing && !located(target) && !asked({ type: 'list' })) return result({ type: 'list' })
  if (!report && !asked({ type: 'test' })) return result({ type: 'test' })
  return result({ type: 'write', edits: [{ at: target, how: 'madeup' }] })
}
