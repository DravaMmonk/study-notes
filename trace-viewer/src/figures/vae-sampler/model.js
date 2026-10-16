// Pure model for the VAE sampler: a Galton board for ε, the reparameterisation z = μ + σ·ε,
// the KL term against the prior N(0, 1), and a one-number decoder that turns z into a plate shape.

export const ROWS = 7 // pin rows, so ε takes ROWS + 1 values
export const BINS = ROWS + 1
// Each row adds ±½; the sum has variance ROWS / 4, so this step gives Var(ε) = 1 exactly.
export const STEP = 1 / Math.sqrt(ROWS / 4)
export const epsOf = (bin) => (bin - ROWS / 2) * STEP
export const edgeEps = (edge) => (edge - BINS / 2) * STEP // edges 0..BINS between the bins

const choose = (n, r) => {
  let value = 1
  for (let i = 1; i <= r; i++) value = (value * (n - r + i)) / i
  return value
}
export const WEIGHTS = Array.from({ length: BINS }, (_, bin) => choose(ROWS, bin) / 2 ** ROWS)

export const MU = [-1.3, 1.3]
export const SIGMA = [0.4, 1.1]

// What the encoder outputs for each input plate. The plate itself is decode(μ).
export const INPUTS = {
  diamond: { name: '菱形', nameEn: 'Diamond', mu: -1.1, sigma: 0.45 },
  circle: { name: '圆', nameEn: 'Circle', mu: 0.1, sigma: 0.5 },
  square: { name: '方', nameEn: 'Square', mu: 1.25, sigma: 0.42 },
}
export const PRIOR = { mu: 0, sigma: 1 }

export const sampleOf = (mu, sigma, bin) => mu + sigma * epsOf(bin)

// KL( N(μ, σ²) ‖ N(0, 1) ) in nats.
export const kl = (mu, sigma) => 0.5 * (mu * mu + sigma * sigma - 1 - Math.log(sigma * sigma))

// The decoder: z sets the exponent of a superellipse |x|ⁿ + |y|ⁿ = 1, so z ≈ −1 is a diamond,
// z = 0 a circle and z ≈ 1.3 a rounded square.
export const exponent = (z) => 2 * 2 ** (z / 1.1)
export function radius(theta, z) {
  const n = exponent(z)
  return (Math.abs(Math.cos(theta)) ** n + Math.abs(Math.sin(theta)) ** n) ** (-1 / n)
}
export function shapeRing(z, cx, cy, size, steps = 72) {
  return Array.from({ length: steps }, (_, index) => {
    const theta = (index / steps) * Math.PI * 2 + Math.PI / 4
    const r = radius(theta, z) * size
    return [cx + Math.cos(theta) * r, cy + Math.sin(theta) * r]
  })
}

// Squared radius error between two plates, averaged round the outline (plate radius = 1).
const ANGLES = Array.from({ length: 96 }, (_, index) => (index / 96) * Math.PI * 2)
const plateError = (a, b) => ANGLES.reduce((sum, theta) => sum + (radius(theta, a) - radius(theta, b)) ** 2, 0) / ANGLES.length

// Reconstruction term E_q[‖x̂ − x‖²], exact over the board's eight values of ε.
export const reconstruction = (mu, sigma, target = mu) =>
  WEIGHTS.reduce((sum, weight, bin) => sum + weight * plateError(sampleOf(mu, sigma, bin), target), 0)

// A seeded run: each ball's seven left/right bounces and the bin it ends in.
function random(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const RUN = 20
export function balls(seed, count = RUN) {
  const next = random(seed)
  return Array.from({ length: count }, () => {
    const turns = Array.from({ length: ROWS }, () => (next() < 0.5 ? 0 : 1))
    return { turns, bin: turns.reduce((sum, turn) => sum + turn, 0) }
  })
}

export const format = (value, digits = 2) => (Math.abs(value) < 0.005 ? (0).toFixed(digits) : value.toFixed(digits)).replace('-', '−')
