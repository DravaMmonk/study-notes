// node --test packages/circuit — a level's preset on a board: locked parts and wires stay, the rest is the player's.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cardPorts, portNotes, portOnCard } from '../../core/index.js'
import { boardFits, connectWire, editNodeSettings, hasPort, inPort, outPort, removeNode, spotIn, unplugWire, wireRefusal } from '../../core/index.js'
import { keepLocked, presetOf, withPreset } from '../../core/index.js'

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
  const parts = { role: (n) => n.type === 'in' ? 'source' : n.type === 'out' ? 'sink' : 'part', inputs: () => ['in'] }
  const started = withPreset(board, preset)
  const { graph: free } = connectWire({ ...started, nodes: [...started.nodes, { id: 'q', type: 'x' }] }, parts, { from: 'in', to: 'p', port: 'in' })
  for (const id of ['in', 'out', 'p', 'missing']) assert.equal(removeNode(free, parts, id), free)
  const gone = keepLocked(free, { ...free, nodes: free.nodes.filter((node) => node.id !== 'p'), wires: [] })
  assert.ok(gone.nodes.some((n) => n.id === 'p' && n.locked))
  assert.ok(gone.wires.some((w) => w.from === 'p' && w.locked))
  assert.ok(!gone.wires.some((w) => w.to === 'p' && w.port === 'in'))
  assert.ok(keepLocked(free, removeNode(free, parts, 'q')).nodes.every((n) => n.id !== 'q'))
  assert.match(connectWire(free, parts, { from: 'in', to: 'out', port: 'in' }).reason.en, /came with the level/)
  assert.match(unplugWire(free, 'out', 'in').reason.en, /came with the level/)
  const unplugged = unplugWire(free, 'p', 'in')
  assert.equal(unplugged.from, 'in')
  assert.deepEqual(unplugged.graph.wires, started.wires)
})

test('a locked wire refuses another wire into its port; a free port takes one', () => {
  const started = withPreset(board, preset)
  const parts = { role: (n) => n.type === 'out' ? 'sink' : 'part', inputs: () => ['in'] }
  assert.match(wireRefusal(started, parts, { from: 'in', to: 'out', port: 'in' }).en, /came with the level/)
  assert.equal(wireRefusal(started, parts, { from: 'in', to: 'p', port: 'in' }), null)
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
  const parts = { role: () => 'part', inputs: () => ['in'], loops: true, holds: (n) => n.type === 'held' }
  const backTo = (to) => ({ from: 'b', to, port: 'in' })
  assert.match(wireRefusal(board, parts, backTo('a')).en, /loop/, 'a loop of parts that answer at once')
  assert.equal(wireRefusal(board, parts, backTo('h')), null, 'a loop through a held part')
  assert.match(wireRefusal(board, { ...parts, loops: false }, backTo('h')).en, /loop/, 'no loops on a board without ticks')
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

test('stale ports are refused and card picks prefer a free compatible input', () => {
  const graph = {
    nodes: [{ id: 'p', params: { extra: true } }, { id: 'n' }, { id: 'other' }],
    wires: [{ from: 'other', to: 'n', port: 'used' }],
  }
  const parts = {
    role: () => 'part',
    inputs: (node) => node.id === 'n' ? ['wrong', 'used', 'free'] : [],
    outputs: (node) => node.params?.extra ? [{ key: null }, { key: 'tap' }] : null,
    refuse: (_board, { port }) => port === 'wrong' ? { en: 'incompatible input' } : null,
  }
  const tap = outPort('p#tap')
  const connection = { from: 'p#tap', to: 'n', port: 'free' }
  assert.equal(portOnCard(graph, parts, tap, graph.nodes[1]), inPort('n', 'free'))
  assert.equal(wireRefusal(graph, parts, connection), null)
  assert.match(wireRefusal(graph, parts, { ...connection, port: 'wrong' }).en, /incompatible/)
  const { graph: closed } = editNodeSettings(graph, parts, 'p', { extra: false })
  assert.equal(hasPort(graph, parts, tap), true)
  assert.equal(hasPort(closed, parts, tap), false)
  assert.match(wireRefusal(closed, parts, connection).en, /has no output “tap”/)
  assert.match(wireRefusal(graph, parts, { ...connection, port: 'gone' }).en, /has no input called “gone”/)
})

test('card picks try compatible public outputs and validate the replacement once', () => {
  const graph = { nodes: [{ id: 'old' }, { id: 'card' }, { id: 'sink' }], wires: [{ from: 'old', to: 'sink', port: 'in' }] }
  const parts = {
    role: (node) => node.id === 'sink' ? 'sink' : 'part',
    inputs: (node) => node.id === 'sink' ? ['in'] : [],
    outputs: (node) => node.id === 'card' ? [{ key: 'inside' }, { key: 'wrong' }, { key: 'right' }] : null,
    frames: (node) => node.id === 'card' ? [{ name: 'inside', opens: true }] : [],
    refuse: (candidate, wire) => {
      assert.deepEqual(candidate.wires, [wire])
      return wire.from === 'card#wrong' ? { en: 'incompatible output' } : null
    },
  }
  assert.equal(portOnCard(graph, parts, inPort('sink', 'in'), graph.nodes[1]), outPort('card#right'))
  const next = connectWire(graph, parts, { from: 'card#right', to: 'sink', port: 'in' })
  assert.deepEqual(next.graph.wires, [{ from: 'card#right', to: 'sink', port: 'in' }])
  assert.equal(graph.wires[0].from, 'old')
})

test('saved circuits reject unavailable, duplicate and cyclic wires while accepting held feedback', () => {
  const parts = {
    role: () => 'part',
    inputs: () => ['in'],
    loops: true,
    holds: (node) => node.type === 'hold',
  }
  const graph = {
    nodes: [{ id: 'a', type: 'hold' }, { id: 'b', type: 'plain' }, { id: 'c', type: 'plain' }],
    wires: [{ from: 'a', to: 'b', port: 'in', locked: true }, { from: 'b', to: 'a', port: 'in' }],
  }
  const fits = (candidate) => boardFits(candidate, parts, (type) => ['hold', 'plain'].includes(type))
  assert.ok(fits(graph))
  assert.equal(fits({ ...graph, nodes: [...graph.nodes, graph.nodes[0]] }), false)
  assert.equal(fits({ ...graph, nodes: [...graph.nodes, { id: 'd', type: 'unknown' }] }), false)
  assert.equal(fits({ ...graph, nodes: graph.nodes.map((node) => ({ ...node, type: 'plain' })) }), false)
  for (const wire of [
    { from: 'missing', to: 'c', port: 'in' },
    { from: 'a#closed', to: 'c', port: 'in' },
    { from: 'a', to: 'c', port: 'closed' },
    { from: 'c', to: 'b', port: 'in' },
  ]) assert.equal(fits({ ...graph, wires: [...graph.wires, wire] }), false)
})
