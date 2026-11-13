// Running a calculus board on a test: tick n hands the board term n of each input sequence (../../engine/ticks.js, a
// world of one node and no line), and every tick its outputs are checked against the terms the test wants
// (../../engine/circuit-run.js tickJudge), within a relative error of 10⁻⁹.
//
// test   { inputs: { name: [term per tick] }, want: { name: [term per tick] }, ticks }   (course.js reads it)
// task   { inputs?: [{ name, label }], outputs: [{ name, label }] }
//
// runLevel(task, circuit, parts) → { runs, pass }, a run a test: { ticks: [{ tick, values, errors, outputs, trace,
//   failed? }], want, fail? }: a tick's `failed` is why its outputs are wrong, its `trace` what every card computed
//   (inside packed parts too)
// entries({ task, test, run }) → what the results area can show of a test (../../engine/views.js): each input's terms,
//   and each output's terms against the wanted ones, tick by tick
import { boardNode, runTicks } from '../../engine/ticks.js'
import { tickJudge, tickReport } from '../../engine/circuit-run.js'
import { runTests } from '../../engine/test-run.js'

/** A term as wanted: equal, or within a relative error of 10⁻⁹ (the last bits of a different order of operations). */
export const same = (want, got) => want === got || (typeof want === 'number' && typeof got === 'number' && Math.abs(want - got) <= 1e-9 * Math.max(1, Math.abs(want)))

/** Every test of a task on a board: { runs, pass }. */
export const runLevel = runTests((task, circuit, test, parts) => {
  const bind = (tick) => Object.fromEntries(Object.entries(test.inputs).map(([name, terms]) => [name, terms[tick] ?? null]))
  const run = runTicks({ nodes: [boardNode({ id: 'you', circuit, parts, bind, traced: true })], ticks: test.ticks, line: () => null })
  const ticks = run.steps.map((step) => ({ tick: step.tick, ...step.heard.you }))
  const judge = tickJudge({ checked: task.outputs, want: (name) => test.want[name], same })
  return { ...tickReport(ticks, judge(ticks)), want: test.want }
})

export const entries = ({ task, test, run }) => [
  ...(task.inputs ?? []).map((i) => ({ of: i.name, label: i.label, shape: 'ticks', given: test.inputs[i.name] })),
  ...task.outputs.map((o) => ({ of: o.name, label: o.label, shape: 'ticks', got: run.ticks.map((t) => t.outputs[o.name] ?? null), want: run.want[o.name] })),
]
