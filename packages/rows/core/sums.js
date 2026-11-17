import { cases } from 'kernel'
import { T } from 'kernel'
import { holeTree } from 'kernel'

export const tree = holeTree({
  kids: (node) => typeof node === 'number' ? [] : node.map((value) => ({ kind: 'sum', value })),
  withKid: (node, slot, value) => node.map((x, k) => k === slot ? value : x),
  root: 'sum',
})
const total = (node) => typeof node === 'number' ? node : node.reduce((sum, child) => sum + total(child), 0)
export const text = (node) => typeof node === 'number' ? String(node) : node.map(text).join(' + ')

export function readSum(value) {
  if (!/^\d+(?: \+ \d+)*$/.test(value)) throw new Error('Write numbers separated by +')
  return value.split(' + ').map(Number).reduce((left, right) => [left, right])
}

export const judgeSums = (rows) => cases(rows, (work, row, k) => {
  if (!tree.complete(work[k])) return { at: { row: k, slot: 0 }, why: T('还有一行没写完。', 'A row is still unfinished.') }
  const got = total(work[k])
  return got === row.total ? null : { at: { row: k, slot: 0 }, want: row.total, got, why: { relation: 'evaluates', subject: text(work[k]), show: String } }
})
