import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stagesOf } from './stages.js'

const n = (id, type = 'part', params = {}) => ({ id, type, params })
const w = (from, to, port = 'in') => ({ from, to, port })
const task = { inputs: [{ name: 'input' }], outputs: [{ name: 'output' }] }
const chain = [
  { id: 'read', label: 'Read', board: { nodes: [n('input', 'in'), n('a')] } },
  { id: 'weight', label: 'Weight', board: { nodes: [n('a'), n('b')] } },
  { id: 'reduce', label: 'Reduce', board: { nodes: [n('a'), n('b'), n('c')] } },
]

test('a three-upgrade history keeps first ownership, new parts loose and boundary wires exact', () => {
  const board = { nodes: [n('input', 'in'), n('a', 'part', { mode: 'changed' }), n('b'), n('c'), n('new'), n('output', 'out')], wires: [w('input', 'a'), w('a#value', 'b'), w('b', 'c'), w('c', 'new'), w('new', 'output')] }
  const got = stagesOf({ task, board, chain })
  assert.deepEqual(got.stages.map((s) => s.nodes), [['a'], ['b'], ['c']])
  assert.deepEqual(got.loose, ['new'])
  assert.deepEqual(got.stages[1].ins, [board.wires[1]])
  assert.deepEqual(got.stages[1].outs, [board.wires[2]])
  assert.deepEqual(got.stages[0].ins, [board.wires[0]])
  assert.deepEqual(board.nodes[1].params, { mode: 'changed' })
})

test('deleted stages disappear and replacement ids are current work', () => {
  const got = stagesOf({ task, board: { nodes: [n('replacement'), n('c')], wires: [] }, chain })
  assert.deepEqual(got.stages.map((s) => s.id), ['reduce'])
  assert.deepEqual(got.loose, ['replacement'])
})

test('a task without provenance has only loose parts, with domain terminals excluded', () => {
  assert.deepEqual(stagesOf({ task, board: { nodes: [n('input', 'sensor'), n('x'), n('output', 'actuator')], wires: [] } }), { stages: [], loose: ['x'] })
})
