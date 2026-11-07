// Geometry presets against hand-worked cases: IoU, a homography from four pairs and its map, a histogram.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fromRows } from './image.js'
import { histogram, homography, iou, mapX, mapY } from './geometry.js'

test('intersection over union of boxes', () => {
  const m = iou(fromRows([[0, 0, 2, 2], [10, 10, 11, 11]]), fromRows([[1, 0, 3, 2], [0, 0, 2, 2]]))
  assert.deepEqual([m.w, m.h], [2, 2])
  assert.ok(Math.abs(m.data[0] - 1 / 3) < 1e-12)
  assert.equal(m.data[1], 1)
  assert.equal(m.data[2], 0)
})

test('a homography from four pairs sends each point where it was paired, and others consistently', () => {
  const H0 = [[1.2, 0.1, 3], [-0.2, 0.9, 1], [0.001, 0.002, 1]]
  const send = (x, y) => { const d = H0[2][0] * x + H0[2][1] * y + 1; return [(H0[0][0] * x + H0[0][1] * y + H0[0][2]) / d, (H0[1][0] * x + H0[1][1] * y + H0[1][2]) / d] }
  const pts = [[0, 0], [10, 0], [10, 8], [0, 8]]
  const H = homography(fromRows(pts.map(([x, y]) => [x, y, ...send(x, y)])))
  const [u, v] = send(4, 5)
  assert.ok(Math.abs(mapX(H, 4, 5) - u) < 1e-9 && Math.abs(mapY(H, 4, 5) - v) < 1e-9)
  assert.throws(() => homography(fromRows([[0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3]])))
})

test('a histogram of angles in turns, weighted', () => {
  const h = histogram(fromRows([[0.05, 0.3, -0.2, 0.55]]), fromRows([[1, 2, 3, 4]]), 4)
  assert.deepEqual(h.data, [1, 2, 4, 3])
})
