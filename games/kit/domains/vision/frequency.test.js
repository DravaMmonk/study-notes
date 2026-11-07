// Frequency presets against independent expectations: a stripe's spectrum peaks, identity and notch filtering,
// frequency coordinates and subsampling.
import test from 'node:test'
import assert from 'node:assert/strict'
import { frequencyAxis, frequencyFilter, spectrum, subsample } from './frequency.js'
import { make } from './image.js'
import { OPS } from './ops.js'

const stripes = (w, h, k, amp = 0.4, phase = 0) => make(w, h, 1, (x) => 0.5 + amp * Math.cos(2 * Math.PI * (k * x / w + phase)))
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`)
const at = (img, x, y) => img.data[y * img.w + x]

test('a stripe of k cycles shows the mean in the centre and amplitude/2 at ±k, whatever its phase', () => {
  for (const phase of [0, 0.13, 0.5]) {
    const s = spectrum(stripes(8, 6, 2, 0.4, phase))
    near(at(s, 4, 3), 0.5)
    near(at(s, 6, 3), 0.2)
    near(at(s, 2, 3), 0.2)
    const rest = [...s.data].filter((_, i) => ![3 * 8 + 4, 3 * 8 + 6, 3 * 8 + 2].includes(i))
    assert.ok(rest.every((v) => v < 1e-9))
  }
})

test('a gain of one everywhere gives the image back; zeroing the stripe’s bins leaves the mean', () => {
  const image = stripes(8, 6, 2)
  const ones = make(8, 6, 1, 1)
  frequencyFilter(image, ones).data.forEach((v, i) => near(v, image.data[i]))
  const notch = make(8, 6, 1, (x, y) => (y === 3 && (x === 2 || x === 6) ? 0 : 1))
  frequencyFilter(image, notch).data.forEach((v) => near(v, 0.5))
})

test('frequency coordinates match the spectrum layout, and a low-pass made from them keeps the mean only', () => {
  const image = stripes(7, 5, 3)
  const fx = frequencyAxis(image, 'x')
  const fy = frequencyAxis(image, 'y')
  near(at(fx, 3, 0), 0)
  near(at(fx, 6, 0), 3)
  near(at(fy, 0, 2), 0)
  near(at(fy, 0, 0), -2)
  const low = make(7, 5, 1, (x, y) => (Math.hypot(at(fx, x, y), at(fy, x, y)) < 1 ? 1 : 0))
  frequencyFilter(image, low).data.forEach((v) => near(v, 0.5))
})

test('subsampling keeps every step-th cell from the corner and the channels', () => {
  const image = make(5, 3, 3, (x, y, c) => 100 * c + 10 * y + x)
  const half = subsample(image, 2)
  assert.deepEqual([half.w, half.h, half.c], [3, 2, 3])
  assert.equal(half.data[((1 * 3) + 2) * 3 + 1], 100 + 20 + 4)
})

test('angleTurns gives the direction of (x, y) in turns', () => {
  near(OPS.angleTurns.run([1, 0]), 0.25)
  near(OPS.angleTurns.run([0, -1]), 0.5)
  near(OPS.angleTurns.run([-1, 0]), -0.25)
})
