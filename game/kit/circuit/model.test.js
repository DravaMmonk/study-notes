// node --test games/kit/circuit — a level's preset on a board: locked parts and wires stay, the rest is the player's.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { baseRefusal, connect, keepLocked, presetOf, removeNode, staysPut, withPreset } from './model.js'

const board = { nodes: [{ id: 'in', type: 'in', x: 0, y: 0 }, { id: 'out', type: 'out', x: 400, y: 0 }], wires: [] }
const preset = { nodes: [{ id: 'p', type: 'oracle', x: 200, y: 0 }], wires: [{ from: 'p', to: 'out', port: 'in' }] }

test('a preset goes onto a board locked, where the board already has its parts', () => {
  const started = withPreset(board, preset)
  assert.deepEqual(started.nodes.find((n) => n.id === 'p'), { id: 'p', type: 'oracle', x: 200, y: 0, locked: true })
  assert.deepEqual(started.wires, [{ from: 'p', to: 'out', port: 'in', locked: true }])
  const moved = { ...started, nodes: started.nodes.map((n) => (n.id === 'p' ? { ...n, x: 90, params: { k: 1 } } : n)) }
  const again = withPreset(moved, preset)
  assert.equal(again.nodes.find((n) => n.id === 'p').x, 90)
  assert.deepEqual(again.nodes.find((n) => n.id === 'p').params, { k: 1 })
})

test('a change keeps the locked parts and wires, and nothing else of the old board', () => {
  const started = withPreset(board, preset)
  const free = connect({ ...started, nodes: [...started.nodes, { id: 'q', type: 'x' }] }, 'p', 'in', 'in')
  const gone = keepLocked(free, removeNode(free, 'p'))
  assert.ok(gone.nodes.some((n) => n.id === 'p' && n.locked))
  assert.ok(gone.wires.some((w) => w.from === 'p' && w.locked))
  assert.ok(!gone.wires.some((w) => w.to === 'p' && w.port === 'in'))
  assert.ok(keepLocked(free, removeNode(free, 'q')).nodes.every((n) => n.id !== 'q'))
  const rewired = keepLocked(free, connect(free, 'out', 'in', 'in'))
  assert.deepEqual(rewired.wires.filter((w) => w.to === 'out'), [{ from: 'p', to: 'out', port: 'in', locked: true }])
})

test('a locked wire refuses another wire into its port; a free port takes one', () => {
  const started = withPreset(board, preset)
  assert.ok(baseRefusal(started, 'in', 'out', 'in'))
  assert.equal(baseRefusal(started, 'in', 'p', 'in'), null)
})

test('a preset may fix a part\'s settings, all of them or some', () => {
  const answer = { nodes: [{ id: 'r', type: 'rule', params: { rule: 'K', at: 'goal' } }], wires: [] }
  const some = withPreset(board, presetOf(answer, [{ id: 'r', fixed: ['rule'] }]))
  const edited = { ...some, nodes: some.nodes.map((n) => (n.id === 'r' ? { ...n, params: { rule: 'S', at: 'hyps' } } : n)) }
  assert.deepEqual(keepLocked(some, edited).nodes.find((n) => n.id === 'r').params, { rule: 'K', at: 'hyps' })
  const all = withPreset(board, presetOf(answer, [{ id: 'r', fixed: true }]))
  const changed = { ...all, nodes: all.nodes.map((n) => (n.id === 'r' ? { ...n, params: { rule: 'S', at: 'hyps' } } : n)) }
  assert.deepEqual(keepLocked(all, changed).nodes.find((n) => n.id === 'r').params, { rule: 'K', at: 'goal' })
  const free = withPreset(board, presetOf(answer, ['r']))
  const mine = { ...free, nodes: free.nodes.map((n) => (n.id === 'r' ? { ...n, params: { rule: 'S' } } : n)) }
  assert.deepEqual(keepLocked(free, mine).nodes.find((n) => n.id === 'r').params, { rule: 'S' })
})

test('a locked part that may nest keeps the region the board gives it; another keeps the preset\'s', () => {
  const boxes = { nodes: [{ id: 'a', type: 'box', x: 0, y: 0, nest: true }, { id: 'b', type: 'box', x: 200, y: 0, nest: true }, { id: 'c', type: 'x', x: 0, y: 200 }], wires: [] }
  const started = withPreset({ nodes: [], wires: [] }, boxes)
  const nested = { ...started, nodes: started.nodes.map((n) => (n.id === 'b' || n.id === 'c' ? { ...n, in: 'a/body' } : n)) }
  const kept = keepLocked(started, nested)
  assert.equal(kept.nodes.find((n) => n.id === 'b').in, 'a/body')
  assert.equal(kept.nodes.find((n) => n.id === 'c').in, undefined)
  assert.ok(staysPut(kept.nodes.find((n) => n.id === 'c')) && !staysPut(kept.nodes.find((n) => n.id === 'b')))
})
