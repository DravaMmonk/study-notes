import { test } from 'node:test'
import assert from 'node:assert/strict'
import { flowBoard } from './board-cards.js'
import { boardView } from './board-view.js'
import { fresh } from '../shell/progress.js'

test('a circuit view opens on the previous task’s valid passing work with the new task’s terminals', () => {
  const board = flowBoard()
  const task = (index, inputs) => ({ id: 'stages', taskId: `stage-${index}`, task: index, kind: 'circuit', inputs, outputs: [{ name: 'out' }] })
  const first = task(0, [{ name: 'in' }, { name: 'old' }])
  const next = { ...task(1, [{ name: 'in' }, { name: 'new' }]), carries: true }
  const view = boardView({ board, parts: () => ({ relay: { inputs: ['in', 'aux'] } }), tasksAt: () => [first, next] }).forTask(next)
  const prior = {
    nodes: [...board.startBoard(first).nodes, { id: 'r', type: 'relay' }],
    wires: [{ from: 'in', to: 'r', port: 'in' }, { from: 'old', to: 'r', port: 'aux' }, { from: 'r', to: 'out', port: 'in' }],
  }
  const progress = { ...fresh(), passed: [first.taskId], built: { [first.taskId]: prior } }
  const opened = view.opening(next, progress)
  assert.deepEqual(opened.nodes.map(({ id }) => id), ['in', 'new', 'out', 'r'])
  assert.deepEqual(opened.wires, [prior.wires[0], prior.wires[2]])
  assert.notEqual(opened.nodes.at(-1), prior.nodes.at(-1))
  const invalid = { ...progress, built: { [first.taskId]: { ...prior, wires: [...prior.wires, prior.wires[0]] } } }
  assert.deepEqual(view.opening(next, invalid), board.startBoard(next))
})
