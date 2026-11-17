import { T, WORDS as shared } from 'kernel/view'

export const WORDS = {
  ...shared,
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
  notWired: T('待接线', 'Not wired'),
  notConfigured: T('待配置', 'Not configured'),
}
