// Pure model for the GAN inspection bench: 1-D data with two modes, a generator made of two nozzles
// (each drops N(m, s²) with s fixed), and a discriminator D(x) = sigmoid(b + Σ w_j·φ_j(x)) on nine
// bumps. Training alternates exactly as in the minimax game, with expected gradients on a grid, so
// every run is deterministic.

export const MODES = [-1.5, 1.5]
export const DATA_SD = 0.35
export const NOZZLE_SD = 0.35
export const RANGE = [-3.25, 3.25]
export const BIN = 0.5
export const BINS = Math.round((RANGE[1] - RANGE[0]) / BIN)
export const CENTRES = Array.from({ length: 9 }, (_, j) => -3 + 0.75 * j)
const WIDTH = 0.8
const LR_D = 1.5
const D_STEPS = 2
const DECAY = 0.03
const LR_G = 1.6

const GRID = Array.from({ length: 145 }, (_, i) => -3.6 + (7.2 * i) / 144)
const DX = 7.2 / 144
const gauss = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI))
const bump = (x, j) => Math.exp(-((x - CENTRES[j]) ** 2) / (2 * WIDTH * WIDTH))
const sigmoid = (t) => 1 / (1 + Math.exp(-t))

export const pData = (x) => 0.5 * gauss(x, MODES[0], DATA_SD) + 0.5 * gauss(x, MODES[1], DATA_SD)
export const pGen = (g, x) => 0.5 * gauss(x, g.m[0], NOZZLE_SD) + 0.5 * gauss(x, g.m[1], NOZZLE_SD)
const logit = (d, x) => d.w.reduce((sum, w, j) => sum + w * bump(x, j), d.b)
const slope = (d, x) => d.w.reduce((sum, w, j) => sum + w * bump(x, j) * (-(x - CENTRES[j]) / (WIDTH * WIDTH)), 0)
export const D = (d, x) => sigmoid(logit(d, x))

// Twelve evenly spaced quantiles of N(0, 1): a deterministic batch from each nozzle or each mode.
const Z = Array.from({ length: 12 }, (_, i) => {
  // Inverse normal CDF by bisection on erf, good to 1e-6.
  const p = (i + 0.5) / 12
  let lo = -4
  let hi = 4
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2
    if (0.5 * (1 + erf(mid / Math.SQRT2)) < p) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
})
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return x >= 0 ? y : -y
}

export const REAL = MODES.flatMap((m) => Z.map((z) => m + DATA_SD * z))
export const fakes = (g) => g.m.flatMap((m) => Z.map((z) => m + NOZZLE_SD * z))
export const binOf = (x) => Math.max(0, Math.min(BINS - 1, Math.floor((x - RANGE[0]) / BIN)))
export const binCentre = (bin) => RANGE[0] + (bin + 0.5) * BIN
export const counts = (samples) => samples.reduce((list, x) => (list[binOf(x)]++, list), Array(BINS).fill(0))

// One training step: D climbs V(D, G) with G fixed, then G climbs E[log D(G(z))] with D fixed
// (the non-saturating form the lecture's G update uses in practice).
export function train(state) {
  const d = { b: state.d.b, w: [...state.d.w] }
  const pg = GRID.map((x) => pGen(state.g, x))
  for (let k = 0; k < D_STEPS; k++) {
    let gb = 0
    const gw = Array(d.w.length).fill(0)
    GRID.forEach((x, i) => {
      const value = D(d, x)
      const r = (pData(x) * (1 - value) - pg[i] * value) * DX
      gb += r
      for (let j = 0; j < d.w.length; j++) gw[j] += r * bump(x, j)
    })
    d.b += LR_D * gb
    d.w = d.w.map((w, j) => w + LR_D * (gw[j] - DECAY * w))
  }
  const m = state.g.m.map((mean) => {
    const grad = Z.reduce((sum, z) => {
      const x = mean + NOZZLE_SD * z
      return sum + (1 - D(d, x)) * slope(d, x)
    }, 0) / Z.length
    return Math.max(-3, Math.min(3, mean + LR_G * grad))
  })
  return { step: state.step + 1, d, g: { m } }
}

// D's accuracy if it calls x "real" with probability D(x): ½·E_data[D] + ½·E_G[1 − D].
// It is ½ exactly when D(x) = ½ everywhere, the point where D can no longer tell them apart.
export function accuracy(state) {
  let score = 0
  GRID.forEach((x) => {
    const value = D(state.d, x)
    score += 0.5 * (pData(x) * value + pGen(state.g, x) * (1 - value)) * DX
  })
  return score
}

// V(D, G) = E_data[log D(x)] + E_z[log(1 − D(G(z)))]; at the equilibrium it is log ¼ ≈ −1.39.
export function value(state) {
  let v = 0
  GRID.forEach((x) => {
    const p = D(state.d, x)
    v += (pData(x) * Math.log(p) + pGen(state.g, x) * Math.log(1 - p)) * DX
  })
  return v
}

// Mean D on each batch, as the bench's two sorting trays would report it.
export const meanD = (state, samples) => samples.reduce((sum, x) => sum + D(state.d, x), 0) / samples.length

// Two starts. Apart, the nozzles split and cover both modes. Started on the same spot, they get the
// same gradient every step, so they never separate: all fakes pile on one mode while D chases them.
export const SEEDS = {
  balanced: { name: '分开起步', m: [-0.35, 0.45] },
  collapse: { name: '同点起步', m: [1.2, 1.2] },
}
export const STEPS = 48
export function trajectory(seed) {
  const states = [{ step: 0, d: { b: 0, w: Array(CENTRES.length).fill(0) }, g: { m: [...SEEDS[seed].m] } }]
  while (states.length <= STEPS) states.push(train(states[states.length - 1]))
  return states
}
