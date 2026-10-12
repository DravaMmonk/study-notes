// Small floating-point greyscale images and the test-image library every level draws from.
// Values are nominally 0 (black) … 1 (white); edge and difference images may go negative.

export const SIZE = 16

export function image(w = SIZE, h = SIZE, fill = 0) {
  return { w, h, data: new Float32Array(w * h).fill(fill) }
}

export const at = (img, x, y) => img.data[y * img.w + x]

export function map(img, fn) {
  const out = image(img.w, img.h)
  for (let i = 0; i < img.data.length; i++) out.data[i] = fn(img.data[i], i % img.w, Math.floor(i / img.w))
  return out
}

export function zip(a, b, fn) {
  const out = image(a.w, a.h)
  for (let i = 0; i < a.data.length; i++) out.data[i] = fn(a.data[i], b.data[i])
  return out
}

export function fromFn(w, h, fn) {
  const out = image(w, h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.data[y * w + x] = fn(x, y)
  return out
}

// Shift content by (dx, dy): out(x, y) = in(x − dx, y − dy). Outside is 0, or the nearest edge pixel.
export function shift(img, dx, dy, border = 'zero') {
  return fromFn(img.w, img.h, (x, y) => {
    let sx = x - dx
    let sy = y - dy
    if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) {
      if (border !== 'edge') return 0
      sx = Math.min(img.w - 1, Math.max(0, sx))
      sy = Math.min(img.h - 1, Math.max(0, sy))
    }
    return img.data[sy * img.w + sx]
  })
}

// Correlation with a (2r+1)² kernel given row-major, matching how the 3×3 node reads its knobs.
export function correlate(img, kernel, border = 'zero') {
  const r = Math.round((Math.sqrt(kernel.length) - 1) / 2)
  const n = 2 * r + 1
  let out = image(img.w, img.h)
  for (let v = -r; v <= r; v++) {
    for (let u = -r; u <= r; u++) {
      const weight = kernel[(v + r) * n + (u + r)]
      if (!weight) continue
      const moved = shift(img, -u, -v, border)
      out = zip(out, moved, (a, b) => a + weight * b)
    }
  }
  return out
}

export const flipKernel = (kernel) => [...kernel].reverse()

export function gaussianKernel(sigma, radius = Math.ceil(sigma * 2.5)) {
  const k = []
  let sum = 0
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const v = Math.exp(-(x * x + y * y) / (2 * sigma * sigma))
      k.push(v)
      sum += v
    }
  }
  return k.map((v) => v / sum)
}

export function downsample(img, factor = 2) {
  return fromFn(Math.floor(img.w / factor), Math.floor(img.h / factor), (x, y) => img.data[y * factor * img.w + x * factor])
}

export function maxPool(img, size = 2) {
  return fromFn(Math.floor(img.w / size), Math.floor(img.h / size), (x, y) => {
    let best = -Infinity
    for (let v = 0; v < size; v++) for (let u = 0; u < size; u++) best = Math.max(best, img.data[(y * size + v) * img.w + x * size + u])
    return best
  })
}

// ---------- comparison ----------

export function compare(actual, expected, { tolerance = 0.02, mismatches = 0 } = {}) {
  if (!actual || actual.w !== expected.w || actual.h !== expected.h) {
    return { pass: false, reason: actual ? `尺寸应为 ${expected.w}×${expected.h}，实际 ${actual.w}×${actual.h}` : '输出未连接', worst: Infinity, wrong: Infinity }
  }
  let wrong = 0
  let worst = 0
  for (let i = 0; i < actual.data.length; i++) {
    const error = Math.abs(actual.data[i] - expected.data[i])
    worst = Math.max(worst, Number.isFinite(error) ? error : Infinity)
    if (!(error <= tolerance)) wrong += 1
  }
  return { pass: wrong <= mismatches, wrong, worst, reason: wrong <= mismatches ? '' : `${wrong} 个像素超出容差` }
}

// ---------- the test-image library ----------

export function random(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const patterns = {
  blank: (v = 0) => image(SIZE, SIZE, v),
  impulse: (x = 7, y = 7, v = 1) => fromFn(SIZE, SIZE, (px, py) => (px === x && py === y ? v : 0)),
  stepX: (edge = 8, lo = 0.15, hi = 0.85) => fromFn(SIZE, SIZE, (x) => (x < edge ? lo : hi)),
  stepY: (edge = 8, lo = 0.15, hi = 0.85) => fromFn(SIZE, SIZE, (x, y) => (y < edge ? lo : hi)),
  rampX: () => fromFn(SIZE, SIZE, (x) => x / (SIZE - 1)),
  square: (x0 = 4, y0 = 4, s = 8, lo = 0.1, hi = 0.9) => fromFn(SIZE, SIZE, (x, y) => (x >= x0 && x < x0 + s && y >= y0 && y < y0 + s ? hi : lo)),
  disk: (cx = 7.5, cy = 7.5, r = 5, lo = 0.1, hi = 0.9) => fromFn(SIZE, SIZE, (x, y) => ((x - cx) ** 2 + (y - cy) ** 2 <= r * r ? hi : lo)),
  checker: (cell = 4, lo = 0.1, hi = 0.9) => fromFn(SIZE, SIZE, (x, y) => ((Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? hi : lo)),
  stripes: (period = 4, lo = 0.1, hi = 0.9, w = SIZE, h = SIZE) => fromFn(w, h, (x) => (Math.floor((x * 2) / period) % 2 ? hi : lo)),
  corner: (x0 = 6, y0 = 6, lo = 0.1, hi = 0.9) => fromFn(SIZE, SIZE, (x, y) => (x >= x0 && y >= y0 ? hi : lo)),
  noise: (seed = 1, amp = 1) => {
    const next = random(seed)
    return fromFn(SIZE, SIZE, () => next() * amp)
  },
  zonePlate: (w = 32, h = 32, k = 0.06) => fromFn(w, h, (x, y) => 0.5 + 0.5 * Math.cos(k * ((x - w / 2) ** 2 + (y - h / 2) ** 2))),
  glyph: (rows, lo = 0.1, hi = 0.9, ox = 3, oy = 3, scale = 2) =>
    fromFn(SIZE, SIZE, (x, y) => {
      const gx = Math.floor((x - ox) / scale)
      const gy = Math.floor((y - oy) / scale)
      return rows[gy]?.[gx] === '#' ? hi : lo
    }),
}

export const addNoise = (img, seed, amp) => {
  const next = random(seed)
  return map(img, (v) => v + (next() + next() + next() - 1.5) * amp)
}

export const GLYPHS = {
  T: ['#####', '..#..', '..#..', '..#..', '..#..'],
  L: ['#....', '#....', '#....', '#....', '#####'],
  X: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  F: ['#####', '#....', '####.', '#....', '#....'],
}
