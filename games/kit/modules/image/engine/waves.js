// One-dimensional signals for the wave parts and benches. A signal is a plain array of samples taken
// across one image width; position u runs from 0 to 1 over that width, so a wave of frequency k
// goes through k whole cycles from one edge to the other.

import { dft1, signedFrequency } from './fourier.js'

const TAU = 2 * Math.PI

/** A unit wave with k cycles per width and phase in degrees. */
export function sinusoid(k, form = 'cos', phase = 0) {
  const trig = form === 'sin' ? Math.sin : Math.cos
  const rate = TAU * k
  const offset = (phase * Math.PI) / 180
  return (u) => trig(rate * u + offset)
}

// c + A·cos(2πku + φ), φ in degrees.
export function cosine({ c = 0, A = 0, k = 0, phase = 0 }) {
  const wave = sinusoid(k, 'cos', phase)
  return (u) => c + A * wave(u)
}

// Sample a function of u at n evenly spaced points u = j/n.
export const sampleAt = (f, n) => Array.from({ length: n }, (_, j) => f(j / n))

// The smoothest curve through n samples: keep only frequencies |k| ≤ n/2 (trigonometric
// interpolation). This is what a sampled signal "looks like" once the samples are all you have.
export function throughSamples(samples) {
  const n = samples.length
  const [re, im] = dft1(samples)
  return (u) => {
    let sum = 0
    for (let m = 0; m < n; m++) {
      const k = signedFrequency(m, n)
      // The bin exactly at n/2 has no partner, so it can only be a cosine at that frequency.
      const angle = TAU * k * u
      sum += re[m] * Math.cos(angle)
      if (2 * k !== n) sum -= im[m] * Math.sin(angle)
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

export const maxDiff = (a, b) => a.reduce((worst, v, i) => Math.max(worst, Math.abs(v - b[i])), 0)
