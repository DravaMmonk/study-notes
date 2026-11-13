// The GAN duel bench: a two-pen generator against a discriminator, played in turns whose rhythm the player sets (how
// many steps each side takes, and the generator's rate).
// Real data: two humps at ±mode (σ = width), n samples each at fixed quantiles. The generator G has two pens; each
// draws half the samples as μ_k + width·q. The discriminator is D(x) = sigmoid(w₀ + w₁u + w₂u²)
// with u = x/2. D climbs log D(real) + log(1 − D(fake)); G climbs log D(fake) (the non-saturating form).
import { S } from '../../../engine/schema.js'
import { judge, limitOf, startValues } from '../../../engine/bench.js'
import { T as t } from '../../../shell/i18n.js'

const num = S.num()

/**
 * The duel. n samples per hump at ±mode with spread `width`; rateD: the discriminator's step; start: the two pens'
 * starting places; good(measure): whether a turn looks real, counted into the streak.
 */
export function ganBench({ n: N, mode: MODE, width: WIDTH, rateD: LR_D, start: START, good }) {
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

  return { REAL, MODE, D, fakes, start, turn, measure, histogram }
}

/** The bench model: knobs dSteps, gSteps, gRate (the rhythm); act turn and reset; streak counts turns the rest held. */
export const gan = {
  about: t('骗过鉴定员：两支笔的生成器对一个鉴定员，按旋钮 dSteps、gSteps、gRate 定的节奏轮流训练；算出 left、right（两堆各占多少）、accuracy、streak（其余目标连续达到的回合数）'),
  setup: S.obj({
    n: S.int({ min: 1 }), mode: num, width: num, rateD: num, start: S.list(num, { min: 2 }),
    good: S.obj({ dSteps: S.int(), gSteps: S.int(), gRate: num }, { about: t('一个能过关的节奏') }),
  }),
  make({ good: rhythm, ...p }, bench) {
    const rest = bench.goal.filter((l) => l.of !== 'streak')
    const m = ganBench({ ...p, good: (measure) => judge(rest, measure).pass })
    return {
      ...m,
      win: limitOf(bench.goal, 'streak').atLeast,
      rhythm,
      act: (state, name, v) => (name === 'reset' ? m.start() : m.turn(state, v)),
      view(v, { process: state, running }) {
        const measure = m.measure(state)
        const merged = Math.abs(state.pens[0] - state.pens[1]) < 0.01
        return {
          ...measure,
          streak: state.streak,
          state,
          round: t(`第 ${state.turn} 回合`, `Round ${state.turn}`),
          labels: running ? { turn10: t(`还剩 ${running} 回合`, `${running} ${running === 1 ? 'round' : 'rounds'} left`) } : {},
          say: merged && state.turn > 0
            ? { tone: 'fail', text: t('两支笔已经重合，无法再分开：模式坍塌。') }
            : { text: t('笔 1 和笔 2 各生成一半样本；竖线标出它们当前的位置。') },
        }
      },
    }
  },
  verify(m, bench) {
    const play = (schedule, turns) => {
      let s = m.start()
      let collapsed = false
      for (let i = 0; i < turns; i++) {
        s = m.turn(s, schedule)
        const r = m.measure(s)
        if (r.left > 0.9 || r.right > 0.9) collapsed = true
        if (s.streak >= m.win) return { won: i + 1, collapsed, s }
      }
      return { won: 0, collapsed, s }
    }
    const naive = play(startValues(bench), 300)
    if (naive.won) return `默认节奏第 ${naive.won} 回合就过关了`
    if (!naive.collapsed) return '默认节奏没有出现模式坍塌'
    const good = play(m.rhythm, 60)
    if (!good.won) return '推荐节奏 60 回合内没有过关'
    const r = m.measure(good.s)
    if (Math.abs(r.accuracy - 0.5) > 0.05) return '过关时鉴定员准确率不在 0.5 附近'
    return ''
  },
}
