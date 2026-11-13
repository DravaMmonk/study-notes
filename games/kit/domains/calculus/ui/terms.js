import { numberText } from '../../../engine/number.js'
import { same } from '../run.js'

// The scene of a calculus test, as the kit's chart draws it (../../../views/plots/Chart.jsx): for each output, its terms
// against n on the axes the test's sequences share: the terms given (one or two sequences) joined faintly, the terms
// wanted as rings, the board's own terms filling them in tick by tick. The term of the tick shown is the point; where
// it misses, the stretch between it and its ring.

const numbers = (terms) => terms.map((v, n) => [n, v]).filter(([, v]) => typeof v === 'number')

/** The scene of a test: a chart an output. */
export const terms = ({ task, test, run, at }) => {
  if (!test) return []
  // More than two sequences given would be a tangle: the results' rows show them.
  const given = (task.inputs ?? []).length > 2 ? [] : (task.inputs ?? []).map((i) => numbers(test.inputs[i.name]))
  return task.outputs.map((o) => {
    const want = numbers(test.want[o.name] ?? [])
    const got = run ? numbers(run.ticks.slice(0, at + 1).map((t) => t.outputs[o.name])) : []
    const all = [...given.flat(), ...want].map(([, v]) => v)
    const now = got.at(-1)?.[0] === at ? got.at(-1) : undefined
    const ring = now && want.find(([n]) => n === at)
    const met = ring && same(ring[1], now[1])
    return {
      part: 'chart',
      label: o.label,
      x: { name: 'n', max: Math.max(1, test.ticks - 1) },
      y: { name: o.label, min: Math.min(0, ...all), max: Math.max(1, ...all) },
      series: [...given.map((points) => ({ points, kind: 'given' })), { points: want, kind: 'want' }, { points: now ? got.slice(0, -1) : got, kind: 'was' }],
      point: now && { at: now, reads: numberText(now[1]) },
      gap: ring && !met ? { from: ring, to: now } : undefined,
      state: !ring ? undefined : met ? 'met' : now[1] > ring[1] ? 'over' : 'under',
    }
  })
}
