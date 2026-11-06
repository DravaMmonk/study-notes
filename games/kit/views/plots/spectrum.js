// A grey grid's spectrum, for the view `spectrum` (Spectrum.jsx): the strength of each frequency it holds, zero frequency
// in the middle — along a row (or each of two), each frequency's amplitude |F| / n; across a picture, log(1 + |F|)
// scaled by the largest but the mean's, so faint waves still show.

const CACHE = new WeakMap()

/** A grid's discrete Fourier transform, along its rows, then (a picture) its columns: { re, im }. */
function transform(g) {
  const { w, h } = g
  const re = Float64Array.from(g.data)
  const im = new Float64Array(w * h)
  // One 1-D transform of n samples on each of `count` lines, sample k of line l at index(l, k).
  const pass = (n, count, index) => {
    const r = new Float64Array(n)
    const i = new Float64Array(n)
    for (let l = 0; l < count; l++) {
      for (let f = 0; f < n; f++) {
        let sr = 0
        let si = 0
        for (let k = 0; k < n; k++) {
          const a = (-2 * Math.PI * f * k) / n
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
  pass(w, h, (y, x) => y * w + x)
  if (h > 2) pass(h, w, (x, y) => y * w + x)
  return { re, im }
}

/** The spectrum as a grid: each cell the strength of the frequency it stands for, frequency 0 at (⌊w/2⌋, ⌊h/2⌋). */
export function spectrumOf(g) {
  if (CACHE.has(g)) return CACHE.get(g)
  const { w, h } = g
  const { re, im } = transform(g)
  const rows = h <= 2
  const strength = Float64Array.from(re, (r, k) => (rows ? Math.hypot(r, im[k]) / w : Math.log1p(Math.hypot(r, im[k]))))
  const cy = rows ? 0 : Math.floor(h / 2)
  const index = (x, y) => ((y - cy + h) % h) * w + ((x - Math.floor(w / 2) + w) % w)
  let data = Float64Array.from({ length: w * h }, (_, k) => strength[index(k % w, Math.floor(k / w))])
  if (!rows) {
    const peak = Math.max(1e-9, ...data.filter((_, k) => k !== cy * w + Math.floor(w / 2)))
    data = data.map((v) => Math.min(1, v / peak))
  }
  const out = { w, h, c: 1, data }
  CACHE.set(g, out)
  return out
}
