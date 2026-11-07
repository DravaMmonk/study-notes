// The tape (tape.js) on a minimal synthetic domain of numbers: a board's gradients, through a packed part too, match
// finite differences, and a plain run is untouched.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Tape, backward } from './tape.js'
import { defineParts } from './parts/define.js'
import { packed, runBoard, sink, source } from './boards.js'

const OPS = {
  mul: { run: ([a, b]) => a * b },
  add: { run: ([a, b]) => a + b },
  param: { leaf: true, run: ([v]) => v },
}
const RULES = {
  grad: (op, g, { args: [a, b] }) => (op === 'mul' ? [g * b, g * a] : op === 'add' ? [g, g] : null),
  add: (x, y) => x + y,
}
const FILE = {
  parts: {
    mul: { name: 'mul', inputs: [{ name: 'a' }, { name: 'b' }], compute: 'mul(a, b)' },
    add: { name: 'add', inputs: [{ name: 'a' }, { name: 'b' }], compute: 'add(a, b)' },
    weight: { name: 'weight', inputs: [], settings: [{ key: 'value', control: 'number', default: 0 }], compute: 'param($value)' },
  },
}
const { PARTS } = defineParts(FILE, OPS)

// out = (x · w + b) · w, the inner affine part packed.
const affine = { nodes: [{ id: 'x', type: 'in', params: { name: 'x' } }, { id: 'w', type: 'in', params: { name: 'w' } }, { id: 'b', type: 'in', params: { name: 'b' } }, { id: 'm', type: 'mul' }, { id: 'a', type: 'add' }, { id: 'o', type: 'out', params: { name: 'y' } }],
  wires: [{ from: 'x', to: 'm', port: 'a' }, { from: 'w', to: 'm', port: 'b' }, { from: 'm', to: 'a', port: 'a' }, { from: 'b', to: 'a', port: 'b' }, { from: 'a', to: 'o', port: 'in' }] }
const parts = (type) => ({ ...PARTS, in: source(), out: sink(), affine: packed({ circuit: affine, inputs: ['x', 'w', 'b'], outputs: ['y'] }) })[type]
const board = (w, b) => ({
  nodes: [{ id: 'x', type: 'in', params: { name: 'x' } }, { id: 'w', type: 'weight', params: { value: w } }, { id: 'b', type: 'weight', params: { value: b } }, { id: 'f', type: 'affine' }, { id: 'm', type: 'mul' }, { id: 'o', type: 'out', params: { name: 'y' } }],
  wires: [{ from: 'x', to: 'f', port: 'x' }, { from: 'w', to: 'f', port: 'w' }, { from: 'b', to: 'f', port: 'b' }, { from: 'f', to: 'm', port: 'a' }, { from: 'w', to: 'm', port: 'b' }, { from: 'm', to: 'o', port: 'in' }],
})

const lossOf = (w, b, x, y) => (runBoard(board(w, b), { parts, bind: { x } }).outputs.y - y) ** 2

test('gradients of a loss reach both parameters, through the packed part, as finite differences say', () => {
  const [w, b, x, y] = [0.7, -0.2, 1.5, 2]
  const tape = new Tape()
  const run = runBoard(board(w, b), { parts, bind: { x }, ctx: { tape } })
  const sinkId = run.ids.get('o')
  const out = run.outputs.y
  const grads = backward(tape, sinkId, 2 * (out - y), RULES)
  const gw = grads.get(tape.leaves.get('w').id)
  const gb = grads.get(tape.leaves.get('b').id)
  const h = 1e-6
  assert.ok(Math.abs(gw - (lossOf(w + h, b, x, y) - lossOf(w - h, b, x, y)) / (2 * h)) < 1e-6)
  assert.ok(Math.abs(gb - (lossOf(w, b + h, x, y) - lossOf(w, b - h, x, y)) / (2 * h)) < 1e-6)
})

test('a parameter used twice is one leaf; a run without a tape numbers nothing', () => {
  const tape = new Tape()
  runBoard(board(1, 0), { parts, bind: { x: 2 }, ctx: { tape } })
  assert.equal([...tape.leaves.keys()].sort().join(), 'b,w')
  assert.equal(runBoard(board(1, 0), { parts, bind: { x: 2 } }).ids, undefined)
})
