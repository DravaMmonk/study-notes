// Running a linear board on a test: the shared engine evaluates it once, with the test's inputs bound to the level's
// inputs (../../engine/boards.js runTraced), tracing every card it computes (the steps of a run), and every output is
// checked against what the test expects, entries within a hair (values.js same: a board's arithmetic leaves binary
// noise that the player never reads).
//
// runTest(level, circuit, test, partOf) → { values, errors, outputs, trace, fail? }   fail: { name, want, got, why }
// entries({ task, test, run }) → what the results area can show of a test (../../engine/views.js): each input given
//   (left out by default: the input cards show it), each output against what the test expects; a vector and a matrix
//   are grids, drawn in the views the game names (its `views`), a number a scalar
import { runTraced } from '../../engine/boards.js'
import { runTests } from '../../engine/circuit-domain.js'
import { isGrid } from '../../engine/grid.js'
import { T } from '../../shell/i18n.js'
import { same, show } from './values.js'

export { show }

const TOLERANCE = 1e-9

export function runTest(level, circuit, test, partOf) {
  const run = runTraced(circuit, partOf, test.inputs)
  const { outputs } = run
  const out = level.outputs.find((o) => !same(outputs[o.name] ?? null, test.expect[o.name], TOLERANCE))
  const fail = out && {
    name: out.name,
    want: test.expect[out.name],
    got: outputs[out.name] ?? null,
    why: T(`「${out.label.zh ?? out.label}」应当是 ${show(test.expect[out.name])}，这块板给出 ${show(outputs[out.name])}。`, `“${out.label.en ?? out.label}” should be ${show(test.expect[out.name])}; the board gives ${show(outputs[out.name])}.`),
  }
  return fail ? { ...run, fail } : run
}

/** Every test of a level on a board: { runs, pass }. */
export const runLevel = runTests(runTest)

const shape = (v) => (isGrid(v) ? 'grid' : 'scalar')

export const entries = ({ task, test, run }) => [
  ...task.inputs.map((i) => ({ of: i.name, label: i.label, shape: shape(test.inputs[i.name]), given: test.inputs[i.name], shown: false })),
  ...task.outputs.map((o) => ({ of: o.name, label: o.label, shape: shape(test.expect[o.name]), got: run.outputs[o.name] ?? null, want: test.expect[o.name], tolerance: TOLERANCE })),
]
