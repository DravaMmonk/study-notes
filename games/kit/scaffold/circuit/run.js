// Running a __name__ board on a test: the shared engine evaluates it once, with the test's inputs bound to the level's
// inputs (../../engine/boards.js runBoard), tracing every card it computes (the steps of a run), and every output is
// checked against what the test expects.
//
// runTest(level, circuit, test, partOf) → { values, errors, outputs, trace, fail? }   fail: { name, want, got, why }
// entries({ task, test, run }) → what the results area can show of a test (../../engine/views.js): each input given
//   (left out by default: the input cards show it), each output against what the test expects
import { runBoard } from '../../engine/boards.js'
import { T } from '../../shell/i18n.js'


/** What a card shows of a value: a number, or 「—」. */
export const show = (v) => (v === null || v === undefined ? '—' : String(v))

export function runTest(level, circuit, test, partOf) {
  const trace = []
  const { values, errors, outputs } = runBoard(circuit, { parts: partOf, bind: test.inputs, ctx: { trace } })
  const out = level.outputs.find((o) => test.expect[o.name] !== (outputs[o.name] ?? null))
  const fail = out && {
    name: out.name,
    want: test.expect[out.name],
    got: outputs[out.name] ?? null,
    why: T(`「${out.label.zh}」应当是 ${show(test.expect[out.name])}，这块板给出 ${show(outputs[out.name])}。`, `“${out.label.en}” should be ${show(test.expect[out.name])}; the board gives ${show(outputs[out.name])}.`),
  }
  return { values, errors, outputs, trace, ...(fail ? { fail } : {}) }
}

/** Every test of a level on a board: { runs, pass }. */
export function runLevel(level, circuit, partOf) {
  const runs = level.tests.map((test) => runTest(level, circuit, test, partOf))
  return { runs, pass: runs.every((r) => !r.fail) }
}

export const entries = ({ task, test, run }) => [
  ...task.inputs.map((i) => ({ of: i.name, label: i.label, shape: 'scalar', given: test.inputs[i.name], shown: false })),
  ...task.outputs.map((o) => ({ of: o.name, label: o.label, shape: 'scalar', got: run.outputs[o.name] ?? null, want: test.expect[o.name] })),
]
