// Chapter 0 of 《软件工厂》: no machine yet. The player is the loop: puts files into the model's context, calls it, does
// what it asks, runs the tests and puts the report back. A hand level holds one issue on one repository, and is passed
// when a test run the player starts comes back green.
//
//   level { machine: { mode, window }, test: { repo, issue }, solution: [op] }
//   op    ['add', file] | ['list'] | ['drop', k] | ['call'] | ['test']
// A session is { context, state, log, tokens, green }: the context the model will read (the issue first), the
// repository, what has happened ([{ op, … }] for the view), the tokens the calls took, and whether the last test run
// passed. In a loop the model's actions stay in the context, as a machine would keep them.
import { call } from './model.js'
import { actEntry, applyWrite, fileEntry, freshState, issueEntry, listEntry, runTests } from './world.js'

export const startHand = (level) => ({ context: [issueEntry(level.test.issue)], state: freshState(), log: [], tokens: 0, green: false })

/** The session after one op. */
export function stepHand(level, s, [op, arg]) {
  const { repo, issue } = level.test
  if (op === 'add') return { ...s, context: [...s.context, fileEntry(repo, arg)], log: [...s.log, { op, file: arg }] }
  if (op === 'list') return { ...s, context: [...s.context, listEntry(repo)], log: [...s.log, { op }] }
  if (op === 'drop') return { ...s, context: s.context.filter((_, k) => k !== arg), log: [...s.log, { op, entry: s.context[arg] }] }
  if (op === 'test') {
    const report = runTests(issue, s.state)
    return { ...s, context: [...s.context, report], log: [...s.log, { op, report }], green: report.green }
  }
  const made = call(s.context, level.machine)
  const kept = level.machine.mode === 'loop' ? [actEntry(made.action)] : []
  return { ...s, context: [...s.context, ...kept], state: applyWrite(s.state, made.action), tokens: s.tokens + made.tokens, log: [...s.log, { op, ...made }], green: false }
}

/** A whole run of ops from the start. */
export const playHand = (level, ops) => ops.reduce((s, op) => stepHand(level, s, op), startHand(level))
