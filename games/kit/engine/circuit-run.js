// Connect the shared judges to circuit evaluation, replay and the result rows.
import { runTraced } from './boards.js'
import { isGrid } from './grid.js'
import { inOrder, sameAs, ticks } from './judge.js'
import { runTests } from './test-run.js'
import { valueText } from './views.js'

const output = (run, name) => run.outputs[name] ?? null
const shape = (value) => isGrid(value) ? 'grid' : 'scalar'

export function outputJudge(ports, expect, { same, show = valueText, says = () => null } = {}) {
  return inOrder(...ports.map((port) => sameAs(expect[port.name], {
    got: (run) => output(run, port.name),
    same,
    at: port.name,
    why: (want, got) => says(port, want, got) ?? { relation: 'output', subject: port.label, show },
  })))
}

export function tickJudge({ show = valueText, ...options }) {
  return ticks({
    ...options,
    why: (port) => ({ relation: 'output', subject: port.label, show }),
  })
}

export function tickReport(steps, fail) {
  if (!fail) return { ticks: steps }
  return { ticks: steps.map((step) => step.tick === fail.at.tick ? { ...step, failed: fail } : step), fail }
}

export function onceRun({ same = (a, b) => a === b, show = valueText, tolerance, says } = {}) {
  const runTest = (task, circuit, test, partOf) => {
    const run = runTraced(circuit, partOf, test.inputs)
    const judge = outputJudge(task.outputs, test.expect, { same: (want, got) => same(want, got, tolerance), show, says })
    const fail = judge(run)
    return fail ? { ...run, fail } : run
  }
  const entries = ({ task, test, run }) => [
    ...task.inputs.map((i) => ({ of: i.name, label: i.label, shape: shape(test.inputs[i.name]), given: test.inputs[i.name], shown: false })),
    ...task.outputs.map((o) => ({ of: o.name, label: o.label, shape: shape(test.expect[o.name]), got: output(run, o.name), want: test.expect[o.name], ...(tolerance === undefined ? {} : { tolerance }) })),
  ]
  return { runTest, runLevel: runTests(runTest), entries }
}
