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
//   fail?, final? }: a tick's `failed` is why something was wrong on it, `final` why the run as a whole was (an order
//   or the far end); `fail` the first of them
import { boardNode } from '../../engine/ticks.js'
import { farEnd } from './wants.js'

const T = (zh, en) => ({ zh, en })
const show = (v) => (v === null || v === undefined ? '—' : v === true ? T('是', 'yes') : v === false ? T('否', 'no') : v === 'end' ? T('帧尾', 'end') : String(v))
const L2 = (v, lang) => (typeof v === 'object' ? v[lang] : v)
const list = (values, lang) => (values.length ? values.map((v) => L2(show(v), lang)).join(' ') : lang === 'zh' ? '（什么也没有）' : '(nothing)')

/** Why `got` is not `want` at tick `tick` for `label`. */
const wrong = (tick, label, want, got) => T(
  `第 ${tick} 拍，「${label.zh ?? label}」应当是 ${L2(show(want), 'zh')}，这块板给出 ${L2(show(got), 'zh')}。`,
  `At tick ${tick}, “${label.en ?? label}” should be ${L2(show(want), 'en')}; the board gives ${L2(show(got), 'en')}.`,
)
/** Why the values given in order are not the ones wanted. */
const misordered = (label, words, want, got) => T(
  `「${label.zh ?? label}」：${words.zh}应当是 ${list(want, 'zh')}，这块板给出 ${list(got, 'zh')}。`,
  `“${label.en ?? label}”: ${words.en} should be ${list(want, 'en')}; the board gives ${list(got, 'en')}.`,
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
  let fail = null
  for (let t = 0; t < test.ticks; t++) {
    const given = bind(t)
    const { values, errors, outputs, trace } = you.hear(t, null)
    // A wire carries bits: nothing said is 0, yes and no are 1 and 0.
    for (const w of level.wires?.out ?? []) outputs[w.name] = typeof outputs[w.name] === 'boolean' ? Number(outputs[w.name]) : outputs[w.name] ?? 0
    const tick = { tick: t, values, errors, outputs, bind: given, trace }
    if (pulls && yes(outputs[pulls.next]) && head < queue.length) head += 1
    if (!fail) {
      for (const o of checked(level)) {
        const w = want[o.name]?.ticks?.[t]
        const got = outputs[o.name] ?? null
        if (w !== undefined && !same(w, got)) {
          fail = { tick: t, name: o.name, want: w, got }
          tick.failed = wrong(t, o.label, w, got)
          break
        }
      }
    }
    out.push(tick)
  }
  let final = null
  for (const o of checked(level)) {
    const w = want[o.name]
    if (fail || !w?.order) continue
    const values = out.map((t) => t.outputs[o.name] ?? null)
    const got = w.far ? farEnd(w.far, values) : values.filter((v) => v !== null && v !== undefined)
    if (got.length !== w.order.length || got.some((v, k) => !same(w.order[k], v))) {
      fail = { name: o.name, want: w.order, got }
      final = misordered(o.label, w.words, w.order, got)
      break
    }
  }
  return { ticks: out, want, ...(fail ? { fail } : {}), ...(final ? { final } : {}) }
}

/** Every test of a level on a board: { runs, pass }. */
export function runLevel(level, circuit, parts) {
  const runs = level.tests.map((test) => runTest(level, circuit, test, parts))
  return { runs, pass: runs.every((r) => !r.fail) }
}

export { show }
