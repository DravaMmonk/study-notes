import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sampleAt, throughSamples } from '../core/engine/waves.js'

test('sampling interpolation preserves phase on odd and even grids', () => {
  const signal = (u) => 0.5 + 0.2 * Math.sin(4 * Math.PI * u) + 0.3 * Math.cos(8 * Math.PI * u)
  const expected = sampleAt(signal, 64)
  for (const count of [8, 9]) {
    const interpolation = throughSamples(sampleAt(signal, count))
    const got = sampleAt(interpolation, expected.length)
    assert.ok(got.every((value, i) => Math.abs(value - expected[i]) < 1e-12), `${count} samples`)
  }
})
