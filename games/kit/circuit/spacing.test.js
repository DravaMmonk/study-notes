import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spaceNodes } from './spacing.js'

const card = (id, x, y, extra = {}) => ({ id, x, y, type: 'out', params: { name: id }, ...extra })

test('image outputs with fixed preset row spacing are separated using actual heights', () => {
  const graph = { nodes: [card('smooth', 900, 40), card('enhanced', 900, 180), card('change', 900, 320)], wires: [{ from: 'smooth', to: 'enhanced', port: 'in' }] }
  const sizes = { smooth: [140, 280], enhanced: [140, 160], change: [140, 160] }
  const spaced = spaceNodes(graph, sizes)
  assert.deepEqual(spaced.nodes.map(n => n.y), [40, 344, 528])
  assert.equal(spaced.wires, graph.wires)
  assert.deepEqual(spaced.nodes.map(n => n.params), graph.nodes.map(n => n.params))
  assert.equal(graph.nodes[1].y, 180)
  assert.equal(spaceNodes(spaced, sizes), spaced)
})

test('a preview growing after a run moves only cards in its way', () => {
  const graph = { nodes: [card('image', 20, 40), card('below', 20, 200), card('beside', 240, 40)], wires: [] }
  assert.equal(spaceNodes(graph, { image: [140, 100], below: [140, 100], beside: [184, 300] }), graph)
  const grown = spaceNodes(graph, { image: [140, 260], below: [140, 100], beside: [184, 300] })
  assert.equal(grown.nodes[1].y, 324)
  assert.equal(grown.nodes[2], graph.nodes[2])
  assert.equal(grown.nodes[0], graph.nodes[0])
})

test('staggered overlaps are resolved without crossing scope boundaries', () => {
  const graph = { nodes: [card('a', 20, 0), card('b', 100, 80), card('c', 220, 160), card('child', 20, 0, { in: 'box/body' }), card('hidden', 20, 0)], wires: [] }
  const sizes = { a: [180, 200], b: [180, 140], c: [180, 100], child: [180, 300] }
  const spaced = spaceNodes(graph, sizes)
  assert.equal(spaced.nodes[1].y, 224)
  assert.equal(spaced.nodes[2].y, 388)
  assert.equal(spaced.nodes[3], graph.nodes[3])
  assert.equal(spaced.nodes[4], graph.nodes[4])
})


test('neighbouring preset columns keep their existing narrow wiring gap', () => {
  const graph = { nodes: [card('left', 240, 40), card('right', 440, 40)], wires: [] }
  assert.equal(spaceNodes(graph, { left: [184, 280], right: [184, 280] }), graph)
})
