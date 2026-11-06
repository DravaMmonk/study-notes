// Running a vision board on a test: the shared engine evaluates it once, with the test's inputs (numbers, or images
// read from their rows) bound to the task's inputs (../../engine/boards.js runBoard), tracing every card it computes,
// and every output is checked against what the test expects: its kind of value, its size, its channels and each value
// within the task's tolerance (image.js differs). An output with no value at all fails whatever the test expects, 「—」
// too: 「—」 is a value a card gives, never what an unwired output or a card that stopped reads as.
//
// runTest(task, circuit, test, partOf) → { values, errors, outputs, trace, fail? }   fail: { name, want, got, why }
// entries({ task, test, run, sample }) → what the results area can show of a test (../../engine/views.js): each input
//   given (left out by default: the input cards show it), each output against what the test expects — on the sample,
//   against what the reference board gives there; an image is a grid, any other value a scalar
import { runBoard } from '../../engine/boards.js'
import { MISSING } from '../../engine/circuit.js'
import { runTests } from '../../engine/circuit-domain.js'
import { differs, isImage, valueOf } from './image.js'
import { T } from '../../shell/i18n.js'


/** A test as content writes it, its values read: { inputs, expect } of numbers, images, points and 「—」. */
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
  // Farthest upstream first (no findLast: older iOS Safari lacks it).
  const back = [...upstream].reverse()
  const stopped = back.find((n) => errors.has(n) && errors.get(n) !== MISSING)
  if (stopped) return T(`没有值：「${stopped}」停下了（${errors.get(stopped).zh}）`, `has no value: “${stopped}” stopped (${errors.get(stopped).en})`)
  const lacking = back.find((n) => errors.get(n) === MISSING) ?? upstream[0]
  return T(`没有值：「${lacking}」缺少输入`, `has no value: “${lacking}” lacks an input`)
}

export function runTest(task, circuit, test, partOf) {
  const trace = []
  const { values, errors, outputs } = runBoard(circuit, { parts: partOf, bind: test.inputs, ctx: { trace } })
  const tol = task.tolerance ?? 1e-5
  for (const out of task.outputs) {
    const got = outputs[out.name]
    const sink = circuit.nodes.find((n) => n.type === 'out' && n.params?.name === out.name)
    const why = got === undefined ? sink ? noValue(circuit, errors, sink.id) : T('缺少输出元件', 'is missing its output terminal') : differs(test.expect[out.name], got, tol)
    if (why) {
      return {
        values, errors, outputs, trace,
        fail: { name: out.name, want: test.expect[out.name], got: got ?? null, why: T(`「${out.label.zh ?? out.label}」${why.zh}。`, `“${out.label.en ?? out.label}” ${why.en}.`) },
      }
    }
  }
  return { values, errors, outputs, trace }
}

/** Every test of a task on a board: { runs, pass }. A board that gives what the naive board gives fails for its reason. */
export const runLevel = runTests((task, circuit, test, partOf) => {
  const result = runTest(task, circuit, test, partOf)
  if (result.fail && task.naive && task.naiveWhy) {
    const mistaken = runTest(task, task.naive, test, partOf)
    const same = task.outputs.every(({ name }) => result.outputs[name] !== undefined && mistaken.outputs[name] !== undefined && !differs(mistaken.outputs[name], result.outputs[name], task.tolerance ?? 1e-5))
    const reason = typeof task.naiveWhy === 'string' ? T(task.naiveWhy, task.naiveWhy) : task.naiveWhy
    if (same) result.fail.why = { zh: `${result.fail.why.zh} ${reason.zh}`, en: `${result.fail.why.en} ${reason.en}` }
  }
  return result
})

export function entries({ task, test, run, sample }) {
  const shape = (v) => (isImage(v) ? 'grid' : 'scalar')
  const given = sample ? task.sample.inputs : test.inputs
  return [
    ...task.inputs.map((i) => ({ of: i.name, label: i.label, shape: shape(given[i.name]), given: given[i.name], shown: false })),
    ...task.outputs.map((o) => {
      const want = sample ? sample.outputs[o.name] : test.expect[o.name]
      return { of: o.name, label: o.label, shape: shape(want), got: run.outputs[o.name] ?? null, want, tolerance: task.tolerance ?? 1e-5 }
    }),
  ]
}
