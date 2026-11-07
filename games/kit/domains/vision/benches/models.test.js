// The waves and lambert bench models against hand-worked values.
import test from 'node:test'
import assert from 'node:assert/strict'
import { seenCycles, wavesView } from './waves.js'
import { lambertView } from './lambert.js'

test('a wave matching its target has no error; a phase half a turn off has the largest', () => {
  const setup = { mode: 'wave', n: 32, target: { k: 3, amp: 0.3, phase: 0.25 } }
  assert.ok(wavesView(setup, { k: 3, amp: 0.3, phase: 0.25 }).error < 1e-12)
  const off = wavesView(setup, { k: 3, amp: 0.3, phase: 0.75 }).error
  assert.ok(Math.abs(off - 0.3 * Math.sqrt(2)) < 1e-9)
})

test('more odd sines get closer to the step, but the ripple beside the edge stays', () => {
  const setup = { mode: 'step', n: 64, harmonics: [1, 3, 5, 7] }
  const series = (j) => (4 * 0.4) / (Math.PI * j)
  const one = wavesView(setup, { a1: series(1) })
  const four = wavesView(setup, { a1: series(1), a3: series(3), a5: series(5), a7: series(7) })
  assert.ok(four.error < one.error)
  assert.ok(four.overshoot > 0.02)
})

test('fewer than two samples a cycle shows a slower stripe than the real one', () => {
  assert.equal(seenCycles(5, 16), 5)
  assert.equal(seenCycles(12, 16), 4)
  const setup = { mode: 'sampling', n: 64 }
  assert.equal(wavesView(setup, { k: 8, step: 2 }).aliased, 0)
  const fast = wavesView(setup, { k: 20, step: 2 })
  assert.equal(fast.aliased, 1)
  assert.equal(fast.seen, 12)
  assert.ok(fast.perCycle < 2)
})

test('a darker but tilted-to-the-light patch and a whiter one turned away give the same photograph', () => {
  const setup = { patches: [{ id: 'left' }, { id: 'right' }] }
  const seen = lambertView(setup, { intensity: 1, light: 0, albedo_left: 0.8, tilt_left: 0, albedo_right: 0.4, tilt_right: 0 })
  assert.equal(seen.brighter, 'left')
  const other = lambertView(setup, { intensity: 1, light: 0, albedo_left: 0.4, tilt_left: 0, albedo_right: 0.8, tilt_right: 60 })
  assert.ok(Math.abs(other.brightness_left - 0.4) < 1e-12)
  assert.ok(Math.abs(other.brightness_right - 0.4) < 1e-12)
  assert.equal(other.whiter, 'right')
  assert.equal(lambertView(setup, { light: 0, tilt_left: 120 }).brightness_left, 0)
})
