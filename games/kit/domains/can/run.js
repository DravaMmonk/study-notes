// Running a board of 《车在说话》 on a test: the world's nodes say their bits, the player's board is one more node on the
// bus (../../engine/ticks.js), and every tick its outputs are checked against what the task wants
// (../../engine/circuit-domain.js judgeTicks).
//
// test   { bus: { bits, frames }, inputs?: { name: [value per tick] } }   (course.js builds the bus from content)
// task   { outputs: [{ name, label }], want(test) → { name: [value per tick] } }  undefined in `want`: any value will do
//
// runTest(task, circuit, test, parts) → { ticks: [{ tick, line, values, errors, outputs, trace, failed? }], want,
//   error?, fail? }: a tick's `failed` is why its outputs are wrong, its `trace` what every card computed (inside
//   packed parts too); `error` a board that says what it hears in the same tick
// entries({ task, test, run }) → what the results area can show of a test (../../engine/views.js): the bus and the
//   inputs, each output against what is wanted, tick by tick
import { boardNode, runTicks } from '../../engine/ticks.js'
import { judgeTicks, runTests } from '../../engine/circuit-domain.js'
import { BUS, sayer, wiredAnd } from './bus.js'
import { T } from '../../shell/i18n.js'

export function runTest(task, circuit, test, parts) {
  const bind = (tick) => Object.fromEntries(Object.entries(test.inputs ?? {}).map(([name, values]) => [name, values[tick] ?? null]))
  const run = runTicks({ nodes: [sayer('world', test.bus.bits), boardNode({ id: 'you', circuit, parts, bind, traced: true })], ticks: test.bus.bits.length, line: wiredAnd })
  const want = task.want(test)
  const judged = judgeTicks(run.steps.map((step) => ({ tick: step.tick, line: step.line, ...step.heard.you })), { checked: task.outputs, want: (name) => want[name] })
  const error = run.error && T('这块板这一拍要说的话取决于这一拍的总线：说之前还听不到。', 'What this board says this tick depends on the bus this tick: it cannot hear before it speaks.')
  return { ...judged, want, ...(error ? { error } : {}) }
}

/** Every test of a task on a board: { runs, pass }. */
export const runLevel = runTests(runTest)

export const entries = ({ task, test, run }) => [
  ...(task.listens ? [{ of: 'line', label: BUS, shape: 'bits', given: test.bus.bits }] : []),
  ...(task.inputs ?? []).map((i) => ({ of: i.name, label: i.label, shape: 'bits', given: test.inputs[i.name] })),
  ...task.outputs.map((o) => ({ of: o.name, label: o.label, shape: 'ticks', got: run.ticks.map((t) => t.outputs[o.name] ?? null), want: run.want[o.name] })),
]
