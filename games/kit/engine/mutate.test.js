// node --test (npm test, from trace-viewer) — the mutants of a board (mutate.js), on a board and parts written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluate } from './circuit.js'
import { mutants, mutationScore } from './mutate.js'

const two = (f) => ({ inputs: ['a', 'b'], settings: [], defaults: {}, eval: ({ a, b }) => f(a, b) })
const PARTS = {
  in: { inputs: [], source: true, eval: () => 0 },
  out: { inputs: ['in'], sink: true, eval: ({ in: v }) => v },
  add: two((a, b) => a + b),
  sub: two((a, b) => a - b),
  shift: { inputs: ['a'], settings: [{ key: 'by', control: 'number', min: 0, max: 3 }], defaults: { by: 1 }, eval: ({ a }, node) => a + (node.params?.by ?? 1) },
  mode: { inputs: ['a'], settings: [{ key: 'm', control: 'select', options: [{ value: 'keep' }, { value: 'neg' }] }], defaults: { m: 'keep' }, eval: ({ a }, node) => (node.params?.m === 'neg' ? -a : a) },
}
const options = { partOf: (t) => PARTS[t], isFixed: (t) => t === 'in' || t === 'out', held: ['add', 'sub', 'shift', 'mode'] }
// out = (x - y) + 1
const BOARD = {
  nodes: [{ id: 'x', type: 'in' }, { id: 'y', type: 'in' }, { id: 'd', type: 'sub' }, { id: 's', type: 'shift', params: { by: 1 } }, { id: 'out', type: 'out' }],
  wires: [{ from: 'x', to: 'd', port: 'a' }, { from: 'y', to: 'd', port: 'b' }, { from: 'd', to: 's', port: 'a' }, { from: 's', to: 'out', port: 'in' }],
}
const run = (board, x, y) => {
  const parts = { ...PARTS, in: { ...PARTS.in, eval: (_, node) => ({ x, y })[node.id] } }
  return evaluate(board, { parts }).values.get('out')
}
const passesOn = (cases) => (board) => cases.every(([x, y]) => run(board, x, y) === x - y + 1)

test('each operator makes its mutants, in a fixed order, and leaves the level’s own cards alone', () => {
  const made = mutants(BOARD, options).map((m) => m.what)
  assert.deepEqual(made, ['drop d', 'swap d a<->b', 'retype d sub->add', 'drop s', 'set s by=2', 'set s by=0', 'retype s shift->mode'])
  assert.deepEqual(mutants(BOARD, options).map((m) => m.what), made)
  for (const m of mutants(BOARD, options)) assert.deepEqual(m.board.nodes.filter((n) => options.isFixed(n.type)), BOARD.nodes.filter((n) => options.isFixed(n.type)))
  assert.deepEqual(mutants(BOARD, { ...options, limit: 2 }).map((m) => m.what), ['drop d', 'drop s'])
})

test('a setting moves to its other options; a fixed setting and a number at its bound do not move', () => {
  const board = { nodes: [{ id: 'x', type: 'in' }, { id: 'm', type: 'mode' }, { id: 's', type: 'shift', params: { by: 3 } }, { id: 'out', type: 'out' }], wires: [{ from: 'x', to: 'm', port: 'a' }, { from: 'm', to: 's', port: 'a' }, { from: 's', to: 'out', port: 'in' }] }
  const sets = mutants(board, options).map((m) => m.what).filter((w) => w.startsWith('set'))
  assert.deepEqual(sets, ['set m m=neg', 'set s by=2'])
})

test('weak tests let mutants live, and tests that tell them apart kill every one', () => {
  // With x = y = 0 the subtraction cannot be told from an addition, its inputs from each other, or it from a wire.
  const weak = mutationScore(BOARD, passesOn([[0, 0]]), options)
  assert.deepEqual(weak.survivors, ['drop d', 'swap d a<->b', 'retype d sub->add'])
  const strong = mutationScore(BOARD, passesOn([[0, 0], [5, 2]]), options)
  assert.deepEqual(strong, { made: 7, killed: 7, survivors: [], undeclared: [] })
})

test('a mutant that cannot run counts as killed', () => {
  const score = mutationScore(BOARD, () => { throw new Error('no') }, options)
  assert.equal(score.killed, score.made)
})

test('no swap between inputs a part declares symmetric: that is the same board', () => {
  const partOf = (t) => (t === 'add' ? { ...PARTS.add, symmetric: ['a', 'b'] } : t === 'sub' ? { ...PARTS.sub, symmetric: () => [] } : PARTS[t])
  const board = { ...BOARD, nodes: BOARD.nodes.map((n) => (n.id === 'd' ? { ...n, type: 'add' } : n)) }
  assert.ok(!mutants(board, { ...options, partOf }).some((m) => m.what.startsWith('swap')))
  assert.ok(mutants(BOARD, { ...options, partOf }).some((m) => m.what === 'swap d a<->b'))
})

test('settings listed as options by key, and a typed number among bare keys, move too', () => {
  const partOf = (t) => ({
    ...PARTS,
    pick: { inputs: ['a'], params: ['m'], settings: { m: ['keep', 'neg'] }, defaults: { m: 'keep' }, eval: ({ a }) => a },
    const: { inputs: ['a'], params: ['value', 'reg'], eval: ({ a }) => a },
  })[t]
  const board = { nodes: [{ id: 'x', type: 'in' }, { id: 'p', type: 'pick' }, { id: 'c', type: 'const', params: { value: '4', reg: 'A' } }, { id: 'out', type: 'out' }], wires: [{ from: 'x', to: 'p', port: 'a' }, { from: 'p', to: 'c', port: 'a' }, { from: 'c', to: 'out', port: 'in' }] }
  const made = mutants(board, { ...options, partOf, held: [] })
  assert.deepEqual(made.map((m) => m.what).filter((w) => w.startsWith('set')), ['set p m=neg', 'set c value=5', 'set c value=3'])
  assert.equal(made.find((m) => m.what === 'set c value=5').board.nodes.find((n) => n.id === 'c').params.value, '5')
})

test('a part wrongly declared symmetric is found out by its own swap', () => {
  const partOf = (t) => (t === 'sub' ? { ...PARTS.sub, symmetric: ['a', 'b'] } : PARTS[t])
  assert.deepEqual(mutationScore(BOARD, passesOn([[5, 2]]), { ...options, partOf }).undeclared, ['swap d a<->b'])
})
