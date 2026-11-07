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

test('banding noise moves a whole row (or column) by one amount; a quad and text paint where they lie', () => {
  const rows = paint({ size: [6, 4], base: 0.5, noise: { seed: 2, amp: 0.1, kind: 'rows' } })
  for (let y = 0; y < 4; y++) assert.ok(Array.from({ length: 6 }, (_, x) => pixel(rows, x, y)).every((v, _, all) => v === all[0]))
  assert.ok(new Set(Array.from({ length: 4 }, (_, y) => pixel(rows, 0, y))).size > 1)
  const columns = paint({ size: [4, 3], base: 0.5, noise: { seed: 2, amp: 0.1, kind: 'columns' } })
  for (let x = 0; x < 4; x++) assert.equal(pixel(columns, x, 0), pixel(columns, x, 2))
  const paper = paint({ size: [10, 10], base: 0, layers: [{ shape: 'quad', corners: [[2, 1], [9, 3], [7, 9], [1, 7]], v: 1 }] })
  assert.equal(pixel(paper, 5, 5), 1)
  assert.equal(pixel(paper, 0, 0), 0)
  assert.equal(pixel(paper, 9, 9), 0)
  const text = paint({ size: [12, 6], base: 1, layers: [{ shape: 'text', v: 0, gap: 3, seed: 4 }] })
  assert.ok([1, 4].every((y) => Array.from({ length: 12 }, (_, x) => pixel(text, x, y)).some((v) => v === 0)))
  assert.ok([0, 2, 3, 5].every((y) => Array.from({ length: 12 }, (_, x) => pixel(text, x, y)).every((v) => v === 1)))
})

test('a relief paints unit surface normals: straight up on the flat, tilted outwards on a bump and inwards in a dent', () => {
  const bump = paint({ size: [9, 9], relief: [{ cx: 4.5, cy: 4.5, r: 4, height: 2 }] })
  assert.equal(bump.c, 3)
  const n = (img, x, y) => [0, 1, 2].map((c) => img.data[(y * img.w + x) * 3 + c])
  assert.deepEqual(n(bump, 0, 0), [0, 0, 1])
  assert.deepEqual(n(bump, 4, 4).map((v) => Math.round(v * 1e9) / 1e9), [0, 0, 1])
  const [rx, , rz] = n(bump, 6, 4)
  assert.ok(rx > 0.3 && rz < 1)
  assert.ok(Math.abs(Math.hypot(...n(bump, 6, 4)) - 1) < 1e-12)
  const dent = paint({ size: [9, 9], relief: [{ cx: 4.5, cy: 4.5, r: 4, height: -2 }] })
  assert.ok(n(dent, 6, 4)[0] < -0.3)
})
