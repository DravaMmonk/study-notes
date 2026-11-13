// Running a board of 《从一根线开始》 on a test: once a tick the board reads what arrives on its wires in, its inputs and
// the head of the queue it pulls from, and gives what it says on its wires out and its outputs; its registers carry
// from one tick to the next (../../engine/ticks.js boardNode). What arrives on a wire in is fixed by the test (the
// sender at the far end does not listen back), so a board may say this tick what it hears this tick.
//
// test   { ticks, wires: { name: [bit per tick, as it arrives] }, inputs: { name: [value per tick] }, queue: [[byte]] }
//        (course.js builds it from the content)
// level  { wires, inputs, outputs, pulls?, want(test) → { name: { ticks } | { order, words, far? } } } (wants.js)
//
// runTest(level, circuit, test, parts) → { ticks: [{ tick, values, errors, outputs, bind, trace, failed? }], want,
//   fail? }: a tick's `failed` is why something was wrong on it; `fail` is the first failure
// cells(task) → what a row the player writes as a check is made of, where a task gives works to catch: the bits
//   arriving on each wire in, as many ticks as the task's longest test
// check(task, row) → { test }   such a row as a test
// entries({ task, test, run }) → what the results area can show of a test (../../engine/views.js): what arrives on
//   each wire in, the inputs, the head of the queue, and each wire out and output against what is wanted, tick by
//   tick or in order
import { boardNode } from '../../engine/ticks.js'
import { tickJudge, tickReport } from '../../engine/circuit-run.js'
import { inOrder, sameAs } from '../../engine/judge.js'
import { runTests } from '../../engine/test-run.js'
import { farEnd } from './wants.js'
import { T, sideOf } from '../../shell/i18n.js'

const show = (v) => (v === null || v === undefined ? '—' : v === true ? T('是', 'yes') : v === false ? T('否', 'no') : v === 'end' ? T('帧尾') : String(v))
const list = (values, lang) => (values.length ? values.map((v) => sideOf(show(v), lang)).join(' ') : lang === 'zh' ? '（什么也没有）' : '(nothing)')

/** Why the values given in order are not the ones wanted. */
const misordered = (label, words, want, got) => T(
  `「${label.zh ?? label}」：${words.zh}应当是 ${list(want, 'zh')}，这块板给出 ${list(got, 'zh')}。`,
  `“${sideOf(label, 'en')}”: ${words.en} should be ${list(want, 'en')}; the board gives ${list(got, 'en')}.`,
)

/** Everything a level checks: its wires out and outputs, with their labels. */
export const checked = (level) => [...(level.wires?.out ?? []), ...(level.outputs ?? [])]

const yes = (v) => v === 1 || v === true
// Yes counts as 1 and no as 0 wherever a bit is wanted, as the parts' descriptions say.
const same = (want, got) => want === got || (typeof got === 'boolean' && want === Number(got)) || (typeof want === 'boolean' && got === Number(want))

export function runTest(level, circuit, test, parts) {
  const pulls = level.pulls
  let head = 0
  const queue = (test.queue ?? []).flatMap((frame) => frame.map((byte, k) => ({ byte, last: k === frame.length - 1 })))
  const bind = (tick) => ({
    ...Object.fromEntries((level.wires?.in ?? []).map((w) => [w.name, test.wires[w.name]?.[tick] ?? 0])),
    ...Object.fromEntries(Object.entries(test.inputs ?? {}).map(([name, values]) => [name, values[tick] ?? null])),
    ...(pulls ? { [pulls.input]: queue[head]?.byte ?? null, ...(pulls.last ? { [pulls.last]: queue[head] ? queue[head].last : null } : {}) } : {}),
  })
  const you = boardNode({ id: 'you', circuit, parts, bind, traced: true })
  const want = level.want(test)
  const out = []
  for (let t = 0; t < test.ticks; t++) {
    const given = bind(t)
    const { values, errors, outputs, trace } = you.hear(t, null)
    // A wire carries bits: nothing said is 0, yes and no are 1 and 0.
    for (const w of level.wires?.out ?? []) outputs[w.name] = typeof outputs[w.name] === 'boolean' ? Number(outputs[w.name]) : outputs[w.name] ?? 0
    const tick = { tick: t, values, errors, outputs, bind: given, trace }
    if (pulls && yes(outputs[pulls.next]) && head < queue.length) head += 1
    out.push(tick)
  }
  const ports = checked(level)
  const judge = tickJudge({ checked: ports, want: (name) => want[name]?.ticks, same, show })
  const fail = judge(out)
  if (fail) return { ...tickReport(out, fail), want }
  const ordered = ports.filter((port) => want[port.name]?.order).map((port) => {
    const expected = want[port.name]
    return sameAs(expected.order, {
      at: port.name,
      got: (steps) => {
        const values = steps.map((step) => step.outputs[port.name] ?? null)
        return expected.far ? farEnd(expected.far, values) : values.filter((value) => value !== null)
      },
      same: (want, got) => got.length === want.length && got.every((value, k) => same(want[k], value)),
      why: (want, got) => misordered(port.label, expected.words, want, got),
    })
  })
  const final = inOrder(...ordered)(out)
  return { ticks: out, want, ...(final ? { fail: final } : {}) }
}

/** Every test of a level on a board: { runs, pass }. */
export const runLevel = runTests(runTest)

export { show }

/** A check's row: what arrives on each wire in, a bit a tick. A task that gives works reads wires only (course.js). */
export const cells = (task) => (task.wires?.in ?? []).map((w) => ({ name: w.name, label: w.label, shape: 'bits', ticks: Math.max(...task.tests.map((t) => t.ticks)) }))

/** A row the player wrote as a check, as a test: the bits as they arrive. */
export const check = (task, row) => ({ test: { ticks: cells(task)[0].ticks, wires: Object.fromEntries(cells(task).map((c) => [c.name, row[c.name]])), inputs: {}, queue: [] } })

const labelOf = (list, name) => list.find((x) => x.name === name).label

export function entries({ task, test, run }) {
  const wire = (name) => (task.wires?.out ?? []).some((w) => w.name === name)
  const pulled = [task.pulls?.input, task.pulls?.last]
  return [
    ...(task.wires?.in ?? []).map((w) => ({ of: w.name, label: w.label, shape: 'bits', given: test.wires[w.name] })),
    ...(task.inputs ?? []).filter((i) => !pulled.includes(i.name)).map((i) => ({ of: i.name, label: i.label, shape: 'ticks', given: test.inputs[i.name] ?? [] })),
    ...(task.pulls ? [{ of: task.pulls.input, label: labelOf(task.inputs, task.pulls.input), shape: 'ticks', got: run.ticks.map((t) => t.bind[task.pulls.input]) }] : []),
    ...checked(task).map((o) => {
      const want = run.want[o.name]
      return { of: o.name, label: o.label, shape: wire(o.name) ? 'bits' : 'ticks', got: run.ticks.map((t) => t.outputs[o.name] ?? null), want: want?.ticks, ...(want?.order ? { order: { values: want.order, words: want.words } } : {}) }
    }),
  ]
}
