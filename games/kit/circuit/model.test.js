// node --test games/kit/circuit — a level's preset on a board: locked parts and wires stay, the rest is the player's.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cardPorts, portNotes } from './card-ports.js'
import { baseRefusal, connect, editNodeSettings, keepLocked, presetOf, removeNode, spotIn, withPreset } from './model.js'

const board = { nodes: [{ id: 'in', type: 'in', x: 0, y: 0 }, { id: 'out', type: 'out', x: 400, y: 0 }], wires: [] }
const preset = { nodes: [{ id: 'p', type: 'oracle', x: 200, y: 0 }], wires: [{ from: 'p', to: 'out', port: 'in' }] }

test('card ports keep frame openings inside and distinguish plain, named and missing outputs', () => {
  const declared = [{ key: 'left', label: 'Left assumption' }, { key: null }, { key: 'named' }]
  const parts = {
    role: (node) => node.type === 'sink' ? 'sink' : 'part',
    inputs: (node) => node.type === 'frame' ? ['main', 'left', 'closed'] : ['in'],
    frames: (node) => node.type === 'frame' ? [{ name: 'left', opens: true }, { name: 'closed', opens: false }] : [],
    outputs: (node) => node.type === 'frame' ? declared : node.type === 'quiet' ? [] : null,
  }
  assert.deepEqual(cardPorts(parts, { type: 'frame' }), {
    inputs: ['main'], outputs: [{ key: null }, { key: 'named' }],
    regions: [{ name: 'left', opens: true, output: declared[0] }, { name: 'closed', opens: false, output: undefined }],
  })
  assert.deepEqual(cardPorts(parts, { type: 'plain' }).outputs, [{ key: null, label: '' }])
  assert.deepEqual(cardPorts(parts, { type: 'quiet' }).outputs, [])
  assert.deepEqual(cardPorts(parts, { type: 'sink' }).outputs, [])

  const render = (node, key, ctx) => [node.id, key, ctx.path]
  const notes = portNotes({ outNote: render, resultNote: render }, { path: ['packed'] })
  assert.deepEqual(notes.outNote({ id: 'frame' }, 'named'), ['frame', 'named', ['packed']])
  assert.deepEqual(notes.resultNote({ id: 'frame' }, 'closed'), ['frame', 'closed', ['packed']])
  assert.equal(notes.regionNote, undefined)
})

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

test('a board run by ticks may loop only through a part that holds its value', () => {
  const board = { nodes: [{ id: 'a', type: 'not' }, { id: 'b', type: 'not' }, { id: 'h', type: 'held' }], wires: [{ from: 'a', to: 'b', port: 'in' }, { from: 'h', to: 'a', port: 'in' }] }
  const parts = { loops: true, holds: (n) => n.type === 'held' }
  assert.ok(baseRefusal(board, 'b', 'a', 'in', parts), 'a loop of parts that answer at once')
  assert.equal(baseRefusal(board, 'b', 'h', 'in', parts), null, 'a loop through a held part')
  assert.ok(baseRefusal(board, 'b', 'h', 'in', {}), 'no loops on a board without ticks')
})

test('a new card on the board goes left of the outputs, clear of what is there', () => {
  const graph = { nodes: [{ id: 'out', type: 'out', x: 600, y: 40 }, { id: 'a', type: 'add', x: 370, y: 40 }] }
  const [x] = spotIn(graph, null, 600)
  assert(x + 170 <= 600)
  assert(Math.abs(x - 370) >= 170)
})

test('changing a card shape preserves occupied regions and preset wires, and drops unused ports atomically', () => {
  const regions = (node) => node.type === 'frame' && node.params.extra ? [{ name: 'body', opens: true }] : []
  const parts = {
    role: (node) => node.id === 'out' ? 'sink' : 'part',
    frames: regions,
    inputs: (node) => ['in', ...regions(node).map(({ name }) => name)],
    outputs: (node) => [{ key: null }, ...regions(node).map(({ name }) => ({ key: name }))],
  }
  const empty = {
    nodes: [...board.nodes, { id: 'f', type: 'frame', params: { extra: true } }],
    wires: [
      { from: 'in', to: 'f', port: 'in' },
      { from: 'f#body', to: 'f', port: 'body' },
      { from: 'f', to: 'out', port: 'in' },
    ],
  }
  const occupied = { ...empty, nodes: [...empty.nodes, { id: 'child', in: 'f/body' }] }
  const locked = { ...empty, wires: empty.wires.map((wire) => wire.port === 'body' ? { ...wire, locked: true } : wire) }
  const close = (graph) => editNodeSettings(graph, parts, 'f', { extra: false })
  assert.match(close(occupied).reason.en, /Move the parts/)
  assert.match(close(locked).reason.en, /disconnect/)
  const { graph: closed } = close(empty)
  assert.deepEqual(closed.nodes.at(-1).params, { extra: false })
  assert.deepEqual(closed.wires, [empty.wires[0], empty.wires[2]])
  assert.deepEqual(empty.nodes.at(-1).params, { extra: true })
  assert.equal(empty.wires.length, 3)

  const fixed = { ...empty, nodes: [...empty.nodes.slice(0, -1), { ...empty.nodes.at(-1), fixed: ['extra', 'unset'] }] }
  assert.deepEqual(editNodeSettings(fixed, parts, 'f', { extra: false, unset: true }), { graph: fixed })
  const saved = { ...fixed, nodes: [...fixed.nodes.slice(0, -1), { ...fixed.nodes.at(-1), type: 'other', params: { note: 9 } }] }
  assert.deepEqual(keepLocked({ ...fixed, nodes: fixed.nodes.map(n => n.id === 'f' ? { ...n, locked: true } : n) }, saved).nodes.at(-1).params, { extra: true })
})
