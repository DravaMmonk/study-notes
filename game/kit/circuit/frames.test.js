// node --test games/kit/circuit — frames: which wires a box lets through, moving cards in and out, taking one off.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { moveInto, scopeOf } from './frames.js'
import { baseRefusal, removeNode } from './model.js'

// A box `f` with one region that opens a value, and a card `m` inside it; `p` and `g` on the board.
const parts = { frames: (node) => (node.type === 'box' ? [{ name: 'body', opens: true }] : []) }
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
