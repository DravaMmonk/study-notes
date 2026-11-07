// One row of brightness as waves (games/DESIGN.md 6.8): a teaching model over n cells. Three modes, set by the setup:
//
//   wave      knobs k (cycles across the row), amp, phase (turns): the row 0.5 + amp·cos(2π(k·x/n + phase)), matched
//             against a target wave; reads `error`, the root-mean-square gap to the target
//   step      knobs a1, a3, a5, …: the odd sine harmonics 0.5 + Σ a_j·sin(2πjx/n) approaching a dark-to-light step;
//             reads `error` and `overshoot`, how far the sum rises past the step's top (the ripple beside an edge)
//   sampling  knobs k (stripe cycles across the row) and step (one sample every `step` cells): reads `perCycle`
//             (samples per stripe cycle), `seen` (the cycles the samples show, folded below half the sample count) and
//             `aliased` (1 when the samples show a frequency the stripes do not have)
//
// Every mode also gives `rows`, lines for the kernel's plot display, and `target`/`current` rows for its strips.
import { S } from '../../../engine/schema.js'
import { T as t } from '../../../shell/i18n.js'

const num = S.num()
const TAU = 2 * Math.PI

const waveAt = ({ k, amp, phase }) => (u) => 0.5 + amp * Math.cos(TAU * (k * u + phase))
const stepAt = (u) => (u < 0.5 ? 0.5 + 0.4 : 0.5 - 0.4)
const sineSum = (coeffs) => (u) => 0.5 + coeffs.reduce((sum, [j, a]) => sum + a * Math.sin(TAU * j * u), 0)

/** The root-mean-square gap between two rows sampled at n cell centres. */
const rms = (f, g, n) => Math.sqrt(Array.from({ length: n }, (_, x) => (f((x + 0.5) / n) - g((x + 0.5) / n)) ** 2).reduce((a, b) => a + b, 0) / n)
const cells = (f, n) => Array.from({ length: n }, (_, x) => f((x + 0.5) / n))

/** The frequency n samples of k cycles show: k folded into 0…n/2. */
export const seenCycles = (k, samples) => {
  const r = ((k % samples) + samples) % samples
  return Math.min(r, samples - r)
}

export function wavesView(setup, v) {
  const n = setup.n
  if (setup.mode === 'sampling') {
    const k = v.k ?? 1
    const step = v.step ?? 1
    const samples = Math.floor(n / step)
    const seen = seenCycles(k, samples)
    const stripe = waveAt({ k, amp: 0.45, phase: 0 })
    const held = (u) => stripe((Math.floor(Math.floor(u * n) / step) * step + 0.5) / n)
    return {
      k, step, perCycle: n / (k * step), seen, aliased: Math.abs(seen - k) > 1e-9 ? 1 : 0,
      rows: { lines: [{ curve: stripe, kind: 'target', label: t('条纹', 'Stripes') }, { curve: cells(held, n), kind: 'yours', label: t('采到的', 'Sampled'), steps: true }] },
      target: cells(stripe, n), current: cells(held, n),
    }
  }
  if (setup.mode === 'step') {
    const coeffs = setup.harmonics.map((j) => [j, v[`a${j}`] ?? 0])
    const sum = sineSum(coeffs)
    const top = Math.max(...Array.from({ length: 8 * n }, (_, x) => sum((x + 0.5) / (8 * n))))
    return {
      ...v, error: rms(sum, stepAt, n), overshoot: Math.max(0, top - 0.9),
      rows: { lines: [{ curve: stepAt, kind: 'target', label: t('台阶', 'Step') }, { curve: sum, kind: 'yours', label: t('几道波的和', 'Sum of waves') }] },
      target: cells(stepAt, n), current: cells(sum, n),
    }
  }
  const wave = waveAt({ k: v.k ?? 1, amp: v.amp ?? 0, phase: v.phase ?? 0 })
  const goal = waveAt(setup.target)
  return {
    ...v, error: rms(wave, goal, n),
    rows: { lines: [{ curve: goal, kind: 'target', label: t('目标', 'Target') }, { curve: wave, kind: 'yours', label: t('你的波', 'Your wave') }] },
    target: cells(goal, n), current: cells(wave, n),
  }
}

export const waves = {
  about: t('一行亮度看成波（教学模型）：wave 模式对齐一道目标波（旋钮 k、amp、phase，读数 error）；step 模式用奇次正弦逼近台阶（旋钮 a1、a3…，读数 error、overshoot）；sampling 模式隔 step 格采样 k 个周期的条纹（读数 perCycle、seen、aliased）',
    'a row of brightness as waves (a teaching model): wave mode matches a target wave (knobs k, amp, phase; reads error); step mode approaches a step with odd sines (knobs a1, a3…; reads error, overshoot); sampling mode samples k-cycle stripes every `step` cells (reads perCycle, seen, aliased)'),
  setup: S.obj({
    mode: S.oneOf(['wave', 'step', 'sampling']),
    n: S.int({ min: 8, max: 256, about: t('一行有几格', 'the cells in the row') }),
    target: S.opt(S.obj({ k: num, amp: num, phase: num }, { about: t('wave：目标波', 'wave: the target wave') })),
    harmonics: S.opt(S.list(S.int({ min: 1 }), { min: 1, about: t('step：用哪几次谐波（奇数）', 'step: which harmonics (odd)') })),
  }),
  make(setup) {
    return { setup, view: (v) => wavesView(setup, v) }
  },
  verify({ setup }) {
    if (setup.mode === 'wave' && !setup.target) return 'wave mode needs a target'
    if (setup.mode === 'step' && !setup.harmonics?.every((j) => j % 2 === 1)) return 'step mode needs odd harmonics'
    return ''
  },
}
