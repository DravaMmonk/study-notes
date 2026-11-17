import { qualifyItems } from 'kernel'
import { callOf } from 'kernel'

const each = (test, f) => test.line.map((_, t) => f(t))

const WANTS = qualifyItems('tick-bus', 'want', {
  line: () => (test) => test.line.map((v) => v ?? 0),
  delayed: ({ input, first }) => (test) => each(test, (t) => (t ? test.inputs[input][t - 1] : first)),
})

/** A level's `want` as the function run.js checks a test by: test → { name: [value per tick] }. */
export const wantOf = (want) => {
  const signals = Object.entries(want).map(([name, call]) => {
    const [item, params] = callOf(call)
    return [name, WANTS[item](params)]
  })
  return (test) => Object.fromEntries(signals.map(([name, f]) => [name, f(test)]))
}
