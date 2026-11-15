import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFrequency } from './plots/spectrum.js'

const grid = (w, h) => ({ w, h, data: Array.from({ length: w * h }, (_, i) => i) })

test('spectrum maps align signed frequency bins across different image sizes', () => {
  const point = { mode: 'spectrum', source: grid(8, 6), x: 2, y: 4 }
  assert.equal(readFrequency(point, grid(5, 5)), 15)
  assert.equal(readFrequency({ ...point, x: 0 }, grid(5, 5)), undefined)
})

test('row spectra align frequency horizontally and relative row vertically', () => {
  const point = { mode: 'spectrum-rows', source: grid(8, 2), x: 5, y: 1 }
  assert.equal(readFrequency(point, grid(5, 1)), 3)
  assert.equal(readFrequency({ ...point, source: grid(8, 1), y: 0 }, grid(5, 2)), 8)
})
