// Geometry presets for matching, aligning and detecting, each on tables (a grey image, one row a thing):
//
//   iou(a, b)              boxes as rows [x0, y0, x1, y1] (x1 > x0, y1 > y0): the table of every a-box’s
//                          intersection over union with every b-box (a row per a-box)
//   homography(pairs)      four rows [x, y, x′, y′] (more are fitted by least squares): the 3 × 3 H with H·(x, y, 1)
//                          ∝ (x′, y′, 1), its last cell 1
//   mapX / mapY(H, x, y)   where H sends each (x, y): numbers or coordinate images
//   histogram(angle, weight, bins)  angles in turns, each adding its weight to one of `bins` equal sectors of the
//                          circle (sector 0 starts at angle 0): a row of `bins`
import { PartError } from '../../engine/circuit.js'
import { isImage, make } from './image.js'
import { zip } from './ops.js'
import { T as t } from '../../shell/i18n.js'

const fail = (zh, en) => { throw new PartError(t(zh, en)) }
const rowsOf = (v, n, what) => {
  if (!isImage(v) || v.c !== 1 || v.w !== n) fail(`${what}要一张每行 ${n} 个数的表`, `${what} needs a table of ${n} numbers a row`)
  return Array.from({ length: v.h }, (_, r) => v.data.slice(r * n, (r + 1) * n))
}

export function iou(a, b) {
  const [A, B] = [rowsOf(a, 4, '框'), rowsOf(b, 4, '框')]
  const area = ([x0, y0, x1, y1]) => Math.max(0, x1 - x0) * Math.max(0, y1 - y0)
  return make(B.length, A.length, 1, (j, i) => {
    const [p, q] = [A[i], B[j]]
    const inter = area([Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.min(p[2], q[2]), Math.min(p[3], q[3])])
    const union = area(p) + area(q) - inter
    return union > 0 ? inter / union : 0
  })
}

/** x solving m·x = v by Gaussian elimination with partial pivoting; null when m is singular. */
function solve(m, v) {
  const n = v.length
  const a = m.map((row, i) => [...row, v[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r
    if (Math.abs(a[p][c]) < 1e-12) return null
    ;[a[c], a[p]] = [a[p], a[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = a[r][c] / a[c][c]
      for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]
    }
  }
  return a.map((row, i) => row[n] / row[i])
}

export function homography(pairs) {
  const P = rowsOf(pairs, 4, '点对')
  if (P.length < 4) fail('求单应至少要四对点', 'a homography needs at least four pairs')
  // Two equations a pair in the eight unknowns h11 … h32 (h33 = 1); normal equations when there are more than four.
  const A = []
  const v = []
  for (const [x, y, u, w] of P) {
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); v.push(u)
    A.push([0, 0, 0, x, y, 1, -w * x, -w * y]); v.push(w)
  }
  const At = A[0].map((_, j) => A.map((row) => row[j]))
  const h = solve(At.map((row) => At.map((col) => row.reduce((s, x, k) => s + x * col[k], 0))), At.map((row) => row.reduce((s, x, k) => s + x * v[k], 0)))
  if (!h) fail('这些点对定不下单应（有三点共线或点重合）', 'these pairs fix no homography (three in a line, or points coincide)')
  return make(3, 3, 1, (x, y) => (y === 2 && x === 2 ? 1 : h[y * 3 + x]))
}

const mapped = (H, x, y, axis) => {
  if (!isImage(H) || H.w !== 3 || H.h !== 3) fail('H 要一张 3 × 3 的表', 'H needs a 3 × 3 table')
  const h = H.data
  return zip([x, y], (px, py) => {
    const d = h[6] * px + h[7] * py + h[8]
    return (axis === 'x' ? h[0] * px + h[1] * py + h[2] : h[3] * px + h[4] * py + h[5]) / d
  })
}
export const mapX = (H, x, y) => mapped(H, x, y, 'x')
export const mapY = (H, x, y) => mapped(H, x, y, 'y')

export function histogram(angle, weight, bins) {
  if (!Number.isInteger(bins) || bins < 2) fail(`扇区数应当是不小于 2 的整数，得到 ${bins}`, `the sectors should be a whole number of at least 2, got ${bins}`)
  const out = new Array(bins).fill(0)
  const add = (a, w) => { out[Math.floor((((a % 1) + 1) % 1) * bins) % bins] += w }
  if (isImage(angle)) angle.data.forEach((a, k) => add(a, isImage(weight) ? weight.data[k] : weight))
  else add(angle, weight)
  return { w: bins, h: 1, c: 1, data: out }
}
