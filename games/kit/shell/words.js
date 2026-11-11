// The words every game's screens use for the same things (games/DESIGN.md 6.9): a domain takes these and coins no
// other.
import { T } from './i18n.js'

export const WORDS = {
  partition: T('分区', 'Partition'),
  partitionStart: T('点击分区的起始行，再点击结束行。'),
  partitionEnd: T('已选起始行，请点击结束行（包含两端）。'),
  manualBlocks: T('手动分区'),
  block: T('区块'),
  blockFull: T('全部显示'),
  blockPorts: T('仅显示端口'),
  blockHidden: T('不显示'),
  blockCount: (n) => T(`${n} 个元件`, `${n} parts`),
  blockNote: T('区块批注'),
  deleteBlock: T('删除区块'),
  moveBlock: T('拖动区块'),
  result: T('结果', 'Result'),
  wanted: T('目标', 'Target'),
  // The run key: a board run step by step is run, one checked at once is checked; once passed, it says so.
  run: T('运行'),
  check: T('检查'),
  passed: T('通过', 'Passed'),
  sample: T('样张'),
  notWired: T('待接线', 'Not wired'),
  test: (k) => T(`测试 ${k + 1}`, `Test ${k + 1}`),
}
