import test from 'node:test'
import assert from 'node:assert/strict'
import { cellError, display, readCell, sameGridShape } from './grid.js'

test('linked readings use the selected cell centre across grid sizes', () => {
  const input = { w: 3, h: 2, data: [0, 1, 2, 3, 4, 5] }
  const output = { w: 2, h: 1, c: 3, data: [1, 2, 3, 4, 5, 6] }
  assert.deepEqual(readCell({ x: 2, y: 1 }, input, output), { x: 1, y: 0, value: [4, 5, 6] })
  assert.deepEqual(readCell({ x: 0, y: 0 }, output, input), { x: 0, y: 1, value: 3 })
})

test('grid errors use the greatest channel difference in each cell', () => {
  const got = { w: 2, h: 1, c: 3, data: new Float32Array([0.375, 0.5, 0.625, 0.5, NaN, Infinity]) }
  const want = { ...got, data: Array(6).fill(0.5) }
  assert.equal(sameGridShape(got, want), true)
  assert.equal(sameGridShape(got, { w: 2, h: 1, data: [0.5, 0.5] }), false)
  assert.equal(cellError(got, want, 0), 0.125)
  assert.equal(cellError(got, want, 1), Infinity)
  assert.equal(display(NaN), 0)
})
