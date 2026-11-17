import assert from 'node:assert/strict'
import { test } from 'node:test'
import { workSignature } from '../../../packages/circuit/core/index.js'
import { completedRun, keepRunMark, markForWork, playbackMark, runKey } from './run-marks.js'

test('clearing one slot preserves another task with the same slot number', () => {
  const shifted = runKey('shift', 2)
  const averaged = runKey('average', 2)
  const runs = keepRunMark(keepRunMark({}, shifted, { moves: 4 }), averaged, completedRun)
  const afterDrop = keepRunMark(runs, shifted, null)
  assert.deepEqual(afterDrop, { [averaged]: completedRun })
  assert.equal(keepRunMark(afterDrop, shifted, null), afterDrop)
  assert.equal(keepRunMark(afterDrop, averaged, { finished: true }), afterDrop)
})

test('a completed run and a pause before the first step keep distinct marks', () => {
  assert.equal(playbackMark(null), null)
  assert.equal(playbackMark({ playing: true, n: 3 }), null)
  assert.deepEqual(playbackMark({ playing: false, n: 0 }), { moves: 0 })
  assert.equal(playbackMark({ over: true, playing: false, n: 4 }), completedRun)
})

test('a run mark follows the judged wiring and settings across changes to board presentation', () => {
  const input = { id: 'in', type: 'input', x: 0, params: { value: 2, enabled: true } }
  const out = { id: 'out', type: 'output' }
  const wire = { from: 'in', to: 'out', port: 'in' }
  const board = { nodes: [input, out], wires: [wire] }
  const mark = { workKey: workSignature(board), mark: completedRun }
  const laidOut = { ...board, nodes: [{ ...input, x: 120, slot: 3, params: { enabled: true, value: 2 } }, out], blocks: [{ nodes: ['in'] }] }
  assert.equal(markForWork(mark, workSignature(laidOut)), completedRun)
  assert.equal(markForWork(mark, workSignature({ ...board, wires: [] })), undefined)
  const edited = { ...board, nodes: [{ ...input, params: { ...input.params, value: 3 } }, out] }
  assert.equal(markForWork(mark, workSignature(edited)), undefined)
})
