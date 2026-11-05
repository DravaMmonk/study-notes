// The __name__ domain's play hook for a blind session (../../engine/play/): a level as its board screen (ui/Screen.jsx)
// shows it, in words — the line and the level's inputs down the left, what it says and its outputs down the right, the
// parts it holds, every test as the waveform draws it (the line, the inputs and what each output should be, tick by
// tick) — and an attempt judged as a run judges it: tick by tick, stopping at the first test it fails, the hidden
// tests run with it.
import { circuitPlay, untilFail } from '../../engine/play/circuit.js'
import { startBoard, wiring } from './board.js'
import { REGISTERS } from './parts.js'
import { checked, runLevel, show } from './run.js'
import { T } from '../../shell/i18n.js'

const word = (v, lang) => {
  const s = show(v)
  return typeof s === 'object' ? s[lang] : s
}

const SETTINGS = {
  reg: [{ key: 'reg', values: REGISTERS }, { key: 'start', values: ['0', '1'], about: T('不写时初值为「—」', 'left out, it starts as 「—」') }],
  keep: [{ key: 'reg', values: REGISTERS }],
  const: [{ key: 'value', values: ['0', '…', '32'] }],
}

/** The tests the strip lists: a solved level’s hidden tests join them. */
const testsOf = (level, solved) => (solved ? [...level.tests, ...level.hidden] : level.tests)

/** One test as the waveform shows it, a row a lane, a column a tick: 「—」 is nothing, · anything. */
function lanes(level, test, lang) {
  const want = level.want(test)
  const rows = [
    [lang === 'en' ? 'tick' : '拍', test.line.map((_, t) => String(t))],
    ...(level.listens ? [['line', test.line.map((v) => (v === undefined ? '.' : String(v)))]] : []),
    ...(level.inputs ?? []).map((i) => [i.name, test.inputs[i.name].map((v) => word(v, lang))]),
    ...checked(level).map((o) => [`${o.name} (${lang === 'en' ? 'wanted' : '应当'})`, want[o.name].map((v) => (v === undefined ? '·' : word(v, lang)))]),
  ]
  const width = Math.max(...rows.flatMap(([, cells]) => cells.map((c) => c.length)))
  const head = Math.max(...rows.map(([name]) => name.length))
  return rows.map(([name, cells]) => `${name.padEnd(head)}  ${cells.map((c) => c.padStart(width)).join(' ')}`).join('\n')
}

export const play = circuitPlay({
  board: ({ game, level, flags, progress }) => {
    const own = game.circuit
    own.syncOwn(progress.built)
    const { shown, folded } = own.offerIn(level.source, flags)
    return { start: startBoard(level.source), parts: wiring(level.source, own), types: [...shown, ...folded] }
  },
  key: ({ game }, type) => (game.circuit.BUILT[type] ? type : `part:${type}`),
  settings: ({ game }, type) => (game.circuit.BUILT[type] ? [] : SETTINGS[type] ?? []),
  given: ({ level: { source: L } }) => T(
    [...(L.listens ? ['line：这一拍线上的位'] : []), ...(L.inputs ?? []).map((i) => `${i.name}：输入「${i.label.zh}」`), ...(L.talks ? ['say：接到这里的位这一拍说到线上，每一拍检查'] : []), ...(L.outputs ?? []).map((o) => `${o.name}：输出「${o.label.zh}」，每一拍检查`)].join('\n'),
    [...(L.listens ? ['line: the bit on the line this tick'] : []), ...(L.inputs ?? []).map((i) => `${i.name}: input “${i.label.en}”`), ...(L.talks ? ['say: the bit wired here goes on the line this tick, checked every tick'] : []), ...(L.outputs ?? []).map((o) => `${o.name}: output “${o.label.en}”, checked every tick`)].join('\n'),
  ),
  tests: ({ level: { source: L }, solved }) => testsOf(L, solved).map((test, k) => ({
    label: T(`测试 ${k + 1}`, `Test ${k + 1}`),
    text: T(lanes(L, test, 'zh'), lanes(L, test, 'en')),
  })),
  notes: ({ level: { source: L }, solved }) => (!solved && L.hidden.length ? [T(`另有 ${L.hidden.length} 个隐藏测试，每次运行一并检查，通关后公开。`, `${L.hidden.length} more hidden ${L.hidden.length === 1 ? 'test is' : 'tests are'} checked with every run and shown once you pass.`)] : []),
  run: ({ game, level: { source: L }, solved }, board) => {
    const own = game.circuit
    const shown = runLevel({ ...L, tests: testsOf(L, solved) }, board, own.partOf)
    const tests = untilFail(shown.runs.map((r, k) => ({
      label: T(`测试 ${k + 1}`, `Test ${k + 1}`),
      pass: !r.fail && !r.error,
      says: r.error ?? r.ticks.find((t) => t.failed)?.failed ?? null,
    })))
    const hidden = solved || !L.hidden.length ? null : runLevel({ ...L, tests: L.hidden }, board, own.partOf).runs.filter((r) => r.fail || r.error).length
    const n = L.hidden.length
    return {
      tests,
      hidden: hidden === null ? null : { count: n, failed: hidden, says: T(`可见的测试全部通过，但 ${n} 个隐藏测试中有 ${hidden} 个没有通过：这块板可能只是恰好合上了这几个测试。`, `Every test shown passes, but ${hidden} of ${n} hidden ${n === 1 ? 'test fails' : 'tests fail'}: the board may only happen to fit these.`) },
      pass: shown.pass && !hidden,
    }
  },
})
