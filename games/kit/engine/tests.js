// Running a level's tests, the same in every game. A domain says how one test runs and how it is judged; this file
// runs them all, adds the hidden ones, scores the circuit and applies the level's constraint.
//
//   domain.runTest(level, circuit, test) → { outputs, … }      what the circuit gives on one test
//   domain.check(level, test, outputs)   → [{ name, pass, … }] one verdict per output
//   domain.score?(level, circuit, results) → score             e.g. { nodes, cost }
//
// level.constraint?(score, circuit) → '' or a message: a circuit that passes every test can still fail a budget.

/** A level's tests followed by its hidden ones, each marked hidden. */
export const withHidden = (level) => (level.hidden?.length ? { ...level, tests: [...level.tests, ...level.hidden.map((t) => ({ ...t, hidden: true }))] } : level)

/** Run every test of `level` on `circuit`. Returns { results, score, constraint, pass }. */
export function runLevel(domain, level, circuit) {
  const results = level.tests.map((test) => {
    const run = domain.runTest(level, circuit, test)
    const checks = domain.check(level, test, run.outputs)
    return { ...run, checks, pass: checks.every((c) => c.pass) }
  })
  const score = domain.score ? domain.score(level, circuit, results) : {}
  const constraint = level.constraint?.(score, circuit) ?? ''
  return { results, score, constraint, pass: results.every((r) => r.pass) && !constraint }
}

/** The first test a run fails, as its index, or -1. */
export const firstFailure = (run) => run.results.findIndex((r) => !r.pass)
