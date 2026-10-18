// Depthgen pack: 7-4 (epipolar search) and chapter 8 · 画出没见过的图 (lectures 14–16).
//   7-4 只在一条线上找 — two unrectified views; a comparison budget only an epipolar search l′ = F·p fits.
//   8-1 两个数记住一张图 — an autoencoder bottleneck: a blob family with two degrees of freedom needs two numbers.
//   8-2 随机也能求导   — a sampler that draws fresh noise cannot be trained; z = μ + σ·ε with ε as an input can.
//   8-3 骗过鉴定员     — alternate training of a two-pen generator and a discriminator; a greedy generator collapses.
// The geometry and the GAN are pure JS here (epipolarModel, ganModel); the boards only draw and click,
// and each level's verify() proves its lesson with the same functions.
import { fromFn, image, random } from '../engine/image.js'
import { NODE_TYPES } from '../engine/nodes.js'
import { build, test } from './util.js'

// ======================= 8-1 / 8-2 · blobs, encoder, decoder =======================

const BLOB_SIGMA = 1.6
const UNIT = 4 // one latent unit moves the blob 4 pixels
const blob = (px, py) => fromFn(16, 16, (x, y) => Math.exp(-((x - px) ** 2 + (y - py) ** 2) / (2 * BLOB_SIGMA * BLOB_SIGMA)))
const blobAt = (zx, zy) => blob(7.5 + UNIT * zx, 7.5 + UNIT * zy)
const code = (values) => {
  const out = image(values.length, 1)
  values.forEach((v, i) => (out.data[i] = v))
  return out
}

// The encoder reads the image's column and row profiles in 8 bins each (two columns or rows per bin)
// and keeps k numbers: z_j = Σ a_j·columns + Σ b_j·rows. Weights for up to 3 numbers, 16 per number.
const MAX_CODE = 3
function profiles(img) {
  const bins = Array(16).fill(0)
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const v = img.data[y * img.w + x] / img.w
      bins[Math.floor((x * 8) / img.w)] += v
      bins[8 + Math.floor((y * 8) / img.h)] += v
    }
  }
  return bins
}
function encode(img, w, k) {
  if (img.w !== 16 || img.h !== 16) throw new Error('编码器要一张 16×16 的图')
  const bins = profiles(img)
  return code(Array.from({ length: k }, (_, j) => bins.reduce((sum, b, i) => sum + b * w[j * 16 + i], 0)))
}
// The decoder draws one blob; where it goes is a linear function of the code: p = A·z + b.
function decode(z, w) {
  if (z.h !== 1 || z.w > MAX_CODE) throw new Error('解码器要接编码（一行数字）')
  const k = z.w
  let px = w[6]
  let py = w[7]
  for (let j = 0; j < k; j++) {
    px += w[j] * z.data[j]
    py += w[3 + j] * z.data[j]
  }
  return blobAt(px, py)
}
// Small fixed pseudo-random starting weights, so training does not start from a symmetric zero.
const seeded = (seed, n, scale) => {
  const next = random(seed)
  return Array.from({ length: n }, () => Math.round((next() - 0.5) * 2 * scale * 1000) / 1000)
}
const ENCODER_START = seeded(81, 16 * MAX_CODE, 0.3)
const DECODER_START = [...seeded(82, 6, 0.3), 0, 0]

function gaussian(next) {
  // Box–Muller from a seeded uniform source.
  const u = Math.max(1e-9, next())
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next())
}

export const nodes = {
  dg_encode: {
    label: { zh: '编码器', en: 'Encoder' },
    description: { zh: '把整张图压成一行 k 个数（权重靠训练）', en: 'Squeezes the whole image into a row of k numbers (weights come from training)' },
    inputs: ['in'],
    params: [
      { key: 'k', label: { zh: '几个数', en: 'How many numbers' }, kind: 'select', options: [[1, { zh: '1 个', en: '1' }], [2, { zh: '2 个', en: '2' }], [3, { zh: '3 个', en: '3' }]], default: 1 },
      // Hidden from the card (its flag is never earned) but still trained: 48 weights.
      { key: 'w', label: { zh: '权重', en: 'Weights' }, kind: 'kernel', learnable: true, unlock: 'dg-weights-hidden', default: ENCODER_START },
    ],
    eval: ({ in: a }, p) => encode(a, p.w ?? ENCODER_START, Number(p.k ?? 1)),
    cost: 16,
    unlock: 'dg-autoencoder',
  },
  dg_decode: {
    label: { zh: '解码器', en: 'Decoder' },
    description: { zh: '由那几个数画回一张图（权重靠训练）', en: 'Draws an image back from those numbers (weights come from training)' },
    inputs: ['in'],
    params: [{ key: 'w', label: { zh: '权重', en: 'Weights' }, kind: 'kernel', learnable: true, unlock: 'dg-weights-hidden', default: DECODER_START }],
    eval: ({ in: z }, p) => decode(z, p.w ?? DECODER_START),
    cost: 16,
    unlock: 'dg-autoencoder',
  },
  dg_decoder: {
    label: { zh: '解码器（已训练）', en: 'Decoder (trained)' },
    description: { zh: '两个数 → 一个斑点：z₁ 管左右，z₂ 管上下', en: 'Two numbers → one blob: z₁ moves it left–right, z₂ up–down' },
    inputs: ['in'],
    eval: ({ in: z }) => {
      if (z.h !== 1 || z.w !== 2) throw new Error('要两个数')
      return blobAt(z.data[0], z.data[1])
    },
    cost: 16,
    unlock: 'dg-decoder',
  },
  dg_mu: {
    label: 'μ',
    description: { zh: '两个可训练的数：分布的中心', en: 'Two trainable numbers: the centre of the distribution' },
    inputs: [],
    params: [{ key: 'w', label: 'μ', kind: 'kernel', learnable: true, default: [0, 0] }],
    eval: (_, p) => code(p.w ?? [0, 0]),
    cost: 0,
    unlock: 'dg-latent',
  },
  dg_sigma: {
    label: 'σ',
    description: { zh: '两个可训练的数：分布有多散', en: 'Two trainable numbers: how spread out the distribution is' },
    inputs: [],
    params: [{ key: 'w', label: 'σ', kind: 'kernel', learnable: true, default: [1, 1] }],
    eval: (_, p) => code(p.w ?? [1, 1]),
    cost: 0,
    unlock: 'dg-latent',
  },
  dg_sample: {
    label: { zh: '采样 z ~ N(μ, σ²)', en: 'Sample z ~ N(μ, σ²)' },
    description: { zh: '每算一次都重新抽一个随机数', en: 'Draws a fresh random number every time it runs' },
    inputs: ['μ', 'σ'],
    eval: ({ μ: mu, σ: sigma }) => {
      const next = random(Math.floor(Math.random() * 2 ** 31))
      return code(Array.from(mu.data, (m, i) => m + sigma.data[i] * gaussian(next)))
    },
    cost: 2,
    unlock: 'dg-latent',
  },
  dg_reparam: {
    label: { zh: '重参数化 μ + σ·ε', en: 'Reparameterization μ + σ·ε' },
    description: { zh: '随机只从 ε 进来，μ、σ 照常求导', en: 'Randomness enters only through ε; μ and σ differentiate as usual' },
    inputs: ['μ', 'σ', 'ε'],
    eval: ({ μ: mu, σ: sigma, ε: eps }) => code(Array.from(mu.data, (m, i) => m + sigma.data[i] * eps.data[i])),
    cost: 2,
    unlock: 'dg-reparam',
  },
}

// Registered here as well as by index.js, because the reference graphs below are built at import time.
Object.assign(NODE_TYPES, nodes)

// ======================= 7-4 · two unrectified views =======================

// Camera 1 sits at the origin looking down +Z; camera 2 is X₂ = R·X₁ + t. Both have K with f = 30 on a
// 32×32 sensor. The scene is a slanted textured board in front of a textured wall, so depth varies and
// a point's match moves along its epipolar line with depth. F = K⁻ᵀ [t]ₓ R K⁻¹ (lecture 14).
export const epipolarModel = (() => {
  let cache = null
  const W = 32
  const f = 30
  const c = 15.5
  const PATCH = 2 // 5×5 comparison window
  const MARGIN = PATCH + 1
  const BUDGET = 40
  const deg = Math.PI / 180
  const mul = (a, b) => a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)))
  const apply = (m, v) => m.map((row) => row.reduce((s, x, k) => s + x * v[k], 0))
  const transpose = (m) => m[0].map((_, j) => m.map((row) => row[j]))
  const rz = (a) => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]]
  const ry = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]]
  const rx = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]]
  const K = [[f, 0, c], [0, f, c], [0, 0, 1]]
  const Kinv = [[1 / f, 0, -c / f], [0, 1 / f, -c / f], [0, 0, 1]]
  const R = mul(rz(14 * deg), mul(ry(-8 * deg), rx(3 * deg)))
  const t = [-0.8, -0.5, 0.4]
  const tx = [[0, -t[2], t[1]], [t[2], 0, -t[0]], [-t[1], t[0], 0]]
  // F is only defined up to scale; dividing by its largest entry keeps the numbers readable.
  const rawF = mul(transpose(Kinv), mul(mul(tx, R), Kinv))
  const largest = Math.max(...rawF.flat().map(Math.abs))
  const F = rawF.map((row) => row.map((v) => v / largest))
  const centre2 = apply(transpose(R), t).map((v) => -v)

  const hash = (i, j, s) => {
    let h = (i * 374761393 + j * 668265263 + s * 1442695041) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  const smooth = (q) => q * q * (3 - 2 * q)
  const valueNoise = (x, y, s, cell) => {
    const gx = x / cell
    const gy = y / cell
    const i = Math.floor(gx)
    const j = Math.floor(gy)
    const fx = smooth(gx - i)
    const fy = smooth(gy - j)
    return (hash(i, j, s) * (1 - fx) + hash(i + 1, j, s) * fx) * (1 - fy) + (hash(i, j + 1, s) * (1 - fx) + hash(i + 1, j + 1, s) * fx) * fy
  }
  const texture = (x, y, s, cell) => 0.6 * valueNoise(x, y, s, cell) + 0.4 * valueNoise(x, y, s + 7, cell * 1.8)
  const BOARD_CELL = 0.3
  // The board: plane Z = 5 + 0.25·X inside a rectangle; the wall: Z = 9.
  const hit = (origin, dir) => {
    const tb = (5 - origin[2] + 0.25 * origin[0]) / (dir[2] - 0.25 * dir[0])
    const onBoard = origin.map((v, i) => v + tb * dir[i])
    if (tb > 0 && Math.abs(onBoard[0] + 0.3) < 2 && Math.abs(onBoard[1]) < 2.4) return { point: onBoard, surface: 1, value: 0.42 + 0.55 * texture(onBoard[0], onBoard[1], 1, BOARD_CELL) }
    const tw = (9 - origin[2]) / dir[2]
    const onWall = origin.map((v, i) => v + tw * dir[i])
    return { point: onWall, surface: 2, value: 0.04 + 0.5 * texture(onWall[0], onWall[1], 2, 0.5) }
  }
  const ray1 = (u, v) => apply(Kinv, [u, v, 1])
  const ray2 = (u, v) => apply(transpose(R), apply(Kinv, [u, v, 1]))
  const see1 = (u, v) => hit([0, 0, 0], ray1(u, v))
  const see2 = (u, v) => hit(centre2, ray2(u, v))
  const render = (see) => {
    const img = image(W, W)
    const ss = 3
    for (let v = 0; v < W; v++) {
      for (let u = 0; u < W; u++) {
        let sum = 0
        for (let a = 0; a < ss; a++) for (let b = 0; b < ss; b++) sum += see(u + (a + 0.5) / ss - 0.5, v + (b + 0.5) / ss - 0.5).value
        img.data[v * W + u] = sum / (ss * ss)
      }
    }
    return img
  }

  const inside = (x, y) => x >= MARGIN && y >= MARGIN && x <= W - 1 - MARGIN && y <= W - 1 - MARGIN
  const sample = (img, x, y) => {
    const i = Math.floor(x)
    const j = Math.floor(y)
    const fx = x - i
    const fy = y - j
    const g = (a, b) => img.data[Math.min(W - 1, Math.max(0, b)) * W + Math.min(W - 1, Math.max(0, a))]
    return (g(i, j) * (1 - fx) + g(i + 1, j) * fx) * (1 - fy) + (g(i, j + 1) * (1 - fx) + g(i + 1, j + 1) * fx) * fy
  }

  const scene = () => {
    if (cache) return cache
    cache = { left: render(see1), right: render(see2) }
    return cache
  }

  // Where p really lands in view 2, and whether it can be matched there: visible, inside the frame, and
  // its comparison window lies on one surface in both views (windows that straddle the board's edge
  // compare different things, which is a different lesson).
  const truth = (u, v) => {
    if (!inside(u, v)) return null
    const seen = see1(u, v)
    const moved = apply(R, seen.point).map((x, i) => x + t[i])
    const projected = apply(K, moved)
    const u2 = projected[0] / projected[2]
    const v2 = projected[1] / projected[2]
    if (!inside(u2, v2)) return null
    const back = see2(u2, v2)
    if (Math.hypot(...back.point.map((x, i) => x - seen.point[i])) > 0.05) return null
    for (let b = -MARGIN; b <= MARGIN; b++) {
      for (let a = -MARGIN; a <= MARGIN; a++) {
        if (see1(u + a, v + b).surface !== seen.surface || see2(u2 + a, v2 + b).surface !== seen.surface) return null
      }
    }
    return { u: u2, v: v2 }
  }

  const line = (u, v) => apply(F, [u, v, 1])
  const cost = (u, v, x, y) => {
    const { left, right } = scene()
    let sum = 0
    for (let b = -PATCH; b <= PATCH; b++) for (let a = -PATCH; a <= PATCH; a++) sum += (left.data[(v + b) * W + u + a] - sample(right, x + a, y + b)) ** 2
    return sum / (2 * PATCH + 1) ** 2
  }

  // The four ways to search. Each returns the candidate positions it would compare.
  const candidates = {
    all: () => {
      const out = []
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (inside(x, y)) out.push([x, y])
      return out
    },
    row: (u, v) => Array.from({ length: W }, (_, x) => [x, v]).filter(([x, y]) => inside(x, y)),
    point: (u, v) => {
      const [a, b, h] = line(u, v)
      return [[a / h, b / h]]
    },
    line: (u, v) => {
      const [a, b, h] = line(u, v)
      const n = Math.hypot(a, b)
      const d = (a * c + b * c + h) / n
      const foot = [c - (a / n) * d, c - (b / n) * d]
      // Step along the line left to right (top to bottom when vertical), so candidates read like the image.
      const flip = -b < 0 || (b === 0 && a < 0) ? -1 : 1
      const out = []
      for (let s = -2 * W; s <= 2 * W; s++) {
        const x = foot[0] - flip * (b / n) * s
        const y = foot[1] + flip * (a / n) * s
        if (inside(x, y)) out.push([x, y])
      }
      return out
    },
  }

  // Compare every candidate inside the frame; the best is the lowest window difference.
  const search = (u, v, mode) => {
    const list = candidates[mode](u, v)
    let best = null
    for (const [x, y] of list) {
      if (!inside(x, y)) continue
      const score = cost(u, v, x, y)
      if (!best || score < best.score) best = { x, y, score }
    }
    const target = truth(u, v)
    const found = Boolean(best && target && Math.hypot(best.x - target.u, best.y - target.v) <= 1.5)
    return { list, count: list.length, best, found }
  }

  // The epipole in view 2: e′ with Fᵀ… e′ᵀF = 0, i.e. the null vector of Fᵀ.
  const epipole = (() => {
    const [r0, r1] = transpose(F)
    const e = [r0[1] * r1[2] - r0[2] * r1[1], r0[2] * r1[0] - r0[0] * r1[2], r0[0] * r1[1] - r0[1] * r1[0]]
    return [e[0] / e[2], e[1] / e[2]]
  })()

  // The two comparison windows, for showing side by side: p's in view 1, and the one at (x, y) in view 2.
  const windows = (u, v, x, y) => {
    const { left, right } = scene()
    const n = 2 * PATCH + 1
    return {
      left: fromFn(n, n, (a, b) => left.data[(v + b - PATCH) * W + u + a - PATCH]),
      right: fromFn(n, n, (a, b) => sample(right, x + a - PATCH, y + b - PATCH)),
    }
  }
  // Per-candidate differences along a row or line search, in candidate order (for a profile plot).
  const profile = (u, v, list) => list.filter(([x, y]) => inside(x, y)).map(([x, y]) => cost(u, v, x, y))

  return { W, BUDGET, PATCH, F, scene, truth, line, candidates, search, epipole, inside, windows, profile }
})()

function verifyEpipolar() {
  const m = epipolarModel
  const valid = []
  for (let v = 0; v < m.W; v++) for (let u = 0; u < m.W; u++) if (m.truth(u, v)) valid.push([u, v])
  if (valid.length < 60) return `只有 ${valid.length} 个可点的点`
  let line = 0
  let row = 0
  let point = 0
  let longest = 0
  for (const [u, v] of valid) {
    const along = m.search(u, v, 'line')
    longest = Math.max(longest, along.count)
    if (along.found) line += 1
    if (m.search(u, v, 'row').found) row += 1
    if (m.search(u, v, 'point').found) point += 1
  }
  const all = m.candidates.all().length
  if (all <= m.BUDGET) return '全图搜索没有超出预算'
  if (longest > m.BUDGET) return `极线最长 ${longest} 个候选，超出预算`
  if (line < valid.length) return `极线搜索只找对 ${line}/${valid.length}`
  if (row > valid.length * 0.1) return `同一行搜索找对了 ${row}/${valid.length}，太多`
  if (point > 0) return 'F·p 当作点竟然找对了'
  return ''
}

// ======================= 8-3 · a two-pen generator against a discriminator =======================

// Real data: two humps at ±2 (σ = 0.35), 64 samples each at fixed quantiles. The generator G has two
// pens; each draws half the samples as μ_k + 0.35·q. The discriminator is D(x) = sigmoid(w₀ + w₁u + w₂u²)
// with u = x/2. D climbs log D(real) + log(1 − D(fake)); G climbs log D(fake) (the non-saturating form).
export const ganModel = (() => {
  const N = 64
  const MODE = 2
  const WIDTH = 0.35
  const LR_D = 2
  const erfinv = (x) => {
    const a = 0.147
    const ln = Math.log(1 - x * x)
    const s = 2 / (Math.PI * a) + ln / 2
    return Math.sign(x) * Math.sqrt(Math.sqrt(s * s - ln / a) - s)
  }
  const QUANTILES = Array.from({ length: N }, (_, i) => Math.SQRT2 * erfinv(2 * ((i + 0.5) / N) - 1))
  const REAL = [...QUANTILES.map((q) => -MODE + WIDTH * q), ...QUANTILES.map((q) => MODE + WIDTH * q)]
  const sigmoid = (s) => 1 / (1 + Math.exp(-s))
  const features = (x) => [1, x / 2, (x / 2) ** 2]
  const logit = (w, x) => w[0] + (w[1] * x) / 2 + (w[2] * x * x) / 4
  const slope = (w, x) => w[1] / 2 + (w[2] * x) / 2
  const fakes = (pens) => pens.flatMap((m) => QUANTILES.map((q) => m + WIDTH * q))
  const D = (w, x) => sigmoid(logit(w, x))

  const stepD = (w, pens) => {
    const grad = [0, 0, 0]
    const all = REAL.length
    for (const x of REAL) {
      const p = D(w, x)
      features(x).forEach((f, i) => (grad[i] += ((1 - p) * f) / all))
    }
    for (const x of fakes(pens)) {
      const p = D(w, x)
      features(x).forEach((f, i) => (grad[i] -= (p * f) / all))
    }
    return w.map((v, i) => v + LR_D * grad[i])
  }
  const stepG = (pens, w, rate) =>
    pens.map((m) => {
      let g = 0
      for (const q of QUANTILES) {
        const x = m + WIDTH * q
        g += ((1 - D(w, x)) * slope(w, x)) / N
      }
      return m + rate * g
    })

  const near = (xs, m) => xs.filter((x) => Math.abs(x - m) < 0.8).length / xs.length
  const measure = (state) => {
    const xs = fakes(state.pens)
    const accuracy = (REAL.reduce((s, x) => s + D(state.w, x), 0) + xs.reduce((s, x) => s + 1 - D(state.w, x), 0)) / (REAL.length + xs.length)
    return { left: near(xs, -MODE), right: near(xs, MODE), accuracy }
  }
  const good = (m) => m.left >= 0.4 && m.right >= 0.4 && Math.abs(m.accuracy - 0.5) <= 0.05

  const start = () => ({ pens: [0.4, 0.9], w: [0, 0, 0], turn: 0, streak: 0, history: [[0.4, 0.9]] })
  // One turn: D trains dSteps, then G trains gSteps at rate gRate.
  const turn = (state, { dSteps, gSteps, gRate }) => {
    let { w, pens } = state
    for (let i = 0; i < dSteps; i++) w = stepD(w, pens)
    for (let i = 0; i < gSteps; i++) pens = stepG(pens, w, gRate)
    const next = { ...state, w, pens, turn: state.turn + 1, history: [...state.history, pens].slice(-120) }
    next.streak = good(measure(next)) ? state.streak + 1 : 0
    return next
  }
  const WIN = 3 // turns in a row

  const histogram = (xs, bins = 32, lo = -4, hi = 4) => {
    const h = Array(bins).fill(0)
    for (const x of xs) {
      const k = Math.floor(((x - lo) / (hi - lo)) * bins)
      if (k >= 0 && k < bins) h[k] += 1 / xs.length
    }
    return h
  }

  const OPTIONS = { dSteps: [1, 3, 10], gSteps: [1, 3, 10], gRate: [0.2, 0.5, 1, 2] }
  return { REAL, MODE, WIN, OPTIONS, D, fakes, start, turn, measure, histogram, DEFAULT: { dSteps: 1, gSteps: 10, gRate: 1 }, GOOD: { dSteps: 3, gSteps: 1, gRate: 0.5 } }
})()

function verifyGan() {
  const m = ganModel
  const play = (schedule, turns) => {
    let s = m.start()
    let collapsed = false
    for (let i = 0; i < turns; i++) {
      s = m.turn(s, schedule)
      const r = m.measure(s)
      if (r.left > 0.9 || r.right > 0.9) collapsed = true
      if (s.streak >= m.WIN) return { won: i + 1, collapsed, s }
    }
    return { won: 0, collapsed, s }
  }
  const naive = play(m.DEFAULT, 300)
  if (naive.won) return `默认节奏第 ${naive.won} 回合就过关了`
  if (!naive.collapsed) return '默认节奏没有出现模式坍塌'
  const good = play(m.GOOD, 60)
  if (!good.won) return '推荐节奏 60 回合内没有过关'
  const r = m.measure(good.s)
  if (Math.abs(r.accuracy - 0.5) > 0.05) return '过关时鉴定员准确率不在 0.5 附近'
  return ''
}

// ======================= levels =======================

// 8-1 test images: blobs spread in both directions, so no single line through them fits.
// Sixteen blobs on a slightly staggered 4×4 grid over the middle of the image. Six used to be too few: they
// could not pin down the encoder's weights, so a trained encoder only knew the places it had seen.
const AE_POSITIONS = [[3.5, 3.5], [3.8, 6.33], [3.5, 9.17], [3.8, 12], [6.33, 3.7], [6.63, 6.53], [6.33, 9.37], [6.63, 12.2], [9.17, 3.5], [9.47, 6.33], [9.17, 9.17], [9.47, 12], [12, 3.7], [12.3, 6.53], [12, 9.37], [12.3, 12.2]]
const aeTests = AE_POSITIONS.map(([x, y], i) => {
  const img = blob(x, y)
  return test({ zh: `斑点 ${i + 1}`, en: `Blob ${i + 1}` }, { in: img }, { out: img })
})
// Held back: blobs at places the training never showed. A two-number autoencoder trained from the default start
// draws them right from the step its visible tests first pass, and every step after.
const AE_HIDDEN = [[4.17, 10.45], [7.97, 11.46], [7.92, 5.1]].map(([x, y], i) => {
  const img = blob(x, y)
  return test({ zh: `新位置 ${i + 1}`, en: `New place ${i + 1}` }, { in: img }, { out: img })
})

// Whether the camera can reach the display without passing an encoder.
function bypassesBottleneck(graph) {
  const next = new Map()
  for (const wire of graph.wires) next.set(wire.from, [...(next.get(wire.from) ?? []), wire.to])
  const kind = new Map(graph.nodes.map((n) => [n.id, n.type]))
  const stack = graph.nodes.filter((n) => n.type === 'input').map((n) => n.id)
  const seen = new Set()
  while (stack.length) {
    const id = stack.pop()
    if (seen.has(id)) continue
    seen.add(id)
    if (kind.get(id) === 'output') return true
    if (kind.get(id) === 'dg_encode') continue
    stack.push(...(next.get(id) ?? []))
  }
  return false
}

// Weights reached by pressing 训练 from the default start (trainStep at trainRate 30): two numbers pass after
// 18 steps (these are 20 steps later); one number after 400 steps still draws only 4 of the 16 blobs.
const AE_TRAINED_2 = {
  enc: [0.147, -0.326, -0.312, 0.003, -0.008, 0.077, 0.312, 0.226, -0.314, -0.812, -0.779, -0.045, -0.077, 0.498, 0.899, 0.39, -0.377, -0.847, -0.985, -0.191, -0.146, 0.321, 0.652, 0.562, 0.197, 0.189, 0.232, 0.08, -0.148, 0.011, -0.446, 0.004, ...ENCODER_START.slice(32)],
  dec: [0.474, 1.49, 0.015, 1.479, -0.5, -0.08, 0.345, 0.064],
}
const AE_TRAINED_1 = {
  enc: [0.039, -0.696, -0.56, -0.061, 0.012, 0.236, 0.694, 0.431, -0.3, -0.658, -0.54, -0.033, -0.075, 0.336, 0.667, 0.339, ...ENCODER_START.slice(16)],
  dec: [1.113, 0.201, 0.015, 1.111, 0.003, -0.08, 0.143, 0.131],
}
const aeGraph = (k, trained) =>
  build({ e: ['dg_encode', { k, w: trained.enc }], d: ['dg_decode', { w: trained.dec }] }, ['in>e', 'e>d', 'd>out'])

// 8-2: the teacher drew each test's blob at z = m + s·ε with the ε shown.
const TEACHER_MU = [0.4, -0.3]
const TEACHER_SIGMA = [0.5, 0.25]
const EPS = (() => {
  const next = random(2024)
  return Array.from({ length: 5 }, () => [gaussian(next), gaussian(next)])
})()
const reparamTests = EPS.map((e, i) =>
  test({ zh: `噪声 ${i + 1}`, en: `Noise ${i + 1}` }, { eps: code(e) }, { out: blobAt(TEACHER_MU[0] + TEACHER_SIGMA[0] * e[0], TEACHER_MU[1] + TEACHER_SIGMA[1] * e[1]) }),
)
// Held back: fresh noise from another seed, drawn by the same teacher.
const reparamHidden = (() => {
  const next = random(2025)
  return Array.from({ length: 3 }, () => [gaussian(next), gaussian(next)])
})().map((e, i) => test({ zh: `新噪声 ${i + 1}`, en: `New noise ${i + 1}` }, { eps: code(e) }, { out: blobAt(TEACHER_MU[0] + TEACHER_SIGMA[0] * e[0], TEACHER_MU[1] + TEACHER_SIGMA[1] * e[1]) }))
const latentGraph = (nodesSpec, wires) => build(nodesSpec, wires, { inputs: ['eps'] })

export const levels = [
  {
    id: '7-4',
    kind: 'board',
    board: 'EpipolarSearch',
    chapter: 7,
    title: { zh: '只在一条线上找', en: 'Search along one line' },
    brief: { zh: '在左图点一个点，在右图找到同一点。每个点最多比较 40 次；找到 3 个就过关。', en: 'Click a point in the left image and find the same point in the right image. Each point allows at most 40 comparisons; find 3 to pass.' },
    hint: { zh: '两台相机没有对齐，同一点不在同一行。F·p 算出来的三个数 (a, b, c) 是什么？', en: 'The two cameras are not aligned, so the same point is not on the same row. What are the three numbers (a, b, c) that F·p gives you?' },
    after: { zh: '左图的一个点只确定一条视线，这条视线上所有可能的深度，投到右图都落在同一条极线 l′ = F·p 上：a·u′ + b·v′ + c = 0。F·p 是一条线，不是一个点；点在线上的哪里，取决于它有多远。二维搜索于是变成一维，所有极线都汇向极点。', en: 'A point in the left image only fixes a line of sight. Every possible depth along that line projects into the right image onto the same epipolar line l′ = F·p: a·u′ + b·v′ + c = 0. F·p is a line, not a point; where the point sits on it depends on how far away it is. So a 2-D search becomes 1-D, and all epipolar lines meet at the epipole.' },
    requires: ['7-2'],
    unlocks: [],
    model: epipolarModel,
    verify: verifyEpipolar,
  },
  {
    id: '8-1',
    chapter: 8,
    title: { zh: '两个数记住一张图', en: 'Two numbers to remember an image' },
    brief: { zh: '先把图压成几个数，再由这几个数画回原图。用最少的数做到。', en: 'Squeeze the image into a few numbers, then draw the original back from those numbers. Do it with as few numbers as you can.' },
    hint: { zh: '一个数只能让斑点沿一条线走。这些斑点在往几个方向变？', en: 'One number can only move the blob along a line. In how many directions do these blobs vary?' },
    after: { zh: '编码器把图压成 z，解码器再从 z 画回来，目标就是输入自己，不需要标签。最窄的那层叫瓶颈：这一族斑点只在左右、上下两个方向变，所以瓶颈至少要两个数；一个数只能让斑点沿一条直线走。', en: 'The encoder squeezes the image into z, and the decoder draws it back from z; the target is the input itself, so no labels are needed. The narrowest layer is called the bottleneck: this family of blobs varies only left–right and up–down, so the bottleneck needs at least two numbers; one number can only move the blob along a straight line.' },
    requires: ['4-9'],
    unlocks: ['dg-decoder'],
    palette: ['dg_encode', 'dg_decode'],
    // Within 0.2 a pixel, which is a blob drawn less than half a pixel off; one number misses by several pixels.
    check: { tolerance: 0.2, mismatches: 3 },
    trainRate: 30,
    constraint: (score, graph) => {
      if (bypassesBottleneck(graph)) return { zh: '图像没有经过编码器', en: 'The image does not pass through the encoder' }
      const widest = Math.max(0, ...graph.nodes.filter((n) => n.type === 'dg_encode').map((n) => Number(n.params.k ?? 1)))
      return widest > 2 ? { zh: `瓶颈有 ${widest} 个数，最多 2 个`, en: `The bottleneck has ${widest} numbers; at most 2 allowed` } : ''
    },
    tests: aeTests,
    hidden: AE_HIDDEN,
    solution: aeGraph(2, AE_TRAINED_2),
    naive: aeGraph(1, AE_TRAINED_1),
    alsoFails: [build({}, ['in>out']), aeGraph(3, AE_TRAINED_2)],
  },
  {
    id: '8-2',
    chapter: 8,
    title: { zh: '随机也能求导', en: 'Differentiating through randomness' },
    inputs: ['eps'],
    inputLabels: { eps: { zh: '噪声 ε', en: 'Noise ε' } },
    brief: { zh: '老师用每组的噪声 ε 画出了右边的斑点（z 从 N(μ, σ²) 中采样）。学出 μ 和 σ，用同样的 ε 画出同样的图。', en: 'The teacher drew the blob on the right from each set\'s noise ε (z sampled from N(μ, σ²)). Learn μ and σ, and draw the same image from the same ε.' },
    hint: { zh: '采样器每算一次都换一个随机数，训练看到的只是噪声。老师用的那组 ε 就在输入里。', en: 'The sampler draws a new random number every time it runs, so all training sees is noise. The teacher\'s ε is right there in the input.' },
    after: { zh: '采样这一步没法求导：每次重抽，训练分不清结果变好是因为改了 μ、σ 还是运气。把它写成 z = μ + σ·ε，随机全部来自输入 ε，z 对 μ、σ 就只是乘和加，梯度清清楚楚。这叫重参数化，VAE 的编码器就是这样训练的。', en: 'You cannot differentiate through the sampling step: with a fresh draw each time, training cannot tell whether a better result came from changing μ and σ or from luck. Write it as z = μ + σ·ε instead: all the randomness comes from the input ε, z is just a multiply and an add of μ and σ, and the gradient is perfectly clear. This is called reparameterization, and it is how a VAE\'s encoder is trained.' },
    requires: ['8-1'],
    unlocks: ['dg-reparam'],
    grants: ['mul'],
    palette: ['dg_mu', 'dg_sigma', 'dg_sample', 'mul', 'add', 'dg_decoder'],
    check: { tolerance: 0.05, mismatches: 2 },
    trainRate: 5,
    tests: reparamTests,
    hidden: reparamHidden,
    solution: latentGraph({ m: ['dg_mu', { w: TEACHER_MU }], s: ['dg_sigma', { w: TEACHER_SIGMA }], x: 'mul', a: 'add', d: 'dg_decoder' }, ['s>x.a', 'eps>x.b', 'm>a.a', 'x>a.b', 'a>d', 'd>out']),
    // Even with the teacher's own μ and σ, fresh draws cannot reproduce (or be trained towards) the tests.
    naive: latentGraph({ m: ['dg_mu', { w: TEACHER_MU }], s: ['dg_sigma', { w: TEACHER_SIGMA }], z: 'dg_sample', d: 'dg_decoder' }, ['m>z.μ', 's>z.σ', 'z>d', 'd>out']),
    alsoFails: [
      latentGraph({ m: ['dg_mu', { w: TEACHER_MU }], d: 'dg_decoder' }, ['m>d', 'd>out']),
      latentGraph({ m: ['dg_mu', { w: TEACHER_MU }], a: 'add', d: 'dg_decoder' }, ['m>a.a', 'eps>a.b', 'a>d', 'd>out']),
    ],
  },
  {
    id: '8-3',
    kind: 'board',
    board: 'GanDuel',
    chapter: 8,
    title: { zh: '骗过鉴定员', en: 'Fool the judge' },
    brief: { zh: '生成器有两支笔，要画出和真实数据一样的两堆点。轮流训练鉴定员和生成器，直到两堆都画到、鉴定员只能瞎猜。', en: 'The generator has two pens and must draw two clusters of points just like the real data. Take turns training the judge and the generator until both clusters are covered and the judge can only guess.' },
    hint: { zh: '生成器一回合走太远，就会一起冲向鉴定员此刻最相信的那一处。', en: 'If the generator moves too far in one round, both pens rush together to the spot the judge trusts most right now.' },
    after: { zh: '鉴定员不动、生成器猛练，生成器就把所有样本都放到鉴定员最相信的那一点：两支笔重合，只画一堆，这就是模式坍塌；鉴定员一反应，它们又一起跳到另一堆。让鉴定员跟上、生成器小步走，两支笔才会各占一堆，最后鉴定员的准确率回到 50%。', en: 'If the judge stands still while the generator trains hard, the generator puts every sample on the one spot the judge trusts most: the two pens merge and draw only one cluster. This is mode collapse; as soon as the judge reacts, they jump together to the other cluster. Let the judge keep up and the generator take small steps, and the pens settle on one cluster each, until the judge\'s accuracy is back to 50%.' },
    requires: ['8-2'],
    unlocks: [],
    model: ganModel,
    verify: verifyGan,
  },
]
