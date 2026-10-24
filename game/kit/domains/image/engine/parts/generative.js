// Parts for drawing what was never seen (视觉完备 chapter 8): an autoencoder that squeezes a blob into a few numbers,
// trained and fixed encoders and decoders, sampling from a latent code and reparameterising it.
import { fromFn, image, random } from '../image.js'

export const BLOB_SIGMA = 1.6
export const UNIT = 4 // one latent unit moves the blob 4 pixels
export const blob = (px, py) => fromFn(16, 16, (x, y) => Math.exp(-((x - px) ** 2 + (y - py) ** 2) / (2 * BLOB_SIGMA * BLOB_SIGMA)))
export const blobAt = (zx, zy) => blob(7.5 + UNIT * zx, 7.5 + UNIT * zy)
export const code = (values) => {
  const out = image(values.length, 1)
  values.forEach((v, i) => (out.data[i] = v))
  return out
}

// The encoder reads the image's column and row profiles in 8 bins each (two columns or rows per bin)
// and keeps k numbers: z_j = Σ a_j·columns + Σ b_j·rows. Weights for up to 3 numbers, 16 per number.
export const MAX_CODE = 3
export function profiles(img) {
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
export function encode(img, w, k) {
  if (img.w !== 16 || img.h !== 16) throw new Error('编码器要一张 16×16 的图')
  const bins = profiles(img)
  return code(Array.from({ length: k }, (_, j) => bins.reduce((sum, b, i) => sum + b * w[j * 16 + i], 0)))
}
// The decoder draws one blob; where it goes is a linear function of the code: p = A·z + b.
export function decode(z, w) {
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
export const seeded = (seed, n, scale) => {
  const next = random(seed)
  return Array.from({ length: n }, () => Math.round((next() - 0.5) * 2 * scale * 1000) / 1000)
}
export const ENCODER_START = seeded(81, 16 * MAX_CODE, 0.3)
export const DECODER_START = [...seeded(82, 6, 0.3), 0, 0]

export function gaussian(next) {
  // Box–Muller from a seeded uniform source.
  const u = Math.max(1e-9, next())
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next())
}
export const GENERATIVE = {
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
  // What a trained encoder for the blob family gives: where the blob is, in latent units (the trained decoder's
  // inverse). It reads the centre of the blob's bright core, ignoring anything dimmer than 0.3.
  dg_encoder: {
    label: { zh: '编码器（已训练）', en: 'Encoder (trained)' },
    description: { zh: '一个斑点 → 两个数：它在左右、上下的位置', en: 'One blob → two numbers: where it is left–right and up–down' },
    inputs: ['in'],
    eval: ({ in: a }) => {
      let total = 0
      let sx = 0
      let sy = 0
      for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
        const v = Math.max(0, a.data[y * a.w + x] - 0.3)
        total += v
        sx += v * x
        sy += v * y
      }
      return code([(sx / total - 7.5) / UNIT, (sy / total - 7.5) / UNIT])
    },
    cost: 16,
    unlock: 'dg-decoder',
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
    inputs: ['mu', 'sigma'],
    eval: ({ mu, sigma }) => {
      const next = random(Math.floor(Math.random() * 2 ** 31))
      return code(Array.from(mu.data, (m, i) => m + sigma.data[i] * gaussian(next)))
    },
    cost: 2,
    unlock: 'dg-latent',
  },
  dg_reparam: {
    label: { zh: '重参数化 μ + σ·ε', en: 'Reparameterization μ + σ·ε' },
    description: { zh: '随机只从 ε 进来，μ、σ 照常求导', en: 'Randomness enters only through ε; μ and σ differentiate as usual' },
    inputs: ['mu', 'sigma', 'eps'],
    eval: ({ mu, sigma, eps }) => code(Array.from(mu.data, (m, i) => m + sigma.data[i] * eps.data[i])),
    cost: 2,
    unlock: 'dg-reparam',
  },
}

