// The net domain's play hook for a blind session (../../engine/play/): a level of 《从一根线开始》 as its board screen
// (ui/Screen.jsx) shows it, in words — its wires in and inputs down the left, its wires out and outputs down the
// right, the parts it holds, every test as the waveform draws it (what arrives on each wire, the inputs, the queue's
// head, and what each output and wire out should be, tick by tick, or in order) — and an attempt judged as a run
// judges it: tick by tick, stopping at the first test it fails, the hidden tests run with it.
import { circuitPlay, untilFail } from '../../engine/play/circuit.js'
import { startBoard, wiring } from './board.js'
import { REGISTERS } from './parts.js'
import { checked, runLevel, show } from './run.js'

const T = (zh, en) => ({ zh, en })
const word = (v, lang) => {
  const s = show(v)
  return typeof s === 'object' ? s[lang] : s
}

const SETTINGS = {
  reg: [{ key: 'reg', values: REGISTERS }, { key: 'start', values: ['0', '1', '…'], about: T('不写时初值为「—」', 'left out, it starts as 「—」') }],
  keep: [{ key: 'reg', values: REGISTERS }],
  const: [{ key: 'value', values: ['0', '…', '255'] }],
}

/** The tests the strip lists: a solved level's hidden tests join them. */
const testsOf = (level, solved) => (solved ? [...level.tests, ...level.hidden] : level.tests)

/** One test as the waveform shows it, a row a lane, a column a tick: 「—」 is nothing, · anything; then what is wanted
 *  in order. */
function lanes(level, test, lang) {
  const want = level.want(test)
  const rows = [
    [lang === 'en' ? 'tick' : '拍', Array.from({ length: test.ticks }, (_, t) => String(t))],
    ...(level.wires?.in ?? []).map((w) => [w.name, test.wires[w.name].map(String)]),
    ...Object.keys(test.inputs).map((name) => [name, test.inputs[name].map((v) => word(v, lang))]),
    ...checked(level).filter((o) => want[o.name]?.ticks).map((o) => [`${o.name} (${lang === 'en' ? 'wanted' : '应当'})`, want[o.name].ticks.map((v) => (v === undefined ? '·' : word(v, lang)))]),
  ]
  const width = Math.max(...rows.flatMap(([, cells]) => cells.map((c) => c.length)))
  const head = Math.max(...rows.map(([name]) => name.length))
  const grid = rows.map(([name, cells]) => `${name.padEnd(head)}  ${cells.map((c) => c.padStart(width)).join(' ')}`)
  const queue = level.pulls ? [`${lang === 'en' ? 'queue (frames, bytes)' : '队列（帧，字节）'}: ${JSON.stringify(test.queue)}`] : []
  const order = checked(level).filter((o) => want[o.name]?.order).map((o) => `${o.name} (${lang === 'en' ? 'wanted, in order' : '应当，依次'}): ${want[o.name].words[lang]} = ${want[o.name].order.map((v) => word(v, lang)).join(' ') || '—'}`)
  return [...grid, ...queue, ...order].join('\n')
}

export const play = circuitPlay({
  board: ({ game, level, flags, progress }) => {
    const net = game.net
    net.syncOwn(progress.built)
    const { shown, folded } = net.offerIn(level.source, flags)
    return { start: startBoard(level.source), parts: wiring(level.source, net), types: [...shown, ...folded] }
  },
  key: ({ game }, type) => (game.net.BUILT[type] ? type : `part:${type}`),
  settings: ({ game }, type) => (game.net.BUILT[type] ? [] : SETTINGS[type] ?? []),
  given: ({ level: { source: L } }) => T(
    [
      ...(L.wires?.in ?? []).map((w) => `${w.name}：进线「${w.label.zh}」，这一拍到达的位`),
      ...(L.inputs ?? []).map((i) => `${i.name}：输入「${i.label.zh}」${L.pulls?.input === i.name ? '，队首的字节（取完了是「—」）' : L.pulls?.last === i.name ? '，队首是一帧的最后一个字节时为是' : ''}`),
      ...(L.wires?.out ?? []).map((w) => `${w.name}：出线「${w.label.zh}」，接到这里的位这一拍说到线上（不接为 0）`),
      ...(L.outputs ?? []).map((o) => `${o.name}：输出「${o.label.zh}」${L.pulls?.next === o.name ? '，为 1 或是的那一拍取走队首，下一拍出现下一个' : ''}`),
    ].join('\n'),
    [
      ...(L.wires?.in ?? []).map((w) => `${w.name}: wire in “${w.label.en}”, the bit arriving this tick`),
      ...(L.inputs ?? []).map((i) => `${i.name}: input “${i.label.en}”${L.pulls?.input === i.name ? ', the byte at the head of the queue (「—」 once used up)' : L.pulls?.last === i.name ? ', yes when the head is the last byte of its frame' : ''}`),
      ...(L.wires?.out ?? []).map((w) => `${w.name}: wire out “${w.label.en}”, the bit wired here is said on it this tick (0 when nothing is wired)`),
      ...(L.outputs ?? []).map((o) => `${o.name}: output “${o.label.en}”${L.pulls?.next === o.name ? ', the tick it is 1 or yes takes the head of the queue, the next showing the tick after' : ''}`),
    ].join('\n'),
  ),
  tests: ({ level: { source: L }, solved }) => testsOf(L, solved).map((test, k) => ({
    label: T(`测试 ${k + 1}`, `Test ${k + 1}`),
    text: T(lanes(L, test, 'zh'), lanes(L, test, 'en')),
  })),
  notes: ({ level: { source: L }, solved }) => (!solved && L.hidden.length ? [T(`另有 ${L.hidden.length} 个隐藏测试，每次运行一并检查，通关后公开。`, `${L.hidden.length} more hidden ${L.hidden.length === 1 ? 'test is' : 'tests are'} checked with every run and shown once you pass.`)] : []),
  run: ({ game, level: { source: L }, solved }, board) => {
    const net = game.net
    const shown = runLevel({ ...L, tests: testsOf(L, solved) }, board, net.partOf)
    const tests = untilFail(shown.runs.map((r, k) => ({
      label: T(`测试 ${k + 1}`, `Test ${k + 1}`),
      pass: !r.fail,
      says: r.final ?? r.ticks.find((t) => t.failed)?.failed ?? null,
    })))
    const hidden = solved || !L.hidden.length ? null : runLevel({ ...L, tests: L.hidden }, board, net.partOf).runs.filter((r) => r.fail).length
    const n = L.hidden.length
    return {
      tests,
      hidden: hidden === null ? null : { count: n, failed: hidden, says: T(`可见的测试全部通过，但 ${n} 个隐藏测试中有 ${hidden} 个没有通过：这块板可能只是恰好合上了这几个测试。`, `Every test shown passes, but ${hidden} of ${n} hidden ${n === 1 ? 'test fails' : 'tests fail'}: the board may only happen to fit these.`) },
      pass: shown.pass && !hidden,
    }
  },
})
