// Scenes of generating pictures (scenes/index.js): a walk between two blobs in latent space, noisy blobs to clean,
// blobs drawn from a latent code at μ + σ·ε, and diffusion: a letter noised in one step or two, restored from its
// noise, and an old photo restored without knowing the noise.
import { S } from '../../../../engine/schema.js'
import { GLYPHS, fromFn, image, patterns, random, zip } from '../../engine/image.js'
import { NODE_TYPES } from '../../engine/nodes.js'
import { blob, blobAt, code, gaussian } from '../../engine/parts/generative.js'
import { LETTER } from '../pictures.js'
import { T as t } from '../../../../shell/i18n.js'

const num = S.num()
const XY = S.list(num, { min: 2, about: t('斑点的中心 (x, y)') })
const Z = S.list(num, { min: 2, about: t('潜空间里的两个数') })

const centreOf = (img) => NODE_TYPES.dg_encoder.eval({ in: img }).data
// The latent code μ + σ·ε, drawn as a blob.
const drawn = (mu, sigma, e) => blobAt(mu[0] + sigma[0] * e[0], mu[1] + sigma[1] * e[1])

// Diffusion: x_t = √ᾱ·x₀ + √(1 − ᾱ)·ε, where ᾱ says how much of the picture is left.
const letter = (name, dx = 0, dy = 0) => patterns.glyph(GLYPHS[name], 0.1, 0.9, 3 + dx, 3 + dy)
const noiseImage = (seed) => {
  const next = random(seed)
  return fromFn(16, 16, () => gaussian(next))
}
const addNoiseStep = (x0, eps, ab) => zip(x0, eps, (x, e) => Math.sqrt(ab) * x + Math.sqrt(1 - ab) * e)

export const GENERATIVE = {
  walk: {
    about: t('两个斑点和走到哪 t；期望是潜空间里两点之间 t 处的斑点'),
    test: S.obj({ a: XY, b: XY, t: num }),
    make: ({ a: [ax, ay], b: [bx, by], t: w }) => {
      const a = blob(ax, ay)
      const b = blob(bx, by)
      const [za, zb] = [centreOf(a), centreOf(b)]
      return { inputs: { a, b, t: image(1, 1, w) }, expected: { out: blobAt((1 - w) * za[0] + w * zb[0], (1 - w) * za[1] + w * zb[1]) } }
    },
  },
  noisyBlob: {
    about: t('带噪声的斑点；期望是干净的斑点'),
    test: S.obj({ at: XY, seed: S.int() }),
    make: ({ at: [x, y], seed }) => {
      const clean = blob(x, y)
      const next = random(seed)
      return { inputs: { in: fromFn(16, 16, (px, py) => clean.data[py * 16 + px] + 0.12 * (next() + next() + next() - 1.5) * 2) }, expected: { out: clean } }
    },
  },
  latent: {
    about: t('噪声 ε（两个数）；期望是潜码 μ + σ·ε 画出的斑点。given：μ 和 σ 也是输入'),
    setup: S.obj({ mu: Z, sigma: Z, given: S.opt(S.bool()) }),
    test: S.obj({ eps: Z }),
    make: ({ eps }, { mu, sigma, given }) => ({ inputs: { eps: code(eps), ...(given ? { mu: code(mu), sigma: code(sigma) } : {}) }, expected: { out: drawn(mu, sigma, eps) } }),
  },
  sides: {
    about: t('噪声 ε 和画哪边 c（0 左，1 右），另给左右两个中心和 σ；期望是那一边 μ + σ·ε 画出的斑点'),
    setup: S.obj({ left: Z, right: Z, sigma: Z }),
    test: S.obj({ eps: Z, c: S.oneOf([0, 1]) }),
    make: ({ eps, c }, { left, right, sigma }) => ({
      inputs: { eps: code(eps), c: image(1, 1, c), left: code(left), right: code(right), sigma: code(sigma) },
      expected: { out: drawn(c ? right : left, sigma, eps) },
    }),
  },
  noising: {
    about: t('一个字母 x₀、一张高斯噪声 ε 和剩下多少 ᾱ；期望是一步加到的 x_t = √ᾱ·x₀ + √(1 − ᾱ)·ε'),
    test: S.obj({ letter: LETTER, seed: S.int({ about: t('噪声的种子') }), ab: num }),
    make: ({ letter: name, seed, ab }) => ({ inputs: { x0: letter(name), eps: noiseImage(seed), ab: image(1, 1, ab) }, expected: { out: addNoiseStep(letter(name), noiseImage(seed), ab) } }),
  },
  twoNoisings: {
    about: t('同一个字母加两次噪声：两张噪声、两个 ᾱ；期望是加完两次的图'),
    test: S.obj({ letter: LETTER, seeds: S.list(S.int(), { min: 2 }), ab: S.list(num, { min: 2 }) }),
    make: ({ letter: name, seeds: [s1, s2], ab: [a1, a2] }) => {
      const once = addNoiseStep(letter(name), noiseImage(s1), a1)
      return { inputs: { x0: letter(name), e1: noiseImage(s1), e2: noiseImage(s2), a1: image(1, 1, a1), a2: image(1, 1, a2) }, expected: { out: addNoiseStep(once, noiseImage(s2), a2) } }
    },
  },
  restoring: {
    about: t('加了噪的 x_t、当初加的噪声 ε 和 ᾱ；期望是原来的字母 x₀'),
    test: S.obj({ letter: LETTER, seed: S.int(), ab: num }),
    make: ({ letter: name, seed, ab }) => ({ inputs: { xt: addNoiseStep(letter(name), noiseImage(seed), ab), eps: noiseImage(seed), ab: image(1, 1, ab) }, expected: { out: letter(name) } }),
  },
  oldPhoto: {
    about: t('一张旧照片：一个字母在 ᾱ 下加了噪，噪声不知道；期望是还原的照片和字的笔画'),
    setup: S.obj({ ab: num }),
    test: S.obj({ letter: LETTER, dx: S.int(), dy: S.int(), seed: S.int() }),
    make: ({ letter: name, dx, dy, seed }, { ab }) => {
      const x0 = letter(name, dx, dy)
      return { inputs: { xt: addNoiseStep(x0, noiseImage(seed), ab), ab: image(1, 1, ab) }, expected: { x0, ink: fromFn(16, 16, (x, y) => (x0.data[y * 16 + x] > 0.5 ? 1 : 0)) } }
    },
  },
}
