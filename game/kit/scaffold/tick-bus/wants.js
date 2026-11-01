// What a level's outputs (and, when it talks, what it says) must be, tick by tick: the signals content names for them
// (vocabulary.js want). A level writes `want: { output name or say: { item: params } }`; each item here gives, for a
// test (its line read, course.js), one value a tick (undefined: anything will do), the lane the waveform draws under
// the output as 「应当」.
import { callOf } from '../../engine/schema.js'

const each = (test, f) => test.line.map((_, t) => f(t))

const WANTS = {
  line: () => (test) => test.line.map((v) => v ?? 0),
  delayed: ({ input, first }) => (test) => each(test, (t) => (t ? test.inputs[input][t - 1] : first)),
}

/** A level's `want` as the function run.js checks a test by: test → { name: [value per tick] }. */
export const wantOf = (want) => {
  const signals = Object.entries(want).map(([name, call]) => {
    const [item, params] = callOf(call)
    return [name, WANTS[item](params)]
  })
  return (test) => Object.fromEntries(signals.map(([name, f]) => [name, f(test)]))
}
