import assert from 'node:assert/strict'
import { test } from 'node:test'
import { completedRun, keepRunMark, playbackMark, runKey } from './run-marks.js'

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
