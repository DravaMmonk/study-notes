// The signal domain's engine resources (games/DESIGN.md 6.8): the computations a game's parts.json may call, each
// with what it is, its arguments (positional) and its named parameters, if any (a schema). A part's expression calls
// them on its inputs and settings; a resource handed what it cannot work on stops with why (a PartError). The kernel's
// builtins (../../engine/parts/builtins.js) come with every domain.
//
// Two kinds of value travel on the wires (values.js): a number and a wave (its samples in a row). A pure tone is a
// cosine that fits the window a whole number of times: `low` once, `mid` twice, `high` three times over SAMPLES
// samples. Tones that differ are orthogonal over the window, so how much of one a wave holds (`amount`) is read off
// without the others getting in the way: twice the mean of the wave times the tone, a tone times itself averaging ½.
import { PartError } from '../../engine/circuit.js'
import { S } from '../../engine/schema.js'
import { T as t } from '../../shell/i18n.js'
import { isWave, kindOf, wave } from './values.js'

/** How many samples a tone has. */
export const SAMPLES = 24

/** How many times each pitch swings over the window. */
export const PITCHES = { low: 1, mid: 2, high: 3 }

const args = (...names) => names.map((name) => ({ name }))
const PITCH = S.obj({ pitch: S.oneOf(Object.keys(PITCHES)) })

const number = (v) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new PartError(t(`这里要一个数，接进来的是${kindOf(v).zh}`, `this wants a number; it was given ${kindOf(v).en}`))
  return v
}
const samples = (v) => {
  if (!isWave(v)) throw new PartError(t(`这里要一个波形，接进来的是${kindOf(v).zh}`, `this wants a wave; it was given ${kindOf(v).en}`))
  return v.data
}
const paired = (a, b) => {
  const [x, y] = [samples(a), samples(b)]
  if (x.length !== y.length) throw new PartError(t(`两个波形不一样长（${x.length} 格和 ${y.length} 格），对不上格`, `the waves differ in length (${x.length} and ${y.length} samples), so their samples do not pair up`))
  return [x, y]
}

/** The samples of a pure tone, `count` of them. */
export const toneOf = (pitch, count = SAMPLES) => Array.from({ length: count }, (_, n) => Math.cos((2 * Math.PI * PITCHES[pitch] * n) / count))

const mean = (data) => data.reduce((sum, x) => sum + x, 0) / data.length

export const OPS = {
  tone: {
    about: t('一个纯音的波形：在整段里来回 1 次（low）、2 次（mid）或 3 次（high）'),
    args: [],
    params: PITCH,
    run: (_, { pitch }) => wave(toneOf(pitch)),
  },
  mix: {
    about: t('两个一样长的波形逐格相加'),
    args: args('a', 'b'),
    symmetric: true,
    run: ([a, b]) => {
      const [x, y] = paired(a, b)
      return wave(x.map((v, k) => v + y[k]))
    },
  },
  scale: {
    about: t('数 k 乘波形的每一格'),
    args: args('k', 'x'),
    run: ([k, x]) => {
      number(k)
      return wave(samples(x).map((v) => k * v))
    },
  },
  amount: {
    about: t('波形里所选纯音的份量（一个数）：波形与这个纯音逐格相乘，取平均，再乘 2'),
    args: args('x'),
    params: PITCH,
    run: ([x], { pitch }) => {
      const data = samples(x)
      const tone = toneOf(pitch, data.length)
      return 2 * mean(data.map((v, k) => v * tone[k]))
    },
  },
  multiply: {
    about: t('两个一样长的波形逐格相乘'),
    args: args('a', 'b'),
    symmetric: true,
    run: ([a, b]) => {
      const [x, y] = paired(a, b)
      return wave(x.map((v, k) => v * y[k]))
    },
  },
  mean: {
    about: t('波形各格的平均（一个数）'),
    args: args('x'),
    run: ([x]) => mean(samples(x)),
  },
}

/** The resources as the vocabulary lists them (data). */
export const OP_ITEMS = Object.fromEntries(Object.entries(OPS).map(([k, { run: _, ...item }]) => [k, item]))
