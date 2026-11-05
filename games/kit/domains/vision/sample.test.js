import { test } from 'node:test'
import assert from 'node:assert/strict'
import { paint, readSample } from './sample.js'
import { pixel } from './image.js'

test('a sample picture is painted layer by layer, the same seed giving the same noise', () => {
  const spec = { size: [8, 6], base: 0.1, layers: [{ shape: 'rect', x: 0, y: 0, w: 4, h: 6, v: 0.5 }, { shape: 'disc', cx: 6, cy: 3, r: 1, v: 0.9 }, { shape: 'stripes', period: 2, lo: 0, hi: 1, x: 0, y: 4, w: 2, h: 2 }] }
  const img = paint(spec)
  assert.deepEqual([img.w, img.h, img.c], [8, 6, 1])
  assert.equal(pixel(img, 1, 1), 0.5)
  assert.equal(pixel(img, 7, 0), 0.1)
  assert.equal(pixel(img, 5, 2), 0.9)
  assert.deepEqual([pixel(img, 0, 4), pixel(img, 1, 4)], [0, 1])
  const noisy = { ...spec, noise: { seed: 3, amp: 0.05 } }
  assert.deepEqual(paint(noisy).data, paint(noisy).data)
  assert.ok(paint(noisy).data.every((v, k) => Math.abs(v - img.data[k]) <= 0.05))
})

test('a sample keeps the first test’s other inputs and paints its own', () => {
  const task = { tests: [{ inputs: { image: [[0, 1]], amount: 2, d: { x: 1, y: 0 } } }] }
  const { inputs } = readSample(task, { inputs: { image: { size: [4, 4], base: 0.3 } } })
  assert.deepEqual([inputs.image.w, inputs.image.h, pixel(inputs.image, 3, 3)], [4, 4, 0.3])
  assert.equal(inputs.amount, 2)
  assert.deepEqual(inputs.d, { x: 1, y: 0 })
})
