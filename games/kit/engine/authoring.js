// Author checks use the same judge as play. A report may carry the run as well as its first failure so the
// caller can explain all failures and retain scores without running the work again.
export function checkWorks(inspect, { reference, naive, empty, starter, built } = {}) {
  const check = (work, shouldPass) => {
    if (work == null) return null
    const report = inspect(work)
    return { ...report, ok: Boolean(report.fail) !== shouldPass }
  }
  return {
    reference: check(reference, true),
    naive: check(naive, false),
    empty: check(empty, false),
    starter: check(starter, false),
    built: check(built, true),
  }
}

/** Judge plain works when the caller needs no run report. */
export const judgeWorks = (judge, works) => checkWorks((work) => ({ fail: judge(work) }), works)

/** Mutation scoring is optional and asks the same question of every mutant. */
export const scoreWorks = (judge, reference, score) => score(reference, (work) => !judge(work))
