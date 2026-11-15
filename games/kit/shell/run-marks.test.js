import assert from 'node:assert/strict'
import { test } from 'node:test'
import { keepRunMark, runKey } from './run-marks.js'

test('clearing one slot preserves another task with the same slot number', () => {
  const shifted = runKey('shift', 2)
  const averaged = runKey('average', 2)
  const runs = keepRunMark(keepRunMark({}, shifted, 4), averaged, 8)
  const afterDrop = keepRunMark(runs, shifted, null)
  assert.deepEqual(afterDrop, { [averaged]: 8 })
  assert.equal(keepRunMark(afterDrop, shifted, null), afterDrop)
  assert.equal(keepRunMark(afterDrop, averaged, 8), afterDrop)
})
