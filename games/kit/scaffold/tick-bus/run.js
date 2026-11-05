// Running a __name__ board on a test: the world says its bits, the player's board is one more node on the line
// (../../engine/ticks.js), and every tick its outputs (and what it says, when it talks) are checked against what the
// task wants (../../engine/circuit-domain.js judgeTicks).
//
// test   { line: [bit | undefined per tick], inputs?: { name: [value per tick] } }   (course.js reads it)
// task   { outputs: [{ name, label }], talks?, want(test) → { name: [value per tick] } }  undefined in `want`: any value
//
// runTest(task, circuit, test, parts) → { ticks: [{ tick, line, said, values, errors, outputs, trace, failed? }], want,
//   error?, fail? }: a tick's `failed` is why its outputs are wrong, its `trace` what every card computed (inside packed
//   parts too); `error` a board that says what it hears in the same tick
import { boardNode, runTicks } from '../../engine/ticks.js'
import { judgeTicks, runTests } from '../../engine/circuit-domain.js'
import { lineOf, sayer } from './line.js'
import { T } from '../../shell/i18n.js'

const SAY = { name: 'say', label: T('说', 'Say') }

/** What a task checks every tick: what it says (when it talks), then its outputs. */
export const checked = (task) => [...(task.talks ? [SAY] : []), ...(task.outputs ?? [])]

export function runTest(task, circuit, test, parts) {
  const bind = (tick) => Object.fromEntries(Object.entries(test.inputs ?? {}).map(([name, values]) => [name, values[tick] ?? null]))
  const run = runTicks({ nodes: [sayer('world', test.line), boardNode({ id: 'you', circuit, parts, bind, traced: true })], ticks: test.line.length, line: lineOf })
  const want = task.want(test)
  const ticks = run.steps.map((step) => ({ tick: step.tick, line: step.line, said: step.said.you ?? null, ...step.heard.you }))
  const judged = judgeTicks(ticks, { checked: checked(task), want: (name) => want[name], got: (tick, name) => (task.talks && name === SAY.name ? tick.said : tick.outputs[name] ?? null) })
  const error = run.error && T('这块板这一拍要说的话取决于这一拍的线：说之前还听不到。', 'What this board says this tick depends on the line this tick: it cannot hear before it speaks.')
  return { ...judged, want, ...(error ? { error } : {}) }
}

/** Every test of a task on a board: { runs, pass }. */
export const runLevel = runTests(runTest)
