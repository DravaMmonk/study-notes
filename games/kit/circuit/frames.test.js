// node --test games/kit/circuit — frames: which wires a box lets through, moving cards in and out, taking one off.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { framePart, moveInto, regionsFit, scopeOf } from './frames.js'
import { baseRefusal, clearSpot, moveToSlot, placement, removeNode } from './model.js'

// A box `f` with one region that opens a value, and a card `m` inside it; `p` and `g` on the board.
const parts = { role: (n) => (n.id === 'p' ? 'source' : 'part'), frames: (node) => (node.type === 'box' ? [{ name: 'body', opens: true }] : []) }
const board = {
  nodes: [{ id: 'p' }, { id: 'f', type: 'box' }, { id: 'm', in: 'f/body' }, { id: 'g' }],
  wires: [{ from: 'f#body', to: 'm', port: 'a' }, { from: 'm', to: 'f', port: 'body' }, { from: 'f', to: 'g', port: 'in' }],
}

test('a card knows the regions it sits in', () => {
  assert.deepEqual(scopeOf(board, 'm'), ['f/body'])
  assert.deepEqual(scopeOf(board, 'g'), [])
})

test('wires run inward, and a box reads back what was made from it', () => {
  assert.equal(baseRefusal(board, 'p', 'm', 'b', parts), null)
  assert.equal(baseRefusal(board, 'f#body', 'f', 'body', parts), null)
  assert.ok(baseRefusal(board, 'm', 'g', 'b', parts))
  assert.ok(baseRefusal(board, 'f#body', 'g', 'b', parts))
  // What the board holds may go straight to a region's result.
  assert.equal(baseRefusal(board, 'p', 'f', 'body', parts), null)
})

test('moving a card out of its box drops the wires it can no longer keep', () => {
  const out = moveInto(board, parts, 'm', null, 10, 10)
  assert.equal(out.nodes.find((n) => n.id === 'm').in, undefined)
  assert.deepEqual(out.wires, [{ from: 'm', to: 'f', port: 'body' }, { from: 'f', to: 'g', port: 'in' }])
  assert.equal(moveInto(board, parts, 'f', 'f/body', 0, 0), board)
})

test('taking a box off takes what is inside it too', () => {
  const left = removeNode(board, 'f')
  assert.deepEqual(left.nodes.map((n) => n.id), ['p', 'g'])
  assert.deepEqual(left.wires, [])
})

test('on a phone a box takes a whole row, and its region a grid of its own', () => {
  const top = placement(board, parts)
  assert.deepEqual([...top.cell], [['f', 0], ['g', 2]])
  assert.deepEqual(top.free, [3, 4, 5])
  const inside = placement(board, parts, 'f/body')
  assert.deepEqual([...inside.cell], [['m', 0]])
  assert.deepEqual([inside.size, inside.free], [4, [1, 2, 3]])
  // An empty region is one row.
  assert.equal(placement({ ...board, nodes: board.nodes.filter((n) => n.id !== 'm') }, parts, 'f/body').size, 2)
})

test('a block dragged into a region slot moves into the box', () => {
  const moved = moveToSlot(board, parts, 'g', 1, 'f/body')
  const g = moved.nodes.find((n) => n.id === 'g')
  assert.deepEqual([g.in, g.slot], ['f/body', 1])
  assert.deepEqual(moved.wires, board.wires)
})

test('a frame part has its own inputs, one per region, and outputs for the regions that open', () => {
  const part = framePart(['ab'], [{ name: 'left', opens: true }, { name: 'right', opens: false }])
  assert.deepEqual(part.inputs, ['ab', 'left', 'right'])
  assert.deepEqual(part.outputs(), [null, 'left'])
  assert.deepEqual(part.reads({}, 'left'), ['ab'])
  assert.equal(part.reads({}, null), undefined)
})

test('a saved board fits while every card sits in a region its frame has', () => {
  assert.equal(regionsFit(board, parts), true)
  assert.equal(regionsFit({ ...board, nodes: [...board.nodes, { id: 'x', in: 'f/gone' }] }, parts), false)
  assert.equal(regionsFit({ ...board, nodes: [...board.nodes, { id: 'y', in: 'missing/body' }] }, parts), false)
})

test('a card added over another moves to the nearest clear spot beside it', () => {
  const frame = [0, 0, 400, 500]
  assert.equal(clearSpot([frame], [140, 120], [440, 0]), null)
  const [x, y] = clearSpot([frame], [140, 120], [200, 40])
  assert.ok(x >= 416 || y >= 516)
  assert.equal(clearSpot([], [140, 120], [0, 0]), null)
})
