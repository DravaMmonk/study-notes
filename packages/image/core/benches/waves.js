// The wave benches of 视觉完备 chapter 2, on rows of N points: one wave tuned by its four numbers (wave), sine waves
// stacked up (sum), a probe that multiplies the row by a wave and averages (probe), and sampling (alias). Each is a
// bench model (image/core/bench.js): what it computes from the knobs, for the bench's displays and its goal.
import { S } from 'kernel'
import { benchRun, openKnobs, startValues } from '../bench.js'
import { piText } from '../engine/pi.js'
import { cosine, maxDiff, sampleAt } from '../engine/waves.js'
import { T as t } from 'kernel'

const num = S.num()

/* ---------- 一道波: c + A·cos(2π·k·x/N + φ·π/4) ---------- */

const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2))
const phaseText = (q) => (q === 0 ? '0' : piText((q * Math.PI) / 4))

export const wave = {
  about: t('一道波：c + A·cos(2π·k·x/N + φ·π/4)，旋钮 c、A、k、phi；每一步把它调到和目标重合'),
  setup: S.obj({ N: S.int({ min: 2 }) }),
  stage: S.obj({ target: S.map(num) }),
  make({ N }) {
    const curve = (p) => cosine({ ...p, phase: p.phi * 45 })
    return {
      view(v, { stage, open }) {
        const mark = (knob, text) => (open.includes(knob) ? { b: text } : text)
        const phase = phaseText(v.phi)
        const yours = curve(v)
        const target = curve(stage.target)
        const row = sampleAt(yours, N)
        const targetRow = sampleAt(target, N)
        return {
          gap: maxDiff(row, targetRow),
          yours, target, row, targetRow,
          formula: [mark('c', fmt(v.c)), ' + ', mark('A', fmt(v.A)), '·cos(2π·', mark('k', String(v.k)), `·x/${N}${v.phi < 0 ? ' − ' : ' + '}`, mark('phi', v.phi < 0 ? phase.replace('−', '') : phase), ')'],
        }
      },
    }
  },
  verify(model, bench) {
    for (const [i, s] of bench.stages.entries()) {
      const start = startValues(bench, s)
      if (benchRun(bench, model, start, { stageIndex: i }).pass) return `第 ${i + 1} 步一开始就算完成`
      for (const [knob, { min, max, step }] of Object.entries(bench.knobs)) {
        for (const v of [start[knob], s.target[knob]]) {
          if (v < min || v > max || Math.abs(min + Math.round((v - min) / step) * step - v) > 1e-9) return `第 ${i + 1} 步的 ${knob} = ${v} 不在刻度上`
        }
        if (!openKnobs(bench, s).includes(knob) && start[knob] !== s.target[knob]) return `第 ${i + 1} 步的 ${knob} 不能转，却和目标不同`
      }
    }
    return ''
  },
}

