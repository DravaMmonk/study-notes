// Running a vision board on a test: the shared engine evaluates it once, with the test's inputs (numbers, or images
// read from their rows) bound to the task's inputs (../../engine/boards.js runBoard), tracing every card it computes,
// and every output is checked against what the test expects: its kind of value, its size, its channels and each value
// within the task's tolerance (image.js differs). An output with no value at all fails whatever the test expects, 「—」
// too: 「—」 is a value a card gives, never what an unwired output or a card that stopped reads as.
//
// runTest(task, circuit, test, partOf) → { values, errors, outputs, trace, fail? }   fail: { name, want, got, why }
import { runBoard } from '../../engine/boards.js'
import { MISSING } from '../../engine/circuit.js'
import { differs, valueOf } from './image.js'

const T = (zh, en) => ({ zh, en })

/** A test as content writes it, its values read: { inputs, expect } of numbers, images and 「—」. */
export const readTest = (t) => ({
  ...t,
  inputs: Object.fromEntries(Object.entries(t.inputs).map(([k, v]) => [k, valueOf(v)])),
  expect: Object.fromEntries(Object.entries(t.expect).map(([k, v]) => [k, valueOf(v)])),
})

/**
 * Why an output has no value: it is not wired; a card it reads from stopped (the first one upstream that stopped on
 * its own, not for want of an input); or a card it reads from lacks an input.
 */
function noValue(circuit, errors, id) {
  const into = (to) => circuit.wires.filter((w) => w.to === to).map((w) => w.from.split('#')[0])
  if (!into(id).length) return T('没有接线', 'is not wired')
  const upstream = []
  const stack = into(id)
  while (stack.length) {
    const n = stack.pop()
    if (upstream.includes(n)) continue
    upstream.push(n)
    stack.push(...into(n))
  }
  const stopped = upstream.findLast((n) => errors.has(n) && errors.get(n) !== MISSING)
  if (stopped) return T(`没有值：「${stopped}」停下了（${errors.get(stopped).zh}）`, `has no value: “${stopped}” stopped (${errors.get(stopped).en})`)
  const lacking = upstream.findLast((n) => errors.get(n) === MISSING) ?? upstream[0]
  return T(`没有值：「${lacking}」缺少输入`, `has no value: “${lacking}” lacks an input`)
}

export function runTest(task, circuit, test, partOf) {
  const trace = []
  const { values, errors, outputs } = runBoard(circuit, { parts: partOf, bind: test.inputs, ctx: { trace } })
  const tol = task.tolerance ?? 1e-5
  for (const out of task.outputs) {
    const got = outputs[out.name]
    const why = got === undefined ? noValue(circuit, errors, circuit.nodes.find((n) => n.type === 'out' && n.params?.name === out.name).id) : differs(test.expect[out.name], got, tol)
    if (why) {
      return {
        values, errors, outputs, trace,
        fail: { name: out.name, want: test.expect[out.name], got: got ?? null, why: T(`「${out.label.zh ?? out.label}」${why.zh}。`, `“${out.label.en ?? out.label}” ${why.en}.`) },
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
