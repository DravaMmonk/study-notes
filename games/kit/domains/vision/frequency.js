// Frequency presets for a course that uses spectra rather than builds them: a grey image's centred amplitude
// spectrum, filtering by a centred gain map, each cell's frequency coordinates for making such maps, and taking every
// step-th sample. Courses that construct the transform from probes (expandRows, reduceRows) do not offer these.
//
// Convention: the forward transform F(u, v) = Σ I(x, y) e^{−2πi(ux/W + vy/H)} / (W·H); frequency 0 sits at
// (⌊W/2⌋, ⌊H/2⌋), u growing right and v down, so a cell's frequency is (x − ⌊W/2⌋, y − ⌊H/2⌋) cycles per image.
import { PartError } from '../../engine/circuit.js'
import { isImage, make } from './image.js'
import { T as t } from '../../shell/i18n.js'

const fail = (zh, en) => { throw new PartError(t(zh, en)) }
const greyOf = (v, what) => (isImage(v) && v.c === 1 ? v : fail(`${what}要一张灰度图`, `${what} needs a grey image`))

/** One 1-D discrete Fourier pass over `count` lines of n samples, in place; sign −1 forward, +1 inverse. */
function pass(re, im, n, count, index, sign) {
  const r = new Float64Array(n)
  const i = new Float64Array(n)
  for (let l = 0; l < count; l++) {
    for (let f = 0; f < n; f++) {
      let sr = 0
      let si = 0
      for (let k = 0; k < n; k++) {
        const a = (sign * 2 * Math.PI * f * k) / n
        const j = index(l, k)
        sr += re[j] * Math.cos(a) - im[j] * Math.sin(a)
        si += re[j] * Math.sin(a) + im[j] * Math.cos(a)
      }
      r[f] = sr
      i[f] = si
    }
    for (let k = 0; k < n; k++) {
      re[index(l, k)] = r[k]
      im[index(l, k)] = i[k]
    }
  }
}

/** The 2-D transform of { re, im } arrays of a w × h grid (unnormalised). */
function transform2(re, im, w, h, sign) {
  pass(re, im, w, h, (y, x) => y * w + x, sign)
  pass(re, im, h, w, (x, y) => y * w + x, sign)
}

/** Array index of the frequency drawn at centred cell (x, y). */
const unshift = (x, y, w, h) => (((y - Math.floor(h / 2)) % h + h) % h) * w + (((x - Math.floor(w / 2)) % w + w) % w)

/** A grey image's amplitude spectrum, frequency 0 in the centre: |F(u, v)| with the 1/(W·H) forward scale. */
export function spectrum(image) {
  const { w, h } = greyOf(image, '频谱')
  const re = Float64Array.from(image.data)
  const im = new Float64Array(w * h)
  transform2(re, im, w, h, -1)
  return make(w, h, 1, (x, y) => {
    const k = unshift(x, y, w, h)
    return Math.hypot(re[k], im[k]) / (w * h)
  })
}

/** The image with each frequency multiplied by the gain drawn at its centred cell; the real part of the result. */
export function frequencyFilter(image, gain) {
  const { w, h } = greyOf(image, '频域滤波的输入')
  greyOf(gain, '增益')
  if (gain.w !== w || gain.h !== h) fail(`增益图要和输入一样大（${w} × ${h}）`, `the gain map must match the input (${w} × ${h})`)
  const re = Float64Array.from(image.data)
  const im = new Float64Array(w * h)
  transform2(re, im, w, h, -1)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = unshift(x, y, w, h)
    re[k] *= gain.data[y * w + x]
    im[k] *= gain.data[y * w + x]
  }
  transform2(re, im, w, h, 1)
  return make(w, h, 1, (x, y) => re[y * w + x] / (w * h))
}

/** Each cell's frequency along one axis, in cycles per image, laid out like `spectrum`. */
export function frequencyAxis(image, axis) {
  const { w, h } = isImage(image) ? image : fail('频率坐标要一张图', 'frequency coordinates need an image')
  return make(w, h, 1, (x, y) => (axis === 'x' ? x - Math.floor(w / 2) : y - Math.floor(h / 2)))
}

/** Every step-th sample along both axes, from (0, 0); channels kept. */
export function subsample(image, step) {
  if (!isImage(image)) fail('隔点取样要一张图', 'subsampling needs an image')
  if (!Number.isInteger(step) || step < 1) fail(`间隔应当是正整数，得到 ${step}`, `the step should be a positive whole number, got ${step}`)
  const w = Math.ceil(image.w / step)
  const h = Math.ceil(image.h / step)
  return make(w, h, image.c, (x, y, ch) => image.data[((y * step) * image.w + x * step) * image.c + ch])
}
