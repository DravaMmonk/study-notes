import { T, treeKey } from 'kernel/view'
import { tree, text, judgeSums } from '../core/sums.js'

function segment(node, path = []) {
  const key = treeKey(path)
  if (node === null) return { hole: key, label: T('加数', 'Addend') }
  const parts = typeof node === 'number' ? [String(node)] : [segment(node[0], [...path, 0]), ' + ', segment(node[1], [...path, 1])]
  return { part: key, family: 'sum', parts }
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
