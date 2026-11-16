// node --test games/kit/circuit — frames: which wires a box lets through, moving cards in and out, taking one off.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { framePart, moveInto } from './frames.js'
import { movePhonePart } from './blocks.js'
import { flowBoard, primitivesOnly } from '../engine/board-cards.js'
import { frameTree, regionsFit } from './regions.js'
import { keepLocked, lockedCards, presetOf, withPreset } from './presets.js'
import { boardFits, clearSpot, placement, removeNode, wireRefusal } from './model.js'
import { traySize } from './card-size.js'

// A box `f` with one region that opens a value, and a card `m` inside it; `p` and `g` on the board.
const parts = {
  role: (n) => n.id === 'p' ? 'source' : 'part',
  frames: (node) => node.type === 'box' ? [{ name: 'body', opens: true }] : [],
}
const board = {
  nodes: [{ id: 'p' }, { id: 'f', type: 'box' }, { id: 'm', in: 'f/body' }, { id: 'g' }],
  wires: [{ from: 'f#body', to: 'm', port: 'a' }, { from: 'm', to: 'f', port: 'body' }, { from: 'f', to: 'g', port: 'in' }],
}

test('a card knows the regions it sits in', () => {
  const tree = frameTree(board.nodes)
  assert.deepEqual(tree.ancestors(tree.node('m').in), ['f/body'])
  assert.deepEqual(tree.ancestors(tree.node('g').in), [])
})

test('wires run inward, and a box reads back what was made from it', () => {
  const wiring = {
    ...parts,
    inputs: (node) => node.type === 'box' ? ['body'] : ['a', 'b', 'in'],
    outputs: (node) => node.type === 'box' ? [{ key: null }, { key: 'body' }] : null,
  }
  const refused = (from, to, port) => wireRefusal(board, wiring, { from, to, port })
  assert.equal(refused('p', 'm', 'b'), null)
  assert.equal(refused('f#body', 'f', 'body'), null)
  assert.ok(refused('m', 'g', 'b'))
  assert.ok(refused('f#body', 'g', 'b'))
  // What the board holds may go straight to a region's result.
  assert.equal(refused('p', 'f', 'body'), null)
})

test('moving a card out of its box drops the wires it can no longer keep', () => {
  const out = moveInto(board, parts, 'm', null, 10, 10)
  assert.equal(out.nodes.find((n) => n.id === 'm').in, undefined)
  assert.deepEqual(out.wires, [{ from: 'm', to: 'f', port: 'body' }, { from: 'f', to: 'g', port: 'in' }])
  assert.equal(moveInto(board, parts, 'f', 'f/body', 0, 0), board)
})

test('taking a box off takes what is inside it too', () => {
  const left = removeNode(board, parts, 'f')
  assert.deepEqual(left.nodes.map((n) => n.id), ['p', 'g'])
  assert.deepEqual(left.wires, [])
})

test('inputs and outputs cannot move into a frame or reopen inside one', () => {
  const graph = { nodes: [{ id: 'p', type: 'in' }, { id: 'g', type: 'out' }, { id: 'f', type: 'box' }], wires: [] }
  const wiring = { ...parts, role: (n) => n.type === 'out' ? 'sink' : parts.role(n) }
  for (const id of ['p', 'g']) {
    assert.equal(moveInto(graph, wiring, id, 'f/body', 10, 10), graph)
    const invalid = { ...graph, nodes: graph.nodes.map((n) => n.id === id ? { ...n, in: 'f/body' } : n) }
    assert.equal(boardFits(invalid, wiring, () => true), false)
  }
  assert.equal(boardFits(graph, wiring, () => true), true)
})

test('on a phone a box takes the rows of its regions, each a grid of its own between a head row and a foot row', () => {
  const top = placement(board, parts)
  assert.deepEqual([...top.cell], [['f', 0], ['g', 10]])
  assert.deepEqual(top.span.get('f'), [2, 5])
  assert.deepEqual(top.free, [11, 12, 13])
  assert.deepEqual([...top.frameHeads], [0])
  const inside = placement(board, parts, 'f/body')
  assert.deepEqual([...inside.cell], [['m', 0]])
  assert.deepEqual([inside.size, inside.free], [4, [1, 2, 3]])
  // An empty region is one row.
  assert.equal(placement({ ...board, nodes: board.nodes.filter((n) => n.id !== 'm') }, parts, 'f/body').size, 2)
  const textCards = { ...parts, availableWidth: 390, valueView: (node) => node.id === 'm' ? 'sensor' : 'value' }
  const nested = placement(board, textCards, 'f/body')
  assert.deepEqual(nested.span.get('m'), [2, 1])
  assert.deepEqual(nested.free, [2, 3])
  assert.deepEqual(placement(board, textCards).span.get('g'), [1, 1])
})

test('a block dragged into a region slot moves into the box', () => {
  assert.equal(movePhonePart(board, parts, 'g', 0, 'f/body'), null)
  const { graph: moved } = movePhonePart(board, parts, 'g', 1, 'f/body')
  const g = moved.nodes.find((n) => n.id === 'g')
  assert.deepEqual([g.in, g.slot], ['f/body', 1])
  assert.deepEqual(moved.wires, board.wires)
})

test('a frame swap requires room for both footprints and preserves other slots', () => {
  const saved = {
    nodes: [{ id: 'f', type: 'box', slot: 2 }, { id: 'g', slot: 1 }, { id: 'bystander', slot: 12 }],
    wires: [],
  }
  assert.equal(movePhonePart(saved, parts, 'f', 1), null)
  assert.equal(movePhonePart(saved, parts, 'f', 3), null)
  assert.equal(movePhonePart(saved, parts, 'f', 0), null)
  assert.equal(movePhonePart(saved, parts, 'f', 2).graph, saved)

  const open = { ...saved, nodes: saved.nodes.map((node) => node.id === 'g' ? { ...node, slot: 14 } : node) }
  const legal = { ...open, nodes: open.nodes.map((node) => node.id === 'bystander' ? { ...node, slot: 24 } : node) }
  assert.equal(movePhonePart(open, parts, 'f', 12), null)
  const { graph: swapped, other } = movePhonePart(legal, parts, 'f', 14)
  assert.equal(other, 'g')
  assert.deepEqual(placement(swapped, parts).cell, new Map([['f', 14], ['g', 2], ['bystander', 24]]))
  assert.equal(swapped.wires, saved.wires)
})

test('the fixed tray sets the columns even when its most common card width is not on the board', () => {
  const widths = { ...parts, inputs: () => [], valueView: (node) => node.id === 'm' ? 'sensor' : 'value' }
  const phone = { ...widths, availableWidth: 450, traySize: traySize(['box', 'part', 'other'], widths) }
  assert.equal(placement(board, { ...phone, traySize: traySize(['box'], widths) }).cols, 2)
  const three = placement(board, phone)
  assert.equal(three.cols, 3)
  assert.equal(three.span.get('f')[0], 3)
  const region = placement(board, phone, 'f/body')
  assert.equal(region.cols, 3)
  assert.equal(region.span.get('m')[0], 2)
  assert.equal(placement(board, { ...phone, availableWidth: 600 }).cols, 4)
})

test('frames span the saved number of columns and can share rows with a card or another frame', () => {
  const resized = { ...board, nodes: board.nodes.map((n) => n.id === 'f' ? { ...n, span: 1 } : n) }
  const side = placement(resized, parts)
  assert.deepEqual([...side.cell], [['f', 0], ['g', 1]])
  assert.deepEqual(side.span.get('f'), [1, 4])
  assert.deepEqual([...side.frameHeads], [])
  const both = { ...resized, nodes: resized.nodes.map((n) => n.id === 'g' ? { ...n, type: 'box', span: 1 } : n) }
  assert.deepEqual([...placement(both, parts).cell], [['f', 0], ['g', 1]])
})

test('each region of an empty one-column frame uses three rows with the title merged into the first', () => {
  const frame = { id: 'f', type: 'box', span: 1 }
  const graph = { nodes: [frame], wires: [] }
  assert.deepEqual(placement(graph, parts).span.get('f'), [1, 3])
  const branches = { ...parts, frames: () => [{ name: 'left' }, { name: 'right' }] }
  assert.deepEqual(placement(graph, branches).span.get('f'), [1, 6])
})

test('a frame passes its width to its regions, limiting the saved width of nested frames', () => {
  const phone = { ...parts, availableWidth: 450, traySize: traySize(['part'], parts) }
  const nested = { ...board, nodes: board.nodes.map((n) => n.id === 'f' ? { ...n, span: 2 } : n.id === 'm' ? { ...n, type: 'box', span: 3 } : n) }
  assert.equal(placement(nested, phone).span.get('f')[0], 2)
  assert.equal(placement(nested, phone, 'f/body').span.get('m')[0], 2)
  assert.equal(placement(nested, phone, 'm/body').cols, 2)
  const narrow = { ...nested, nodes: nested.nodes.map((n) => n.id === 'f' ? { ...n, span: 1 } : n) }
  assert.equal(placement(narrow, phone, 'm/body').cols, 1)
  const old = { ...board, nodes: board.nodes.map((n) => n.id === 'f' ? { ...n, narrow: true } : n) }
  assert.equal(placement(old, phone).span.get('f')[0], 3)
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

test('a frame cannot be stored or moved inside itself, even through another frame', () => {
  const nested = { ...board, nodes: board.nodes.map((node) => node.id === 'm' ? { ...node, type: 'box' } : node) }
  const put = (region) => ({ ...nested, nodes: nested.nodes.map((node) => node.id === 'f' ? { ...node, in: region } : node) })
  const kind = flowBoard()
  const part = framePart(['a', 'b', 'in'], [{ name: 'body', opens: true }])
  const circuit = primitivesOnly(kind, { box: part, plain: { inputs: ['a', 'b', 'in'] } })
  nested.nodes = nested.nodes.map((node) => ({ ...node, type: node.type ?? 'plain' }))
  assert.ok(kind.fits(nested, {}, circuit))
  for (const region of ['f/body', 'm/body', 'g/body', 'm/body/extra', '']) {
    assert.equal(kind.fits(put(region), {}, circuit), false)
    assert.equal(moveInto(nested, parts, 'f', region, 0, 0), nested)
  }
  assert.deepEqual([...frameTree(put('m/body').nodes).included(['f'])], ['f', 'm'])
  assert.equal(placement(put('m/body'), parts, 'f/body').cell.size, 0)
})

test('a card added over another moves to the nearest clear spot beside it', () => {
  const frame = [0, 0, 400, 500]
  assert.equal(clearSpot([frame], [140, 120], [440, 0]), null)
  const [x, y] = clearSpot([frame], [140, 120], [200, 40])
  assert.ok(x >= 416 || y >= 516)
  assert.equal(clearSpot([], [140, 120], [0, 0]), null)
  const [lx, ly] = clearSpot([frame], [140, 120], [200, 40], 16, -1)
  assert.ok(lx + 140 + 16 <= 0 || ly >= 516)
  assert.ok(lx < 200)
})

test('presets retain both enclosing frames of a locked card or wire end', () => {
  const answer = {
    nodes: [
      { id: 'outer', type: 'box' },
      { id: 'inner', type: 'box', in: 'outer/body' },
      { id: 'x', in: 'inner/body' },
      { id: 'free', type: 'box' },
    ],
    wires: [{ from: 'inner#body', to: 'x', port: 'a' }],
  }
  const preset = presetOf(answer, ['x'])
  assert.deepEqual(preset.nodes.map(({ id }) => id), ['outer', 'inner', 'x'])
  const opening = withPreset({ nodes: [], wires: [] }, preset)
  assert.ok(regionsFit(opening, parts))

  for (const graph of [opening, {
    ...answer,
    wires: answer.wires.map((w) => ({ ...w, locked: true })),
  }]) {
    assert.deepEqual([...lockedCards(graph)].sort(), ['inner', 'outer', 'x'])
    assert.equal(removeNode(graph, parts, 'outer'), graph)
    assert.equal(removeNode(graph, parts, 'inner'), graph)
    assert.equal(removeNode(graph, parts, 'x'), graph)
    assert.equal(moveInto(graph, parts, 'inner', null, 10, 10), graph)
    const repositioned = moveInto(graph, parts, 'inner', 'outer/body', 25, 10)
    assert.equal(repositioned.nodes.find((node) => node.id === 'inner').x, 25)
    const replaced = keepLocked(graph, { nodes: [], wires: [] })
    assert.ok(regionsFit(replaced, parts))
    assert.equal(replaced.wires.length, 1)
  }
  assert.deepEqual(removeNode(answer, parts, 'outer').nodes.map(({ id }) => id), ['free'])
})
