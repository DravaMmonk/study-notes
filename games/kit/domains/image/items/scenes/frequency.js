// Scenes of frequency (scenes/index.js): a waveform made of a few waves, read for one of them; a photo under fine
// grain, the photo gently blurred expected.
import { S } from '../../../../engine/schema.js'
import { correlate, fromFn, gaussianKernel, image, map, random, zip } from '../../engine/image.js'
import { highpass } from '../../engine/fourier.js'
import { picture } from '../pictures.js'
import { T as t } from '../../../../shell/i18n.js'

const N = 32
const TAU = 2 * Math.PI

// A row of N points: A·cos(2π·k·x/N + phase°).
const wave = (k, A, phase = 0) => fromFn(N, 1, (x) => A * Math.cos((TAU * k * x) / N + (phase * Math.PI) / 180))
// Fine-grained noise: random values with everything below 10 cycles per image removed, std 0.07.
const fineNoise = (seed, std = 0.07) => {
  const next = random(seed)
  const raw = highpass(fromFn(N, N, () => next() - 0.5), 'disk', 10)
  const rms = Math.sqrt(raw.data.reduce((sum, v) => sum + v * v, 0) / raw.data.length)
  return map(raw, (v) => (v * std) / rms)
}

export const FREQUENCY = {
  waveform: {
    about: t('一条 32 个点的波形：平均亮度 c 加几道波；期望是频率 k 那道波的振幅（没有就是 0）', 'a waveform of 32 points, an average c plus a few waves; the amplitude of the wave of frequency k (0 if there is none) is expected'),
    setup: S.obj({ k: S.int({ min: 0 }) }),
    test: S.obj({ c: S.num(), waves: S.list(S.obj({ k: S.int({ min: 0 }), A: S.num(), phase: S.opt(S.num({ about: t('错开多少度', 'how many degrees it is shifted') })) })) }),
    make: ({ c, waves }, { k }) => ({
      inputs: { in: [image(N, 1, c), ...waves.map((w) => wave(w.k, w.A, w.phase))].reduce((a, b) => zip(a, b, (p, q) => p + q)) },
      expected: { out: image(1, 1, waves.find((w) => w.k === k)?.A ?? 0) },
    }),
  },
  grainy: {
    about: t('蒙着细颗粒的照片（32 × 32，低于 10 周的成分都去掉的噪声）；期望是照片轻轻模糊（σ = 1，复制边缘）', 'a photo under fine grain (32 × 32, noise with everything below 10 cycles removed); the photo gently blurred (σ = 1, the edge replicated) is expected'),
    test: S.obj({ photo: S.call('picture'), seed: S.int() }),
    make: ({ photo, seed }) => {
      const img = picture(photo)
      return { inputs: { in: zip(img, fineNoise(seed), (p, q) => p + q) }, expected: { out: correlate(img, gaussianKernel(1), 'edge') } }
    },
  },
}
