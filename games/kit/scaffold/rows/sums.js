import { cases } from '../../engine/judge.js'
import { T } from '../../shell/i18n.js'
import { holeTree, treeKey } from '../../strip/tree.js'

const tree = holeTree({
  kids: (node) => typeof node === 'number' ? [] : node.map((value) => ({ kind: 'sum', value })),
  withKid: (node, slot, value) => node.map((x, k) => k === slot ? value : x),
  root: 'sum',
})
const total = (node) => typeof node === 'number' ? node : node.reduce((sum, child) => sum + total(child), 0)
const text = (node) => typeof node === 'number' ? String(node) : node.map(text).join(' + ')

export function readSum(value) {
  if (!/^\d+(?: \+ \d+)*$/.test(value)) throw new Error('Write numbers separated by +')
  return value.split(' + ').map(Number).reduce((left, right) => [left, right])
}

export const judgeSums = (rows) => cases(rows, (work, row, k) => {
  if (!tree.complete(work[k])) return { at: { row: k, slot: 0 }, why: T('还有一行没写完。', 'A row is still unfinished.') }
  const got = total(work[k])
  return got === row.total ? null : { at: { row: k, slot: 0 }, want: row.total, got, why: { relation: 'evaluates', subject: text(work[k]), show: String } }
})

function segment(node, path = []) {
  const key = treeKey(path)
  if (node === null) return { hole: key, label: T('加数', 'Addend') }
  const parts = typeof node === 'number' ? [String(node)] : [segment(node[0], [...path, 0]), ' + ', segment(node[1], [...path, 1])]
  return { piece: key, family: 'sum', parts }
}

const language = {
  ...tree,
  label: T('加法式', 'Sum'),
  line: (node) => [segment(node)],
  joinsOnto: (node) => tree.trailing(node, 'sum'),
  groups: [['sum', T('加法', 'Addition')]],
}

export function sums(level) {
  const chips = level.rows.map((row) => [
    ...row.chips.map((n) => ({ key: String(n), text: String(n), group: 'sum', make: () => n })),
    { key: '+', text: '+', group: 'sum', leads: true, make: () => [null, null] },
  ])
  return {
    initial: (saved) => saved ?? level.rows.map(() => null),
    keep: (work) => work,
    judge: judgeSums(level.rows),
    rows: (work, change, scope) => ({
      wide: true,
      rows: level.rows.map((row, k) => ({ name: String(row.total), equation: true, slots: [{ text: tree.complete(work[k]) ? text(work[k]) : null }] })),
      editor: {
        slot: (k) => ({
          title: String(level.rows[k].total), equation: true, tree: work[k], chips: chips[k], language, scope: `${scope}:${k}`,
          onChange: (value) => change(work.map((x, j) => j === k ? value : x)),
        }),
      },
      blank: T('未写完'),
    }),
    passed: T('两边的值都相等。', 'Both sides have the same value in every row.'),
    score: () => null,
  }
}
