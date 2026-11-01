// The can domain's play hook for a blind session (../../engine/play/): a level of 《车在说话》 as its board screen
// (ui/BusScreen.jsx) shows it, in words — the bus and the level's inputs down the left, its outputs down the right,
// the parts it holds, every bus as the waveform draws it (the line, the inputs and what each output should be, tick
// by tick) — and an attempt judged as a run judges it: tick by tick, stopping at the first bus it fails, the hidden
// buses run with it.
import { circuitPlay, untilFail } from '../../engine/play/circuit.js'
import { startBoard, wiring } from './board.js'
import { REGISTERS } from './parts.js'
import { runLevel, show } from './run.js'

const T = (zh, en) => ({ zh, en })
const word = (v, lang) => {
  const s = show(v)
  return typeof s === 'object' ? s[lang] : s
}

const SETTINGS = {
  reg: [{ key: 'reg', values: REGISTERS }, { key: 'start', values: ['0', '1'], about: T('不写时初值为「—」', 'left out, it starts as 「—」') }],
  keep: [{ key: 'reg', values: REGISTERS }],
  const: [{ key: 'value', values: ['0', '…', '32'] }],
  compare: [{ key: 'form', values: ['eq', 'lt'] }],
  arith: [{ key: 'form', values: ['inc', 'add'] }],
}

/** The tests the strip lists: a solved level's hidden buses join them. */
const testsOf = (level, solved) => (solved ? [...level.tests, ...level.hidden] : level.tests)

/** One bus as the waveform shows it, a row a lane, a column a tick: 「—」 is nothing, · anything. */
function lanes(level, test, lang) {
  const want = level.want(test)
  const rows = [
    [lang === 'en' ? 'tick' : '拍', test.bus.bits.map((_, t) => String(t))],
    ...(level.listens ? [['line', test.bus.bits.map(String)]] : []),
    ...(level.inputs ?? []).map((i) => [i.name, test.inputs[i.name].map((v) => word(v, lang))]),
    ...level.outputs.map((o) => [`${o.name} (${lang === 'en' ? 'wanted' : '应当'})`, want[o.name].map((v) => (v === undefined ? '·' : word(v, lang)))]),
  ]
  const width = Math.max(...rows.flatMap(([, cells]) => cells.map((c) => c.length)))
  const head = Math.max(...rows.map(([name]) => name.length))
  return rows.map(([name, cells]) => `${name.padEnd(head)}  ${cells.map((c) => c.padStart(width)).join(' ')}`).join('\n')
}

export const play = circuitPlay({
  board: ({ game, level, flags, progress }) => {
    const bus = game.bus
    bus.syncOwn(progress.built)
    const { shown, folded } = bus.offerIn(level.source, flags)
    return { start: startBoard(level.source), parts: wiring(level.source, bus), types: [...shown, ...folded] }
  },
  key: ({ game }, type) => (game.bus.BUILT[type] ? type : `part:${type}`),
  settings: ({ game }, type) => (game.bus.BUILT[type] ? [] : SETTINGS[type] ?? []),
  given: ({ level: { source: L } }) => T(
    [...(L.listens ? ['line：这一拍总线上的位（0 显性，1 隐性）'] : []), ...(L.inputs ?? []).map((i) => `${i.name}：输入「${i.label.zh}」`), ...L.outputs.map((o) => `${o.name}：输出「${o.label.zh}」，每一拍检查`)].join('\n'),
    [...(L.listens ? ['line: the bit on the bus this tick (0 dominant, 1 recessive)'] : []), ...(L.inputs ?? []).map((i) => `${i.name}: input “${i.label.en}”`), ...L.outputs.map((o) => `${o.name}: output “${o.label.en}”, checked every tick`)].join('\n'),
  ),
  tests: ({ level: { source: L }, solved }) => testsOf(L, solved).map((test, k) => ({
    label: T(`总线 ${k + 1}`, `Bus ${k + 1}`),
    text: T(lanes(L, test, 'zh'), lanes(L, test, 'en')),
  })),
  notes: ({ level: { source: L }, solved }) => (!solved && L.hidden.length ? [T(`另有 ${L.hidden.length} 条隐藏的总线，每次运行一并检查，通关后公开。`, `${L.hidden.length} more hidden ${L.hidden.length === 1 ? 'bus is' : 'buses are'} checked with every run and shown once you pass.`)] : []),
  run: ({ game, level: { source: L }, solved }, board) => {
    const bus = game.bus
    const shown = runLevel({ ...L, tests: testsOf(L, solved) }, board, bus.partOf)
    const tests = untilFail(shown.runs.map((r, k) => ({
      label: T(`总线 ${k + 1}`, `Bus ${k + 1}`),
      pass: !r.fail && !r.error,
      says: r.error ?? r.ticks.find((t) => t.failed)?.failed ?? null,
    })))
    const hidden = solved || !L.hidden.length ? null : runLevel({ ...L, tests: L.hidden }, board, bus.partOf).runs.filter((r) => r.fail || r.error).length
    const n = L.hidden.length
    return {
      tests,
      hidden: hidden === null ? null : { count: n, failed: hidden, says: T(`可见的总线全部通过，但 ${n} 条隐藏的总线中有 ${hidden} 条没有通过：这块板可能只是恰好合上了这几条总线。`, `Every bus shown passes, but ${hidden} of ${n} hidden ${n === 1 ? 'bus fails' : 'buses fail'}: the board may only happen to fit these.`) },
      pass: shown.pass && !hidden,
    }
  },
})
