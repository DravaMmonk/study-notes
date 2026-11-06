// The words every game's screens use for the same things (games/DESIGN.md 6.10): a domain takes these and coins no
// other.
import { T } from './i18n.js'

export const WORDS = {
  partition: T('分区', 'Partition'),
  manualBlocks: T('手动分区', 'Manual partitioning'),
  block: T('区块', 'Block'),
  blockFull: T('全部显示', 'Show all'),
  blockPorts: T('仅显示端口', 'Ports only'),
  blockHidden: T('不显示', 'Hide'),
  blockCount: (n) => T(`${n} 个元件`, `${n} parts`),
  blockNote: T('区块批注', 'Block note'),
  deleteBlock: T('删除区块', 'Delete block'),
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
