// Tables for attention: patches go back where they came from, the product and row softmax are right, and the
// gradients of an attention head match finite differences.
import test from 'node:test'
import assert from 'node:assert/strict'
import { make } from './image.js'
import { matmul, noise, patches, softmaxRows, unpatch } from './tables.js'
import { RULES } from './grad.js'

const at = (m, x, y) => m.data[y * m.w + x]

test('patches are rows that lay back into the picture', () => {
  const image = make(4, 2, 1, (x, y) => 10 * y + x)
  const table = patches(image, 2)
  assert.deepEqual([table.w, table.h], [4, 2])
  assert.deepEqual(table.data.slice(0, 4), [0, 1, 10, 11])
  assert.deepEqual(unpatch(table, image, 2).data, image.data)
})

test('the product and the row softmax', () => {
  const a = make(2, 2, 1, (x, y) => [[1, 2], [3, 4]][y][x])
  const b = make(1, 2, 1, (_x, y) => [5, 6][y])
  assert.deepEqual(matmul(a, b).data, [17, 39])
  const p = softmaxRows(make(2, 2, 1, (x, y) => [[0, 0], [Math.log(3), 0]][y][x]))
  assert.ok(Math.abs(at(p, 0, 1) - 0.75) < 1e-12 && Math.abs(at(p, 0, 0) - 0.5) < 1e-12)
  const n = noise(make(30, 30, 1, 0), 7)
  const mean = n.data.reduce((x, y) => x + y, 0) / n.data.length
  assert.ok(Math.abs(mean) < 0.15)
  assert.deepEqual(noise(make(3, 3, 1, 0), 7).data, noise(make(3, 3, 1, 0), 7).data)
})

test('an attention head’s gradient to its queries matches finite differences', () => {
  // out = total(softmaxRows(Q·Kᵀ)·V ⊙ W), each step through the tables’ rules.
  const K = make(3, 4, 1, (x, y) => Math.sin(x + 2 * y))
  const Kt = make(4, 3, 1, (x, y) => at(K, y, x))
  const V = make(2, 4, 1, (x, y) => Math.cos(3 * x + y))
  const W = make(2, 2, 1, (x, y) => 0.5 + x - y)
  const f = (Q) => {
    const S = matmul(Q, Kt)
    const P = softmaxRows(S)
    const O = matmul(P, V)
    return { S, P, O, out: O.data.reduce((s, v, k) => s + v * W.data[k], 0) }
  }
  const Q = make(3, 2, 1, (x, y) => 0.3 * x - 0.2 * y + 0.1)
  const { S, P } = f(Q)
  const gO = W
  const [gP] = RULES.grad('matmul', gO, { args: [P, V], out: null })
  const [gS] = RULES.grad('softmaxRows', gP, { args: [S], out: P })
  const [gQ] = RULES.grad('matmul', gS, { args: [Q, Kt], out: S })
  const h = 1e-6
  for (let k = 0; k < Q.data.length; k++) {
    const up = { ...Q, data: Q.data.map((v, j) => (j === k ? v + h : v)) }
    const down = { ...Q, data: Q.data.map((v, j) => (j === k ? v - h : v)) }
    assert.ok(Math.abs(gQ.data[k] - (f(up).out - f(down).out) / (2 * h)) < 1e-6, String(k))
  }
})
