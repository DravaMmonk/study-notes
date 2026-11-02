// Running a vision board on a test: the shared engine evaluates it once, with the test's inputs (numbers, or images
// read from their rows) bound to the task's inputs (../../engine/boards.js runBoard), tracing every card it computes,
// and every output is checked against what the test expects: its kind of value, its size, its channels and each value
// within the task's tolerance (image.js differs).
//
// runTest(task, circuit, test, partOf) → { values, errors, outputs, trace, fail? }   fail: { name, want, got, why }
import { runBoard } from '../../engine/boards.js'
import { differs, valueOf } from './image.js'

const T = (zh, en) => ({ zh, en })

/** A test as content writes it, its values read: { inputs, expect } of numbers, images and 「—」. */
export const readTest = (t) => ({
  ...t,
  inputs: Object.fromEntries(Object.entries(t.inputs).map(([k, v]) => [k, valueOf(v)])),
  expect: Object.fromEntries(Object.entries(t.expect).map(([k, v]) => [k, valueOf(v)])),
})

export function runTest(task, circuit, test, partOf) {
  const trace = []
  const { values, errors, outputs } = runBoard(circuit, { parts: partOf, bind: test.inputs, ctx: { trace } })
  const tol = task.tolerance ?? 1e-5
  for (const out of task.outputs) {
    const why = differs(test.expect[out.name], outputs[out.name] ?? null, tol)
    if (why) {
      return {
        values, errors, outputs, trace,
        fail: { name: out.name, want: test.expect[out.name], got: outputs[out.name] ?? null, why: T(`「${out.label.zh ?? out.label}」${why.zh}。`, `“${out.label.en ?? out.label}” ${why.en}.`) },
      }
    }
  }
  return { values, errors, outputs, trace }
}

/** Every test of a task on a board: { runs, pass }. */
export function runLevel(task, circuit, partOf) {
  const runs = task.tests.map((test) => runTest(task, circuit, test, partOf))
  return { runs, pass: runs.every((r) => !r.fail) }
}
