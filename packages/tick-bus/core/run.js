import { boardNode, runTicks } from './ticks.js'
import { tickJudge, tickReport } from './tick-report.js'
import { runTests } from 'kernel'
import { LINE, lineOf, sayer } from './line.js'
import { T } from 'kernel'

const SAY = { name: 'say', label: T('说') }

/** What a task checks every tick: what it says (when it talks), then its outputs. */
export const checked = (task) => [...(task.talks ? [SAY] : []), ...(task.outputs ?? [])]

export function runTest(task, circuit, test, parts, { traced = true } = {}) {
  const bind = (tick) => Object.fromEntries(Object.entries(test.inputs ?? {}).map(([name, values]) => [name, values[tick] ?? null]))
  const run = runTicks({ nodes: [sayer('world', test.line), boardNode({ id: 'you', circuit, parts, bind, traced })], ticks: test.line.length, line: lineOf })
  const want = task.want(test)
  const ticks = run.steps.map((step) => ({ tick: step.tick, line: step.line, said: step.said.you ?? null, ...step.heard.you }))
  const judge = tickJudge({ checked: checked(task), want: (name) => want[name], got: (tick, name) => (task.talks && name === SAY.name ? tick.said : tick.outputs[name] ?? null) })
  const error = run.error && T('这块板这一拍要说的话取决于这一拍的线：说之前还听不到。')
  return { ...tickReport(ticks, judge(ticks)), want, ...(error ? { error } : {}) }
}

/** Every test of a task on a board: { runs, pass }. */
export const runLevel = runTests(runTest)

export const entries = ({ task, test, run }) => [
  ...(task.listens ? [{ of: 'line', label: LINE, shape: 'bits', given: test.line }] : []),
  ...(task.inputs ?? []).map((i) => ({ of: i.name, label: i.label, shape: 'bits', given: test.inputs[i.name] })),
  ...checked(task).map((o) => ({ of: o.name, label: o.label, shape: 'ticks', got: run.ticks.map((t) => (task.talks && o.name === SAY.name ? t.said : t.outputs[o.name] ?? null)), want: run.want[o.name] })),
]
