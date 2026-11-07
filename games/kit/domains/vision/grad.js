// The vision resources' derivatives, for training a board by gradients (../../engine/tape.js): for each resource a
// player's model may train through, the gradient reaching each argument from the gradient `g` on its result. Values
// are numbers or images; a gradient has the shape of the value it belongs to (a number spread over an image gathers
// the image's gradient back into one number; a grey image paired with a colour one gathers its channels).
//
//   RULES = { grad(op, g, entry), add(a, b) }     the domain's rules for backward()
//   gradOps   the resources a gradient passes through; any other one on the way stops it (train.js reports which)
import { isImage, make } from './image.js'
import { zip } from './ops.js'
import { TABLE_GRADS } from './tables.js'

const TAU = 2 * Math.PI

const sum = (image) => image.data.reduce((a, b) => a + b, 0)

/** A gradient brought to the shape of the value it is for: summed over what was spread. */
function like(g, x) {
  if (!isImage(g)) return g
  if (!isImage(x)) return sum(g)
  if (x.c === g.c) return g
  return make(x.w, x.h, 1, (px, py) => [0, 1, 2].reduce((a, ch) => a + g.data[(py * g.w + px) * g.c + ch], 0))
}

/** Where (x + dx, y + dy) reads under a boundary rule, or null when it reads nothing (zero outside). */
function index(n, i, mode) {
  if (i >= 0 && i < n) return i
  if (mode === 'zero' || mode === 'error') return null
  if (mode === 'clamp') return Math.min(n - 1, Math.max(0, i))
  if (mode === 'wrap') return ((i % n) + n) % n
  // Reflection repeats the edge sample: −1 reads 0, n reads n − 1.
  const period = 2 * n
  const r = ((i % period) + period) % period
  return r < n ? r : period - 1 - r
}

/**
 * The gradients of a weighted sum of offset reads, out(x, y) = Σ_k w_k · I((x, y) + o_k): to the image (each read's
 * gradient scattered back to where it read) and to each weight (Σ g · the samples it weighed, over every channel).
 */
function offsetReads(image, offsets, weights, g, outside) {
  const { w, h, c } = image
  const gImage = new Array(image.data.length).fill(0)
  const gWeights = offsets.map(() => 0)
  offsets.forEach(([dx, dy], k) => {
    for (let y = 0; y < h; y++) {
      const sy = index(h, y + dy, outside)
      for (let x = 0; x < w; x++) {
        const sx = index(w, x + dx, outside)
        if (sx === null || sy === null) continue
        for (let ch = 0; ch < c; ch++) {
          const gv = g.data[(y * w + x) * c + ch]
          gImage[(sy * w + sx) * c + ch] += weights[k] * gv
          gWeights[k] += gv * image.data[(sy * w + sx) * c + ch]
        }
      }
    }
  })
  return { image: { w, h, c, data: gImage }, weights: gWeights }
}

const elementwise = {
  add: (g, [a, b]) => [like(g, a), like(g, b)],
  sub: (g, [a, b]) => [like(g, a), like(zip([g], (v) => -v), b)],
  mul: (g, [a, b]) => [like(zip([g, b], (p, q) => p * q), a), like(zip([g, a], (p, q) => p * q), b)],
  div: (g, [a, b]) => [like(zip([g, b], (p, q) => p / q), a), like(zip([g, a, b], (p, x, q) => (-p * x) / (q * q)), b)],
  max: (g, [a, b]) => [like(zip([g, a, b], (p, x, y) => (x >= y ? p : 0)), a), like(zip([g, a, b], (p, x, y) => (x >= y ? 0 : p)), b)],
  min: (g, [a, b]) => [like(zip([g, a, b], (p, x, y) => (x <= y ? p : 0)), a), like(zip([g, a, b], (p, x, y) => (x <= y ? 0 : p)), b)],
  abs: (g, [a]) => [zip([g, a], (p, x) => p * Math.sign(x))],
  sqrt: (g, [a], out) => [zip([g, out], (p, r) => (r > 0 ? p / (2 * r) : 0))],
  hypot: (g, [a, b], out) => [like(zip([g, a, out], (p, x, r) => (r > 0 ? (p * x) / r : 0)), a), like(zip([g, b, out], (p, y, r) => (r > 0 ? (p * y) / r : 0)), b)],
  cosTurns: (g, [a]) => [zip([g, a], (p, x) => -p * TAU * Math.sin(TAU * x))],
  exp: (g, _args, out) => [zip([g, out], (p, e) => p * e)],
  log: (g, [a]) => [zip([g, a], (p, x) => p / x)],
  less: () => [null, null],
  select: (g, [c, yes, no]) => [null, like(zip([g, c], (p, k) => (k !== 0 ? p : 0)), yes), like(zip([g, c], (p, k) => (k !== 0 ? 0 : p)), no)],
}

/**
 * Sampling at continuous coordinates (operators.js sampleImage): bilinear spreads each result's gradient over its four
 * neighbours and passes the slope between them to the coordinates; nearest passes none to the coordinates.
 */
function sampleGrad(g, [image, x, y], { method = 'nearest', outside = 'clamp' }) {
  const { w, h, c } = image
  const gImage = new Array(image.data.length).fill(0)
  const cells = isImage(x) ? x.w * x.h : 1
  const gx = new Array(cells).fill(0)
  const gy = new Array(cells).fill(0)
  const coord = (v, k) => (isImage(v) ? v.data[k] : v)
  const at = (px, py) => {
    const ix = index(w, px, outside === 'zero' ? 'zero' : 'clamp')
    const iy = index(h, py, outside === 'zero' ? 'zero' : 'clamp')
    return ix === null || iy === null ? null : iy * w + ix
  }
  const read = (cell, ch) => (cell === null ? 0 : image.data[cell * c + ch])
  for (let k = 0; k < cells; k++) {
    const [sx, sy] = [coord(x, k), coord(y, k)]
    for (let ch = 0; ch < c; ch++) {
      const gv = isImage(g) ? g.data[k * c + ch] : g
      if (method === 'nearest') {
        const cell = at(Math.floor(sx + 0.5), Math.floor(sy + 0.5))
        if (cell !== null) gImage[cell * c + ch] += gv
        continue
      }
      const [x0, y0] = [Math.floor(sx), Math.floor(sy)]
      const [tx, ty] = [sx - x0, sy - y0]
      const n = [at(x0, y0), at(x0 + 1, y0), at(x0, y0 + 1), at(x0 + 1, y0 + 1)]
      const wts = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty]
      n.forEach((cell, j) => { if (cell !== null) gImage[cell * c + ch] += wts[j] * gv })
      const [a, b, d, e] = n.map((cell) => read(cell, ch))
      gx[k] += gv * ((b - a) * (1 - ty) + (e - d) * ty)
      gy[k] += gv * ((d - a) * (1 - tx) + (e - b) * tx)
    }
  }
  const asCoord = (v, data) => (isImage(v) ? { w: v.w, h: v.h, c: 1, data } : data[0])
  return [{ w, h, c, data: gImage }, asCoord(x, gx), asCoord(y, gy)]
}

const RESHAPE = {
  ...TABLE_GRADS,
  sample: (g, args, _out, named) => sampleGrad(g, args, named),
  learnable: () => [],
  total: (g, [image]) => [make(image.w, image.h, image.c, () => g)],
  softmax: (g, [image], out) => {
    const dot = out.data.reduce((a, s, k) => a + s * g.data[k], 0)
    return [{ ...out, data: Array.from(out.data, (s, k) => s * (g.data[k] - dot)) }]
  },
  shift: (g, [image, d], _out, { outside = 'zero' }) => [offsetReads(image, [[d.x, d.y]], [1], g, outside).image, null],
  weightedLine: (g, [image, weights, d], _out, { outside = 'zero' }) => {
    const r = offsetReads(image, [[-d.x, -d.y], [0, 0], [d.x, d.y]], [...weights.data], g, outside)
    return [r.image, make(3, 1, 1, (x) => r.weights[x]), null]
  },
  kernelFilter: (g, [image, kernel], _out, { outside = 'clamp', convention = 'correlation' }) => {
    const s = convention === 'convolution' ? -1 : 1
    const offsets = []
    for (let ky = 0; ky < kernel.h; ky++) for (let kx = 0; kx < kernel.w; kx++) offsets.push([s * (kx - (kernel.w - 1) / 2), s * (ky - (kernel.h - 1) / 2)])
    const r = offsetReads(image, offsets, [...kernel.data], g, outside)
    return [r.image, { w: kernel.w, h: kernel.h, c: 1, data: Array.from(r.weights) }]
  },
  reduceRows: (g, [image], _out, { mode = 'mean' }) => [make(image.w, image.h, image.c, (_x, y, ch) => g.data[y * g.c + ch] / (mode === 'mean' ? image.w : 1))],
  restoreShape: (g, [values]) => [{ ...values, data: Array.from(g.data) }, null],
  transpose: (g) => [make(g.h, g.w, g.c, (x, y, ch) => g.data[(x * g.w + y) * g.c + ch])],
  reverse: (g) => [make(g.w, g.h, g.c, (x, y, ch) => g.data[((g.h - 1 - y) * g.w + (g.w - 1 - x)) * g.c + ch])],
  subsample: (g, [image, step]) => {
    const out = new Array(image.data.length).fill(0)
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) for (let ch = 0; ch < g.c; ch++) out[((y * step) * image.w + x * step) * image.c + ch] += g.data[(y * g.w + x) * g.c + ch]
    return [{ ...image, data: out }, null]
  },
  channel: (g, [image], _out, { c = '0' }) => [make(image.w, image.h, 3, (x, y, ch) => (ch === Number(c) ? g.data[y * image.w + x] : 0))],
  compose: (g) => [0, 1, 2].map((k) => make(g.w, g.h, 1, (x, y) => g.data[(y * g.w + x) * 3 + k])),
  colourMix: (g, [image, ...weights]) => [
    make(image.w, image.h, 3, (x, y, ch) => g.data[y * image.w + x] * weights[ch]),
    ...[0, 1, 2].map((ch) => image.data.reduce((a, v, k) => (k % 3 === ch ? a + v * g.data[Math.floor(k / 3)] : a), 0)),
  ],
}

/** The resources a gradient passes through. */
export const gradOps = new Set([...Object.keys(elementwise), ...Object.keys(RESHAPE)])

export const RULES = {
  grad: (op, g, entry) => (elementwise[op] ?? RESHAPE[op])?.(g, entry.args, entry.out, entry.named ?? {}) ?? null,
  add: (a, b) => zip([a, b], (p, q) => p + q),
}
