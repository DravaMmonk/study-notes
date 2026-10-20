// The GAN duel bench (GanDuel.jsx): a two-pen generator against a discriminator, played in turns whose rhythm the
// player sets (how many steps each side takes, and the generator's rate).
// Real data: two humps at ±mode (σ = width), n samples each at fixed quantiles. The generator G has two pens; each
// draws half the samples as μ_k + width·q. The discriminator is D(x) = sigmoid(w₀ + w₁u + w₂u²)
// with u = x/2. D climbs log D(real) + log(1 − D(fake)); G climbs log D(fake) (the non-saturating form).
/**
 * The bench's model. n samples per hump at ±mode with spread `width`; rateD: the discriminator's step; start: the
 * two pens' starting places; win: turns in a row that must look real; options: the rhythm's choices ({ dSteps,
 * gSteps, gRate }); fallback: the rhythm the bench starts on; good: a rhythm that wins.
 */
export function ganBench({ n: N, mode: MODE, width: WIDTH, rateD: LR_D, start: START, win: WIN, options: OPTIONS, fallback, good: GOOD }) {
  const erfinv = (x) => {
    const a = 0.147
    const ln = Math.log(1 - x * x)
    const s = 2 / (Math.PI * a) + ln / 2
    return Math.sign(x) * Math.sqrt(Math.sqrt(s * s - ln / a) - s)
  }
  const QUANTILES = Array.from({ length: N }, (_, i) => Math.SQRT2 * erfinv(2 * ((i + 0.5) / N) - 1))
  const REAL = [...QUANTILES.map((q) => -MODE + WIDTH * q), ...QUANTILES.map((q) => MODE + WIDTH * q)]
  const sigmoid = (s) => 1 / (1 + Math.exp(-s))
  const features = (x) => [1, x / 2, (x / 2) ** 2]
  const logit = (w, x) => w[0] + (w[1] * x) / 2 + (w[2] * x * x) / 4
  const slope = (w, x) => w[1] / 2 + (w[2] * x) / 2
  const fakes = (pens) => pens.flatMap((m) => QUANTILES.map((q) => m + WIDTH * q))
  const D = (w, x) => sigmoid(logit(w, x))

  const stepD = (w, pens) => {
    const grad = [0, 0, 0]
    const all = REAL.length
    for (const x of REAL) {
      const p = D(w, x)
      features(x).forEach((f, i) => (grad[i] += ((1 - p) * f) / all))
    }
    for (const x of fakes(pens)) {
      const p = D(w, x)
      features(x).forEach((f, i) => (grad[i] -= (p * f) / all))
    }
    return w.map((v, i) => v + LR_D * grad[i])
  }
  const stepG = (pens, w, rate) =>
    pens.map((m) => {
      let g = 0
      for (const q of QUANTILES) {
        const x = m + WIDTH * q
        g += ((1 - D(w, x)) * slope(w, x)) / N
      }
      return m + rate * g
    })

  const near = (xs, m) => xs.filter((x) => Math.abs(x - m) < 0.8).length / xs.length
  const measure = (state) => {
    const xs = fakes(state.pens)
    const accuracy = (REAL.reduce((s, x) => s + D(state.w, x), 0) + xs.reduce((s, x) => s + 1 - D(state.w, x), 0)) / (REAL.length + xs.length)
    return { left: near(xs, -MODE), right: near(xs, MODE), accuracy }
  }
  const good = (m) => m.left >= 0.4 && m.right >= 0.4 && Math.abs(m.accuracy - 0.5) <= 0.05

  const start = () => ({ pens: [...START], w: [0, 0, 0], turn: 0, streak: 0, history: [[...START]] })
  // One turn: D trains dSteps, then G trains gSteps at rate gRate.
  const turn = (state, { dSteps, gSteps, gRate }) => {
    let { w, pens } = state
    for (let i = 0; i < dSteps; i++) w = stepD(w, pens)
    for (let i = 0; i < gSteps; i++) pens = stepG(pens, w, gRate)
    const next = { ...state, w, pens, turn: state.turn + 1, history: [...state.history, pens].slice(-120) }
    next.streak = good(measure(next)) ? state.streak + 1 : 0
    return next
  }

  const histogram = (xs, bins = 32, lo = -4, hi = 4) => {
    const h = Array(bins).fill(0)
    for (const x of xs) {
      const k = Math.floor(((x - lo) / (hi - lo)) * bins)
      if (k >= 0 && k < bins) h[k] += 1 / xs.length
    }
    return h
  }

  return { REAL, MODE, WIN, OPTIONS, D, fakes, start, turn, measure, histogram, DEFAULT: fallback, GOOD }
}
