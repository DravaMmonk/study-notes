import { fromFn, image } from './image.js'

// The discrete Fourier transform of a small real image, done as a 1-D DFT along every row and then
// every column (the 2-D DFT is separable). Images here are at most 32×32, so the direct O(N) sum per
// coefficient is fast enough and keeps the maths visible.
//   F(u, v) = Σx Σy f(x, y) · e^(−2πi(ux/W + vy/H))
// A spectrum is { w, h, re, im } with frequency (u, v) stored at index v·w + u, u = 0…w−1.

const TWIDDLES = new Map()
const twiddles = (n) => {
  if (!TWIDDLES.has(n)) TWIDDLES.set(n, Array.from({ length: n }, (_, j) => [Math.cos((2 * Math.PI * j) / n), Math.sin((2 * Math.PI * j) / n)]))
  return TWIDDLES.get(n)
}

function dft1(re, im, inverse) {
  const n = re.length
  const outRe = new Float64Array(n)
  const outIm = new Float64Array(n)
  const sign = inverse ? 1 : -1
  const table = twiddles(n)
  for (let k = 0; k < n; k++) {
    let sr = 0
    let si = 0
    for (let x = 0; x < n; x++) {
      // e^(±2πi·kx/n), read from a table indexed by kx mod n.
      const [c, sin] = table[(k * x) % n]
      const s = sign * sin
      sr += re[x] * c - im[x] * s
      si += re[x] * s + im[x] * c
    }
    outRe[k] = inverse ? sr / n : sr
    outIm[k] = inverse ? si / n : si
  }
  return [outRe, outIm]
}

function transform(w, h, re, im, inverse) {
  const outRe = Float64Array.from(re)
  const outIm = Float64Array.from(im)
  for (let y = 0; y < h; y++) {
    const [r, i] = dft1(outRe.subarray(y * w, y * w + w), outIm.subarray(y * w, y * w + w), inverse)
    outRe.set(r, y * w)
    outIm.set(i, y * w)
  }
  for (let x = 0; x < w; x++) {
    const colRe = new Float64Array(h)
    const colIm = new Float64Array(h)
    for (let y = 0; y < h; y++) {
      colRe[y] = outRe[y * w + x]
      colIm[y] = outIm[y * w + x]
    }
    const [r, i] = dft1(colRe, colIm, inverse)
    for (let y = 0; y < h; y++) {
      outRe[y * w + x] = r[y]
      outIm[y * w + x] = i[y]
    }
  }
  return { w, h, re: outRe, im: outIm }
}

export const dft2 = (img) => transform(img.w, img.h, img.data, new Float64Array(img.data.length), false)

// Back to a real image. Imaginary parts left over are rounding error when the spectrum came from a
// real image and was multiplied by a symmetric mask.
export function idft2(spectrum) {
  const { re } = transform(spectrum.w, spectrum.h, spectrum.re, spectrum.im, true)
  const out = image(spectrum.w, spectrum.h)
  out.data.set(re)
  return out
}

// Signed frequency of index k on an axis of n samples: 0, 1, …, n/2, then −(n/2 − 1) … −1.
export const signedFrequency = (k, n) => (k <= n / 2 ? k : k - n)

// Distance of coefficient (u, v) from zero frequency, in cycles per image.
export const radiusOf = (u, v, w, h) => Math.hypot(signedFrequency(u, w), signedFrequency(v, h))

// Low-pass transfer functions H(r): the hard disk keeps r ≤ R and drops the rest; the Gaussian falls
// off smoothly, H = exp(−r² / 2R²). A Gaussian of R here is the transform of a spatial Gaussian blur
// with σ = N / (2πR) pixels (convolution theorem).
export const MASKS = {
  disk: (r, R) => (r <= R + 1e-9 ? 1 : 0),
  gauss: (r, R) => Math.exp(-(r * r) / (2 * R * R)),
}

export function maskSpectrum(spectrum, H) {
  const { w, h } = spectrum
  const re = Float64Array.from(spectrum.re)
  const im = Float64Array.from(spectrum.im)
  for (let v = 0; v < h; v++) {
    for (let u = 0; u < w; u++) {
      const g = H(radiusOf(u, v, w, h), u, v)
      re[v * w + u] *= g
      im[v * w + u] *= g
    }
  }
  return { w, h, re, im }
}

// Filter an image by a gain picture laid out like the spectrum view: the gain for frequency (u, v) sits at pixel
// ((u + w/2) mod w, (v + h/2) mod h), so the centre is (0, 0). A gain symmetric about the centre keeps the image real.
export function applyGain(img, gain) {
  const { w, h } = img
  return idft2(maskSpectrum(dft2(img), (r, u, v) => gain.data[((v + h / 2) % h) * w + ((u + w / 2) % w)]))
}

// Filter an image by multiplying its spectrum with a low-pass mask and transforming back.
export function lowpass(img, shape = 'gauss', R = 4) {
  const H = MASKS[shape] ?? MASKS.gauss
  return idft2(maskSpectrum(dft2(img), (r) => H(r, Math.max(1e-6, R))))
}

export const highpass = (img, shape, R) => {
  const low = lowpass(img, shape, R)
  return fromFn(img.w, img.h, (x, y) => img.data[y * img.w + x] - low.data[y * img.w + x])
}

// The picture people mean by "the spectrum": magnitude |F|, zero frequency moved to the centre
// (pixel (w/2, h/2)), log-scaled as log(1 + |F|) and divided by its maximum so it reads 0…1.
// With `dc: false` the zero-frequency term (the average brightness) is left out of the scaling and
// drawn at its own capped value, so a bright average does not wash out everything else.
export function magnitudeSpectrum(img, { dc = true } = {}) {
  const F = dft2(img)
  const { w, h } = F
  const log = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) log[i] = Math.log1p(Math.hypot(F.re[i], F.im[i]))
  let max = 1e-9
  for (let i = 1; i < w * h; i++) max = Math.max(max, log[i])
  if (dc) max = Math.max(max, log[0])
  return fromFn(w, h, (x, y) => {
    const u = (x + w / 2) % w
    const v = (y + h / 2) % h
    return Math.min(1, log[v * w + u] / max)
  })
}

// Mean absolute difference, for telling two pictures apart.
export function meanAbsDiff(a, b) {
  let sum = 0
  for (let i = 0; i < a.data.length; i++) sum += Math.abs(a.data[i] - b.data[i])
  return sum / a.data.length
}
