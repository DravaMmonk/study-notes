// A task report keeps every case for replay, together with the first failure and any whole-work constraint.
import { firstFailure } from './judge.js'

export const failureOf = (run) => run.fail ?? (run.error ? { why: run.error } : null)
export const firstRunFailure = (runs) => firstFailure(runs, failureOf)

export function reportRuns(runs, { score, constraint } = {}) {
  const fail = firstRunFailure(runs) ?? (constraint ? { why: constraint } : null)
  return { runs, fail, pass: !fail, score, constraint }
}

const caseOptions = (options, at) => at >= (options?.traceCount ?? Infinity) ? { ...options, traced: false } : options

export const runTests = (runTest) => (task, work, parts, options) =>
  reportRuns(task.tests.map((test, at) => runTest(task, work, test, parts, caseOptions(options, at))))

export function runOutputTests(domain, task, work, options) {
  const runs = task.tests.map((test, at) => {
    const run = domain.runTest(task, work, test, caseOptions(options, at))
    const checks = domain.check(task, test, run.outputs)
    const fail = firstFailure(checks, ({ name, pass, reason }) => pass ? null : { at: name, why: reason }) ?? failureOf(run)
    return { ...run, checks, fail, pass: !fail }
  })
  const score = domain.score?.(task, work, runs) ?? {}
  const constraint = task.constraint?.(score, work) ?? ''
  return reportRuns(runs, { score, constraint })
}
