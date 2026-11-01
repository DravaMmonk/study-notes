// What a level's outputs must be, tick by tick: the signals content names for them (vocabulary.js want). A level writes
// `want: { output name: { item: params } }`; each item here gives, for a test (its bus built, course.js), one value a
// tick (undefined: anything will do), the lane the waveform draws under the output as 「应当」.
import { callOf } from '../../engine/schema.js'

/** A controller may start talking once the bus has been recessive this many bits in a row; an identifier is as long. */
const QUIET = 11

// How many ones ran on `bits` up to tick t (not counting t).
const onesBefore = (bits, t) => {
  let n = 0
  for (let k = t - 1; k >= 0 && bits[k] === 1; k--) n++
  return n
}
const each = (test, f) => test.bus.bits.map((_, t) => f(t))

const WANTS = {
  line: () => (test) => test.bus.bits,
  previous: ({ first }) => (test) => each(test, (t) => (t ? test.bus.bits[t - 1] : first)),
  unchanged: ({ first }) => (test) => each(test, (t) => test.bus.bits[t] === (t ? test.bus.bits[t - 1] : first)),
  tick: () => (test) => each(test, (t) => t),
  since: ({ tick }) => (test) => each(test, (t) => t >= tick),
  streak: ({ input }) => (test) => each(test, (t) => onesBefore(test.inputs[input], t)),
  startOfFrame: () => (test) => each(test, (t) => test.bus.bits[t] === 0 && onesBefore(test.bus.bits, t) >= QUIET),
  gathered: ({ bit, go }) => (test) => {
    let acc = 0
    return each(test, (t) => (acc = test.inputs[go][t] ? acc * 2 + test.inputs[bit][t] : 0))
  },
  identifier: () => (test) => {
    const out = test.bus.bits.map(() => null)
    for (const f of test.bus.frames) out[f.at + QUIET] = f.id
    return out
  },
}

/** A level's `want` as the function run.js checks a test by: test → { output name: [value per tick] }. */
export const wantOf = (want) => {
  const signals = Object.entries(want).map(([name, call]) => {
    const [item, params] = callOf(call)
    return [name, WANTS[item](params)]
  })
  return (test) => Object.fromEntries(signals.map(([name, f]) => [name, f(test)]))
}
