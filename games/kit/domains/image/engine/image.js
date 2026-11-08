// Small floating-point grayscale and RGB images and the test-image library every level draws from.
// Values are nominally 0 (black) … 1 (white); edge and difference images may go negative.

export const SIZE = 16

export function image(w = SIZE, h = SIZE, fill = 0, c = 1) {
  return { w, h, ...(c === 1 ? {} : { c }), data: new Float32Array(w * h * c).fill(fill) }
}

export const at = (img, x, y) => img.data[y * img.w + x]

export function map(img, fn) {
  const c = img.c ?? 1
  const out = image(img.w, img.h, 0, c)
  for (let i = 0; i < img.data.length; i++) {
    const pixel = Math.floor(i / c)
    out.data[i] = fn(img.data[i], pixel % img.w, Math.floor(pixel / img.w), i % c)
  }
  return out
}

export function zip(a, b, fn) {
  const ac = a.c ?? 1, bc = b.c ?? 1, c = Math.max(ac, bc)
  if ((ac !== 1 && ac !== c) || (bc !== 1 && bc !== c)) throw new Error('Image channels do not match')
  const out = image(a.w, a.h, 0, c)
  for (let i = 0; i < a.w * a.h; i++) for (let k = 0; k < c; k++) out.data[i * c + k] = fn(a.data[i * ac + (ac === 1 ? 0 : k)], b.data[i * bc + (bc === 1 ? 0 : k)])
  return out
}

export function fromFn(w, h, fn) {
  const out = image(w, h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.data[y * w + x] = fn(x, y)
  return out
}

// Shift content by (dx, dy): out(x, y) = in(x − dx, y − dy). Outside is 0, or the nearest edge pixel.
export function shift(img, dx, dy, border = 'zero') {
  const c = img.c ?? 1
  const out = image(img.w, img.h, 0, c)
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    let sx = x - dx
    let sy = y - dy
    if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) {
      if (border === 'wrap') {
        sx = ((sx % img.w) + img.w) % img.w
        sy = ((sy % img.h) + img.h) % img.h
      } else if (border === 'edge') {
        sx = Math.min(img.w - 1, Math.max(0, sx))
        sy = Math.min(img.h - 1, Math.max(0, sy))
      } else continue
    }
    for (let k = 0; k < c; k++) out.data[(y * img.w + x) * c + k] = img.data[(sy * img.w + sx) * c + k]
  }
  return out
}

// Correlation with a (2r+1)² kernel given row-major, matching how the 3×3 node reads its knobs.
export function correlate(img, kernel, border = 'zero') {
  const r = Math.round((Math.sqrt(kernel.length) - 1) / 2)
  const n = 2 * r + 1
  let out = image(img.w, img.h, 0, img.c ?? 1)
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
  const c = img.c ?? 1, out = image(Math.floor(img.w / factor), Math.floor(img.h / factor), 0, c)
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) for (let k = 0; k < c; k++) out.data[(y * out.w + x) * c + k] = img.data[(y * factor * img.w + x * factor) * c + k]
  return out
}

export function maxPool(img, size = 2) {
  const c = img.c ?? 1, out = image(Math.floor(img.w / size), Math.floor(img.h / size), 0, c)
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) for (let k = 0; k < c; k++) {
    let best = -Infinity
    for (let v = 0; v < size; v++) for (let u = 0; u < size; u++) best = Math.max(best, img.data[((y * size + v) * img.w + x * size + u) * c + k])
    out.data[(y * out.w + x) * c + k] = best
  }
  return out
}

// ---------- comparison ----------

export function compare(actual, expected, { tolerance = 0.02, mismatches = 0 } = {}) {
  if (!actual || actual.w !== expected.w || actual.h !== expected.h || (actual.c ?? 1) !== (expected.c ?? 1)) {
    const reason = actual
      ? { zh: `图像尺寸或通道数不符：应为 ${expected.w}×${expected.h}、${expected.c ?? 1} 通道，实际 ${actual.w}×${actual.h}、${actual.c ?? 1} 通道`, en: `Image size or channel count differs: expected ${expected.w}×${expected.h}, ${expected.c ?? 1} channels; got ${actual.w}×${actual.h}, ${actual.c ?? 1} channels` }
      : { zh: '输出未连接', en: 'Output not connected' }
    return { pass: false, reason, worst: Infinity, wrong: Infinity }
  }
  let wrong = 0
  let worst = 0
  const channels = expected.c ?? 1
  for (let i = 0; i < actual.w * actual.h; i++) {
    let pixelWrong = false
    for (let c = 0; c < channels; c++) {
      const error = Math.abs(actual.data[i * channels + c] - expected.data[i * channels + c])
      worst = Math.max(worst, Number.isFinite(error) ? error : Infinity)
      if (!(error <= tolerance)) pixelWrong = true
    }
    if (pixelWrong) wrong += 1
  }
  // The reason is a { zh, en } pair, read in the player's language when shown.
  const unit = expected.w * expected.h === 1 ? null : expected.h === 1 ? ['个采样点', wrong === 1 ? 'sample' : 'samples'] : ['个像素', wrong === 1 ? 'pixel' : 'pixels']
  const reason = wrong <= mismatches
    ? ''
    : unit
      ? { zh: `${wrong} ${unit[0]}超出容差`, en: `${wrong} ${unit[1]} outside the tolerance` }
      : { zh: `读数差了 ${worst.toFixed(3)}，超出容差 ${tolerance}`, en: `Reading off by ${worst.toFixed(3)}, beyond the tolerance of ${tolerance}` }
  return { pass: wrong <= mismatches, wrong, worst, reason }
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
