// The world of 《软件工厂》: an abstract repository and the issues filed against it. Code itself is not modelled: a
// file is a list of named segments (functions, settings, doc sections), and an issue is a set of required edits, each
// on one segment. The tests check that every required edit is in, done right. What the model can make of an issue is
// model.js; this file is the repository's side: what a file, a listing or a test report puts in a context, what a
// write does to the repository, and what the tests say.
//
//   repo     { files: { path: { tokens, segs: [name] } } }
//   issue    { id, repo, title, text, tokens?, pasted?: [path], symptom?, edits: [{ at: 'path#seg', trap?, seen }] }
//            seen   what the issue's text gives away about an edit: 'file' (the file and the function), 'seg' (the
//                   function only) or 'none' (only the symptom: the edit shows up in a failing test, nowhere else)
//            trap   an edit the model first writes as a plausible wrong version (model.js)
//            pasted files whose code the issue quotes in full, so the model sees them with the issue
//            symptom the issue describes what goes wrong rather than what to change
//
// A context is a list of entries, each { kind, tokens, … }:
//   issue   { issue }                 file    { file }               list   { files: [{ file, segs }] }
//   report  { fails: [{ at, why }], green }                          act    { action } (what the model did, kept by the machine)
// An edit's state in a repository is 'right', 'wrong' (a trap's first try) or 'madeup' (code calling a function that
// does not exist, written by a model that never saw the segment); missing means untouched.

export const segOf = (at) => at.slice(at.indexOf('#') + 1)
export const fileOf = (at) => at.slice(0, at.indexOf('#'))

/** Tokens a model action costs to keep in a context. */
export const ACT_TOKENS = { read: 12, list: 8, test: 8, done: 6, write: 24 }
/** Tokens a test report takes: a line for the run and one for each failure. */
export const reportTokens = (fails) => 20 + 40 * fails.length
/** Tokens a listing takes: a line for each file. */
export const listTokens = (files) => 10 + files.reduce((n, f) => n + 6 + 3 * f.segs.length, 0)

export const issueEntry = (issue) => ({ kind: 'issue', issue, tokens: issue.tokens ?? 60 })
export const fileEntry = (repo, file) => ({ kind: 'file', file, tokens: repo.files[file]?.tokens ?? 0, missing: !repo.files[file] })
export function listEntry(repo) {
  const files = Object.entries(repo.files).map(([file, f]) => ({ file, segs: f.segs }))
  return { kind: 'list', files, tokens: listTokens(files) }
}
export const actEntry = (action) => ({ kind: 'act', action, tokens: ACT_TOKENS[action.type] + (action.type === 'write' ? 16 * (action.edits.length - 1) : 0) })

/** A fresh state of a repository: no edit made. */
export const freshState = () => ({})

/** The repository after a write action: each edit's segment now holds what the model wrote. */
export function applyWrite(state, action) {
  if (action?.type !== 'write') return state
  const next = { ...state }
  for (const e of action.edits) next[e.at] = e.how
  return next
}

/**
 * The tests on a repository state: every required edit must be in and right, and nothing made up anywhere. A
 * report lists each failure { at, why } (why: 'missing', 'wrong' or 'madeup') and is green with none.
 */
export function runTests(issue, state) {
  const fails = []
  for (const e of issue.edits) if (state[e.at] !== 'right') fails.push({ at: e.at, why: state[e.at] === 'madeup' ? 'madeup' : state[e.at] === 'wrong' ? 'wrong' : 'missing' })
  for (const [at, how] of Object.entries(state)) if (how === 'madeup' && !issue.edits.some((e) => e.at === at)) fails.push({ at, why: 'madeup' })
  return { kind: 'report', fails, green: fails.length === 0, tokens: reportTokens(fails) }
}

/** Every file of a world's repositories, for a read card's setting. */
export const filesOf = (repos) => [...new Set(repos.flatMap((r) => Object.keys(r.files)))]

/** The tokens of a context. */
export const tokensOf = (entries) => entries.reduce((n, e) => n + e.tokens, 0)
