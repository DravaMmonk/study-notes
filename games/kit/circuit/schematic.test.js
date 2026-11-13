import test from 'node:test'
import assert from 'node:assert/strict'
import { schematic } from './schematic.js'

const parts = {
  role: (n) => n.role ?? 'part',
  frames: (n) => (n.type === 'frame' ? [{ name: 'body', opens: true }] : []),
}
const ids = (rows) => rows.map((row) => row.map((item) => item.id ?? 'via'))

test('every part sits below what it reads, between the sources and the sinks', () => {
  const graph = {
    nodes: [{ id: 'out', role: 'sink' }, { id: 'b' }, { id: 'a' }, { id: 'in', role: 'source' }],
    wires: [{ from: 'in', to: 'a', port: 'x' }, { from: 'a', to: 'b', port: 'x' }, { from: 'b', to: 'out', port: 'x' }],
  }
  const made = schematic(graph, parts)
  assert.deepEqual(ids(made.rows()), [['in'], ['a'], ['b'], ['out']])
  assert.ok(made.paths.every((p) => !p.vias.length && !p.back))
})

test('a wire past a row takes a via there, shared by the wires of one output', () => {
  const graph = {
    nodes: [{ id: 'in', role: 'source' }, { id: 'a' }, { id: 'b' }, { id: 'c' }],
    wires: [{ from: 'in', to: 'a', port: 'x' }, { from: 'a', to: 'b', port: 'x' }, { from: 'in', to: 'b', port: 'y' }, { from: 'b', to: 'c', port: 'x' }, { from: 'in', to: 'c', port: 'y' }],
  }
  const made = schematic(graph, parts)
  assert.deepEqual(ids(made.rows()).map((row) => row.sort()), [['in'], ['a', 'via'], ['b', 'via'], ['c']])
  assert.deepEqual(made.paths.map((p) => p.vias.length), [0, 0, 1, 0, 2])
  assert.equal(made.paths[2].vias[0], made.paths[4].vias[0])
})

test('a part that reads nothing sits just above its first reader', () => {
  const graph = {
    nodes: [{ id: 'k' }, { id: 'a' }, { id: 'b' }, { id: 'c' }],
    wires: [{ from: 'a', to: 'b', port: 'x' }, { from: 'b', to: 'c', port: 'x' }, { from: 'k', to: 'c', port: 'y' }],
  }
  assert.deepEqual(ids(schematic(graph, parts).rows()).map((row) => row.sort()), [['a'], ['b', 'k'], ['c']])
})

test('a loop is laid out, its closing wire marked as running back', () => {
  const graph = {
    nodes: [{ id: 'a' }, { id: 'b' }],
    wires: [{ from: 'a', to: 'b', port: 'x' }, { from: 'b', to: 'a', port: 'x' }],
  }
  const made = schematic(graph, parts)
  assert.deepEqual(ids(made.rows()), [['a'], ['b']])
  assert.deepEqual(made.paths.map((p) => p.back), [false, true])
})

test('a region is a board of its own; a wire into it passes the rows above its reader', () => {
  const graph = {
    nodes: [{ id: 'in', role: 'source' }, { id: 'f', type: 'frame' }, { id: 'p', in: 'f/body' }, { id: 'q', in: 'f/body' }],
    wires: [{ from: 'f#body', to: 'p', port: 'x' }, { from: 'p', to: 'q', port: 'x' }, { from: 'in', to: 'q', port: 'y' }, { from: 'q', to: 'f', port: 'body' }],
  }
  const made = schematic(graph, parts)
  assert.deepEqual(ids(made.rows()), [['in'], ['f']])
  assert.deepEqual(ids(made.rows('f/body')).map((row) => row.sort()), [['p', 'via'], ['q']])
  assert.deepEqual(made.paths.map((p) => p.vias.length), [0, 0, 1, 0])
})
