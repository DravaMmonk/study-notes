import { T as t } from '../shell/i18n.js'

/** A level's tests followed by its hidden ones, each marked hidden. */
export const withHidden = (level) => (level.hidden?.length ? { ...level, tests: [...level.tests, ...level.hidden.map((t) => ({ ...t, hidden: true }))] } : level)

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
