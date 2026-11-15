import test from 'node:test'
import assert from 'node:assert/strict'
import { readCell } from './grid.js'

test('linked readings use the selected cell centre across grid sizes', () => {
  const input = { w: 3, h: 2, data: [0, 1, 2, 3, 4, 5] }
  const output = { w: 2, h: 1, c: 3, data: [1, 2, 3, 4, 5, 6] }
  assert.deepEqual(readCell({ x: 2, y: 1 }, input, output), { x: 1, y: 0, value: [4, 5, 6] })
  assert.deepEqual(readCell({ x: 0, y: 0 }, output, input), { x: 0, y: 1, value: 3 })
})
