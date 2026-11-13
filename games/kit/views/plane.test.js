// node --test (npm test) — arrows in the plane as geometry (plots/plane.js) and the readings content may name.
import test from 'node:test'
import assert from 'node:assert/strict'
import { columns, extentOf, frameOf, tips } from './plots/plane.js'
import { usable } from '../engine/views.js'

const grid = (w, data) => ({ w, h: 2, c: 1, data })
const READINGS = ['carried', 'chain', 'plane']

test('a frame reaches the columns and their running sums, and never closer than two units', () => {
  const pair = grid(2, [3, 1, 0, 4])
  assert.deepEqual(columns(pair), [[3, 0], [1, 4]])
  assert.deepEqual(tips(columns(pair)), [[3, 0], [4, 4]])
  assert.equal(extentOf([pair]), 4)
  assert.deepEqual(frameOf(0), { reach: 2, step: 1 })
  assert.deepEqual(frameOf(extentOf([pair])), { reach: 5, step: 1 })
  assert.equal(frameOf(40).reach % frameOf(40).step, 0)
})

test('values drawn together share the frame of the one that reaches furthest', () => {
  const [short, long] = [grid(1, [1, 1]), grid(1, [6, 4])]
  assert.deepEqual(frameOf(Math.max(extentOf([short]), extentOf([short, long]))), frameOf(extentOf([long])))
})

test('the reading is the one content lists, among those that draw the value', () => {
  assert.deepEqual(usable(READINGS, grid(1, [2, 1])), ['plane'])
  assert.deepEqual(usable(READINGS, grid(2, [1, 0, 0, 1])), READINGS)
  assert.deepEqual(usable(READINGS, grid(3, [1, 0, 2, 0, 1, 2])), ['chain', 'plane'])
  assert.deepEqual(usable(READINGS, { w: 1, h: 3, c: 1, data: [1, 2, 3] }), [])
})
