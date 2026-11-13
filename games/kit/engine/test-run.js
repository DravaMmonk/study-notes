// Running a task preserves every case's report for replay and diagnostics. The judge can still stop at the first
// failure, since it reads the reports instead of running the work again.
import { cases, property } from './judge.js'

const failed = (report) => report.fail ?? (report.error ? { why: report.error } : null)
const first = (reports, inspect) => cases(reports, (_, report) => inspect(report))(null)

export const runTests = (runTest) => (task, board, parts) => {
  const runs = task.tests.map((test) => runTest(task, board, test, parts))
  const fail = first(runs, failed)
  return { runs, fail, pass: !fail }
}

export function runOutputTests(domain, level, circuit) {
  const results = level.tests.map((test) => {
    const run = domain.runTest(level, circuit, test)
    const checks = domain.check(level, test, run.outputs)
    const fail = first(checks, (check) => check.pass ? null : { at: check.name, why: check.reason })
    return { ...run, checks, fail, pass: !fail }
  })
  const score = domain.score?.(level, circuit, results) ?? {}
  const constraint = level.constraint?.(score, circuit) ?? ''
  const fail = first(results, (result) => result.fail) ?? property(() => !constraint, () => ({ why: constraint }))(circuit)
  return { results, score, constraint, fail, pass: !fail }
}
