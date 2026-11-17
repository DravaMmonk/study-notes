import test from 'node:test'
import assert from 'node:assert/strict'
import { imageKit } from './engine/kit.js'
import { NODE_TYPES } from './engine/nodes.js'
import { read } from '../../../../packages/circuit/core/index.js'
import { startBoard } from './engine/board.js'

test('reset restores learnable parameters without changing wiring or other settings', () => {
  const kit = imageKit(NODE_TYPES)
  const graph = { nodes: [
    { id: 'kernel', type: 'image:lrnConv', params: { w: Array(9).fill(2), extra: 7 }, slot: 4 },
    { id: 'fixed', type: 'image:lrnDense', fixed: ['p'], params: { p: [3, 4] } },
    { id: 'arithmetic', type: 'image:arith', params: { op: 'mul', constantSide: 'b', constant: 3 } },
  ], wires: [{ from: 'kernel', to: 'arithmetic', port: 'a' }] }
  const reset = kit.resetTraining(graph)
  assert.deepEqual(reset.nodes[0].params.w, kit.defaultParams("image:lrnConv").w)
  assert.equal(reset.nodes[0].params.extra, 7)
  assert.equal(reset.nodes[0].slot, 4)
  assert.deepEqual(reset.nodes[1], graph.nodes[1])
  assert.deepEqual(reset.nodes[2], graph.nodes[2])
  assert.deepEqual(reset.wires, graph.wires)
  assert.deepEqual(graph.nodes[0].params.w, Array(9).fill(2))
})

test('blueprint import initializes learnable parameters when settings are omitted', () => {
  const kit = imageKit(NODE_TYPES)
  const { graph, errors } = read('w = image:lrnConst()\nout <- w', startBoard({}), kit.boardParts(), ['image:lrnConst'])
  assert.equal(errors, undefined)
  assert.deepEqual(graph.nodes.find(n => n.id === 'w').params.p, [1])
})
