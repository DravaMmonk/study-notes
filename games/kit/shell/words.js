// The words every game's screens use for the same things (games/DESIGN.md 6.10): a domain takes these and coins no
// other.
import { T } from './i18n.js'

export const WORDS = {
  result: T('结果', 'Result'),
  wanted: T('应得', 'Wanted'),
  // The run key: a board run step by step is run, one checked at once is checked; once passed, it says so.
  run: T('运行', 'Run'),
  check: T('检查', 'Check'),
  passed: T('通过', 'Passed'),
  sample: T('样张', 'Sample'),
  notWired: T('待接线', 'Not wired'),
  test: (k) => T(`测试 ${k + 1}`, `Test ${k + 1}`),
}
