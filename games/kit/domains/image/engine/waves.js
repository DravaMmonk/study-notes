// One-dimensional signals for chapter 2's wave boards. A signal is a plain array of samples taken
// across one image width; position u runs from 0 to 1 over that width, so a wave of frequency k
// goes through k whole cycles from one edge to the other.

const TAU = 2 * Math.PI

// c + A·cos(2πku + φ), φ in degrees.
export const cosine = ({ c = 0, A = 0, k = 0, phase = 0 }) => (u) => c + A * Math.cos(TAU * k * u + (phase * Math.PI) / 180)

// Sample a function of u at n evenly spaced points u = j/n.
export const sampleAt = (f, n) => Array.from({ length: n }, (_, j) => f(j / n))

// A sum of sines with amplitudes b[k] (k = 1, 2, …) on top of a constant c: the mixer's sound.
export const sineSum = (c, b) => (u) => b.reduce((sum, amp, k) => (k ? sum + amp * Math.sin(TAU * k * u) : sum), c)

// Discrete Fourier transform of real samples: X[m] = Σj x[j]·e^(−2πi·mj/n).
export function dft(x) {
  const n = x.length
  return Array.from({ length: n }, (_, m) => {
    let re = 0
    let im = 0
    for (let j = 0; j < n; j++) {
      re += x[j] * Math.cos((TAU * m * j) / n)
      im -= x[j] * Math.sin((TAU * m * j) / n)
    }
    return [re, im]
  })
}

// Back to samples. The imaginary part is dropped: spectra here come from real signals and are only
// ever scaled by gains that are the same for +m and −m.
export function idft(X) {
  const n = X.length
  return Array.from({ length: n }, (_, j) => {
    let sum = 0
    for (let m = 0; m < n; m++) sum += X[m][0] * Math.cos((TAU * m * j) / n) - X[m][1] * Math.sin((TAU * m * j) / n)
    return sum / n
  })
}

// Signed frequency of DFT bin m out of n: 0, 1, …, n/2, then −(n/2 − 1) … −1.
export const signed = (m, n) => (m <= n / 2 ? m : m - n)

// Amplitude of each frequency k = 0 … n/2 in a real signal: the A of the cosine A·cos(2πku + φ)
// it contains (and the plain average for k = 0).
export function amplitudes(x) {
  const n = x.length
  const X = dft(x)
  return Array.from({ length: Math.floor(n / 2) + 1 }, (_, k) => {
    const size = Math.hypot(...X[k]) / n
    return k === 0 || 2 * k === n ? size : 2 * size
  })
}

// Multiply frequency |k| by gains[|k|] and transform back: filtering by a gain curve.
export function applyGains(x, gains) {
  const n = x.length
  const X = dft(x).map(([re, im], m) => {
    const g = gains[Math.abs(signed(m, n))] ?? 0
    return [re * g, im * g]
  })
  return idft(X)
}

// The spatial kernel a gain curve stands for: the response to a single bright sample, centred.
// Filtering with the gains is the same as convolving with this kernel (the convolution theorem).
export function kernelOf(gains, n) {
  const impulse = Array.from({ length: n }, (_, j) => (j === 0 ? 1 : 0))
  const response = applyGains(impulse, gains)
  return Array.from({ length: n }, (_, j) => response[(j - n / 2 + n) % n])
}

// Circular Gaussian blur of samples, σ in samples: the spatial version of a Gaussian gain curve.
export function blur(x, sigma) {
  const n = x.length
  const weights = Array.from({ length: n }, (_, d) => {
    const t = Math.min(d, n - d)
    return Math.exp(-(t * t) / (2 * sigma * sigma))
  })
  const total = weights.reduce((a, b) => a + b, 0)
  return x.map((_, j) => x.reduce((sum, v, i) => sum + v * weights[(j - i + n) % n], 0) / total)
}

// The smoothest curve through n samples: keep only frequencies |k| ≤ n/2 (trigonometric
// interpolation). This is what a sampled signal "looks like" once the samples are all you have.
export function throughSamples(samples) {
  const n = samples.length
  const X = dft(samples)
  return (u) => {
    let sum = 0
    for (let m = 0; m < n; m++) {
      const k = signed(m, n)
      // The bin exactly at n/2 has no partner, so it can only be a cosine at that frequency.
      const share = 2 * k === n ? 0.5 : 1
      const angle = TAU * k * u
      sum += share * (X[m][0] * Math.cos(angle) - X[m][1] * Math.sin(angle))
      if (2 * k === n) sum += share * (X[m][0] * Math.cos(-angle) - X[m][1] * Math.sin(-angle))
    }
    return sum / n
  }
}

// The frequency a wave of frequency k seems to have once it is sampled n times: it folds back
// around multiples of n, landing between 0 and n/2.
export function aliasOf(k, n) {
  const f = ((k % n) + n) % n
  return Math.min(f, n - f)
}

export const rms = (a, b) => Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0) / a.length)
export const maxDiff = (a, b) => a.reduce((worst, v, i) => Math.max(worst, Math.abs(v - b[i])), 0)
