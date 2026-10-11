// Pure model for the harmonic synthesiser: a square wave of amplitude 1 is Σ (4/πk)·sin kt over odd k.
// Eight wheels carry k = 1, 3, …, 15. A filter is a gain H(k) on each wheel: a hard low-pass keeps the
// first n wheels, a Gaussian low-pass tapers them smoothly, and a high-pass is 1 − the low-pass.

export const WHEELS = 8
export const ORDERS = Array.from({ length: WHEELS }, (_, index) => 2 * index + 1)
export const coefficient = (k) => 4 / (Math.PI * k)

// Gaussian width in k chosen so its half-height falls just past the n-th wheel.
export const sigmaOf = (n) => 1.2 * n

export function gains({ n, shape, pass }) {
  return ORDERS.map((k, index) => {
    const low = shape === 'gauss' ? Math.exp(-0.5 * (k / sigmaOf(n)) ** 2) : index < n ? 1 : 0
    return pass === 'high' ? 1 - low : low
  })
}

// The pen: the sum of every wheel's term at phase t.
export const sum = (t, weights) => ORDERS.reduce((total, k, index) => total + weights[index] * coefficient(k) * Math.sin(k * t), 0)

// Overshoot past the square wave's level, as a share of the jump (2): Gibbs' ~9% for a hard cut.
export function overshoot(weights) {
  let peak = -Infinity
  for (let step = 1; step < 720; step++) peak = Math.max(peak, sum((step / 720) * Math.PI, weights))
  return (peak - 1) / 2
}
