import { circuitPlay, definedSettings, untilFail } from 'circuit'
import { valueText, TEST_WORDS, splitTests, T, runTestGroups, failureOf, failureText } from 'kernel'

/**
 * The play hook of a domain on the circuit base whose boards run tick by tick (../circuit-preset.js, the course read as
 * `game.circuit`; ../../shell/CircuitScreen.jsx its screen): the board a task opens on, the tray's parts with their
 * components-box keys and settings, every test as the waveform draws it — a lane a row, a tick a column, 「—」 nothing,
 * · anything — and an attempt judged as the screen judges a run: test by test, stopping at the first that fails, the
 * hidden tests run with it.
 *
 *   run(task, board, partOf) → { runs: [{ fail?, error?, final?, ticks }], pass }   the domain's run
 *   given(task) → text   what the task's fixed cards stand for
 *   lanes(task, test) → [{ name, ticks: [value per tick], wanted?, text?(value) }]   a test's lanes (a wanted lane
 *                        holds what an output should be, undefined where anything will do); `text` a value in words,
 *                        by default `show`'s
 *   more?(task, test, lang) → [line]   what the waveform says besides it (what is wanted in order, say)
 *   settings   { type: [{ key, values, about? }] } what can be set on the game's primitives in code; a part defined as
 *              data (game.defined) offers its settings as parts.json writes them (definedSettings)
 *   words      what the game calls its tests (../tests.js TEST_WORDS)
 */
export function tickPlay({ run, given, lanes, more = () => [], settings = {}, show = valueText, words = TEST_WORDS }) {
  const word = (v, lang) => (typeof show(v) === 'object' ? show(v)[lang] : show(v))
  const label = words.label
  const text = (task, test, lang) => {
    const rows = [
      [lang === 'en' ? 'tick' : '拍', Array.from({ length: test.ticks }, (_, t) => String(t))],
      ...lanes(task, test).map((lane) => [
        lane.wanted ? `${lane.name} (${lang === 'en' ? 'wanted' : '应当'})` : lane.name,
        lane.ticks.map((v) => (lane.wanted && v === undefined ? '·' : lane.text ? lane.text(v) : word(v, lang))),
      ]),
    ]
    const width = Math.max(...rows.flatMap(([, cells]) => cells.map((c) => c.length)))
    const head = Math.max(...rows.map(([name]) => name.length))
    return [...rows.map(([name, cells]) => `${name.padEnd(head)}  ${cells.map((c) => c.padStart(width)).join(' ')}`), ...more(task, test, lang)].join('\n')
  }
  return circuitPlay({
    key: ({ game }, type) => (game.circuit.BUILT[type] ? type : `part:${type}`),
    settings: ({ game }, type) => (game.circuit.BUILT[type] ? [] : game.defined?.of(type) ? definedSettings(game.defined.of(type)) : settings[type] ?? []),
    given: ({ level }) => given(level.source),
    tests: ({ level: { source: task }, solved }) => splitTests(task, solved).shown.map((test, k) => ({ label: label(k), text: T(text(task, test, 'zh'), text(task, test, 'en')) })),
    notes: ({ level: { source: task }, solved }) => {
      const { hiddenCount } = splitTests(task, solved)
      return hiddenCount ? [words.note(hiddenCount)] : []
    },
    run: ({ game, level: { source: task }, solved }, board) => {
      const { partOf } = game.circuit.forTask(task)
      const { checked, hidden, pass } = runTestGroups(task, solved, (all) => run(all, board, partOf, { traced: false }))
      const tests = untilFail(checked.runs.map((r, k) => ({ label: label(k), pass: !failureOf(r), says: r.error ?? r.final ?? failureText(r.fail) })))
      return {
        tests,
        hidden: hidden && { ...hidden, says: words.failed(hidden.failed, hidden.count) },
        constraint: checked.constraint,
        says: checked.constraint ? [checked.constraint] : [],
        pass,
      }
    },
  })
}
