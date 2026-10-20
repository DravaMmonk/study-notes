// node --test games/kit/circuit — reading and writing boards inside boards.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { boardAt, trail, withBoardAt } from './nested.js'

const inner = { nodes: [{ id: 'x', type: 'assume' }], wires: [] }
const top = { nodes: [{ id: 'box', type: 'impI', boards: { body: { nodes: [{ id: 'in', type: 'orE', boards: { left: inner } }], wires: [] } } }], wires: [] }

test('a path leads into a board inside a board, and back out', () => {
  const path = [{ node: 'box', board: 'body' }, { node: 'in', board: 'left' }]
  assert.equal(boardAt(top, path), inner)
  assert.deepEqual(boardAt(top, [{ node: 'in', board: 'x' }]), null)
  assert.deepEqual(boardAt(top, [{ node: 'box', board: 'other' }]), { nodes: [], wires: [] })
  const changed = withBoardAt(top, path, { nodes: [], wires: [] })
  assert.deepEqual(boardAt(changed, path), { nodes: [], wires: [] })
  assert.equal(boardAt(top, path), inner, 'the original is left alone')
  const names = trail(top, path, (n) => n.type, (n) => (n.type === 'orE' ? ['left', 'right'] : ['body']))
  assert.deepEqual(names, [{ label: 'impI', depth: 1 }, { label: 'orE · left', depth: 2 }])
})
