import { failureOf } from '../test-run.js'
import { failureText } from '../failure-text.js'
// A circuit level as a blind player meets it (./play.js): the board as it opens, the parts in the tray with what the
// components box says of them, the level's visible tests, and an attempt read as blueprint text exactly as the game's
// "import from text" reads it (../../circuit/text.js read: the tray's parts only, no loops, frames kept, the editor's
// own wire refusals), then run as the level screen runs it.
//
// A circuit domain's play hook is circuitPlay({ … }) over what its level screen already has, node-safe:
//
//   board(ctx)          → { start, parts, types }   the board the level opens on (preset, carried or upgraded board
//                         included), the editor's description of its nodes (../../circuit/model.js parts: inputs, role,
//                         removable, outputs, frames, text, refuse; no drawing), and the part types the tray offers
//   key(ctx, type)      → the components box key of a part type (game.parts.all), for its name and description; or
//   part(ctx, type)     → { name, desc } when the tray words a part its own way (a family of models as one entry, say)
//   settings?(ctx, type)→ [{ key, values?: [v], about? }] what can be set on a part, as its card offers it
//   portLabel?(ctx, type, port) → what a part's card calls an input port, when its name is not its label
//   brief?(ctx, start)  → the level brief, with guidance for the prepared opening board
//   given?(ctx)         → text: what the board's given nodes stand for (inputs, outputs)
//   tests(ctx)          → [{ label, text }] the visible tests, as the test strip shows them
//   notes?(ctx)         → [text] what the test strip says beside the tests (how many hidden tests there are, say)
//   run(ctx, board)     → { tests: [{ label, pass, says }], hidden?: { count, failed, says }, says?: [text], pass,
//                         keep? } the level's visible tests and its hidden ones, as a run judges them, with the screen's
//                         words; `keep`: what the screen saves without the level passing (a stage of it passed, say)
//   keep?(ctx, board)   → what the screen saves of a board (progress.data, and progress.built once it passes), when that
//                         is not the editor's graph itself
//
// ctx is what the shell hands a level screen: { game, level (the level as played: a task's fields merged in), flags,
// progress, solved, task, fails (the attempts on it that failed so far) }. Text is { zh, en } pairs or strings;
// ./play.js renders it.

import { print, read } from '../../circuit/text.js'
import { outputsOf } from '../../circuit/model.js'
import { runTestGroups, splitTests, TEST_WORDS } from '../tests.js'
import { valueText } from '../views.js'
import { T } from '../../shell/i18n.js'


/** How to write a board as text, in the words of the blueprint dialog, for any circuit level. */
export const GRAMMAR = T(
  [
    '每行一条：',
    '  名字 = 类型(输入1, 输入2, …)        放一块元件，按输入口的顺序写它读的来源；_ 留空一个口',
    '  名字 = 类型[设置=值, …](…)          带设置的元件',
    '  名字 = 类型(口名: 来源, …)           也可以按口名写',
    '  来源写元件的名字；元件有几个输出时写「名字.输出」',
    '  输出 <- 来源                         接到关卡给的节点；有几个输入口的写「节点.口 <- 来源」',
    '  框 = 类型(…) { 区域 { … } }           框里的元件写在区域的代码块里，区域给出的值读作「框.区域」',
    '  # 注释',
    '名字、类型、口名和设置值都用 ASCII。',
  ].join('\n'),
  [
    'One statement a line:',
    '  name = type(input1, input2, …)        place a part; its sources in the order of its inputs; _ leaves one open',
    '  name = type[setting=value, …](…)      a part with settings',
    '  name = type(port: source, …)          inputs may also go by port name',
    '  a source is a part’s name, or name.output for one of several outputs',
    '  node <- source                        wire into a node the level gives; node.port <- source for one with several inputs',
    '  box = type(…) { region { … } }        parts inside a frame go in a block per region; what a region gives reads as box.region',
    '  # a comment',
    'Names, types, port names and setting values are ASCII.',
  ].join('\n'),
)

/**
 * Tests as a step-by-step run shows them (../../shell/usePlayback.jsx): it stops at the first test that fails, so the
 * tests after it are not run (pass: null).
 */
export const untilFail = (tests) => {
  const first = tests.findIndex((t) => !t.pass)
  return first < 0 ? tests : tests.map((t, k) => (k <= first ? t : { label: t.label, pass: null }))
}

/**
 * What a part defined as data (../parts/define.js, its settings resolved) offers to set, in words: a choice's values, a
 * number's range, a toggle's two; a setting that starts as 「—」 says so.
 */
export const definedSettings = (def) => def.settings.map((s) => {
  const range = s.min !== undefined && s.max !== undefined ? [String(s.min), '…', String(s.max)] : null
  const values = s.options ? s.options.map((o) => String(o.value)) : s.control === 'toggle' ? ['true', 'false'] : range
  return { key: s.key, ...(values ? { values } : {}), ...(s.default === null ? { about: T('不写时为「—」') } : {}) }
})

/** A node of `type` as a new card is: no settings yet. */
const blank = (type) => ({ id: '_', type, params: {} })

/** The tray's parts: name and description from the components box, ports, outputs and settings. */
function palette(ctx, hook, parts, types) {
  return types.map((type) => {
    const node = blank(type)
    const entry = hook.part ? null : ctx.game.parts?.all.find((p) => p.key === hook.key(ctx, type))
    const text = hook.part ? hook.part(ctx, type) : entry ? ctx.game.textAt(entry, ctx.level.id) : null
    const outs = outputsOf(parts, node).filter((o) => o.key !== null).map((o) => ({ key: o.key, label: o.label ?? null }))
    const inputs = parts.inputs(node).map((port) => ({ key: port, label: hook.portLabel?.(ctx, type, port) ?? null }))
    return { type, name: text?.name ?? type, desc: text?.desc ?? '', inputs, outputs: outs, settings: hook.settings?.(ctx, type) ?? [] }
  })
}

/** The given nodes of a board, as text can name them: what to write into, what to read from. */
function givens(board) {
  const { start, parts } = board
  const placed = (n) => (parts.removable ? parts.removable(n) : parts.role(n) === 'part')
  return start.nodes.filter((n) => !placed(n)).map((n) => ({ id: n.id, role: parts.role(n), inputs: parts.inputs(n), outputs: outputsOf(parts, n).map((o) => o.key).filter((k) => k !== null), sets: parts.text?.sets?.(n) ?? [] }))
}

/** The same circuit view, opening work and usable types as the level screen. */
export function playBoard({ game, level: { source: task }, progress, flags }) {
  const view = game.circuit.forTask(task)
  view.syncOwn(progress.built, progress)
  const { types } = view.offerIn(task, flags)
  return { start: view.opening(task, progress.built, undefined, progress), parts: view.board.wiring(task, view), types }
}

/** A play hook for a circuit domain (see the top of this file). */
export function circuitPlay(hook) {
  return {
    open(ctx) {
      const board = hook.board(ctx)
      const start = print(board.start, board.parts).split('\n').slice(1).join('\n')
      return {
        kind: 'circuit',
        ...(hook.brief && { brief: hook.brief(ctx, board.start) }),
        given: hook.given?.(ctx) ?? null,
        nodes: givens(board),
        palette: palette(ctx, hook, board.parts, board.types),
        tests: hook.tests(ctx),
        notes: hook.notes?.(ctx) ?? [],
        start: start.trim() ? start : null,
        write: GRAMMAR,
      }
    },
    attempt(ctx, text) {
      const board = hook.board(ctx)
      const result = read(text, board.start, board.parts, board.types)
      if (result.errors) return { pass: false, refused: result.errors.map((e) => T(e.zh, e.en)), parts: [] }
      const graph = result.graph
      const placed = (n) => (board.parts.removable ? board.parts.removable(n) : board.parts.role(n) === 'part')
      return { ...hook.run(ctx, graph), board: hook.keep ? hook.keep(ctx, graph) : graph, parts: [...new Set(graph.nodes.filter(placed).map((n) => n.type))].sort() }
    },
  }
}

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
 *              data (game.defined) offers its settings as pieces.json writes them (definedSettings)
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
    board: playBoard,
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
