import { T as t } from '../shell/i18n.js'
import { failureOf, reportRuns } from './test-run.js'

/** A level's tests followed by its hidden ones, each marked hidden. */
export const withHidden = (level) => (level.hidden?.length ? { ...level, tests: [...level.tests, ...level.hidden.map((t) => ({ ...t, hidden: true }))] } : level)

/** Choose what the player can see while keeping the full test order for the runner. */
export function splitTests(task, revealed) {
  const all = withHidden(task)
  const shown = revealed ? all.tests : task.tests
  return { all, shown, hiddenCount: all.tests.length - shown.length }
}

/** Judge all cases once, then keep the visible runs and only the failed count for concealed cases. */
export function runTestGroups(task, revealed, run) {
  const { all, shown, hiddenCount } = splitTests(task, revealed)
  const report = run(all, shown.length)
  const hidden = hiddenCount ? { count: hiddenCount, failed: report.runs.slice(shown.length).filter(failureOf).length } : null
  const checked = hidden ? reportRuns(report.runs.slice(0, shown.length), report) : report
  return { shown, checked, hidden, pass: report.pass }
}

/**
 * What a game calls its tests, in each place the screen and a blind session say it: a test's tab (`label(k)`), the note
 * on how many are hidden (`note(n)`) and what it says when some hidden ones fail (`failed(fails, n)`). A test is a test
 * unless the game's world gives it a name of its own (a bus game's are buses).
 */
export const TEST_WORDS = {
  label: (k) => t(`测试 ${k + 1}`, `Test ${k + 1}`),
  note: (n) => t(`另有 ${n} 个隐藏测试，每次运行一并检查，通关后公开。`, `${n} more hidden ${n === 1 ? 'test is' : 'tests are'} checked with every run and shown once you pass.`),
  failed: (fails, n) => t(`可见的测试全部通过，但 ${n} 个隐藏测试中有 ${fails} 个没有通过：这块板可能只是恰好合上了这几个测试。`, `Every test shown passes, but ${fails} of ${n} hidden ${n === 1 ? 'test fails' : 'tests fail'}: the board may only happen to fit these.`),
}
