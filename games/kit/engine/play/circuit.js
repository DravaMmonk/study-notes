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
import { TEST_WORDS } from '../circuit-domain.js'
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

/** A play hook for a circuit domain (see the top of this file). */
export function circuitPlay(hook) {
  return {
    open(ctx) {
      const board = hook.board(ctx)
      const start = print(board.start, board.parts).split('\n').slice(1).join('\n')
      return {
        kind: 'circuit',
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
 * The play hook of a domain on the circuit base whose boards run tick by tick (../circuit-domain.js, the course read as
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
 *   registers? { names, top }   the cards that keep registers and constants, as the screen offers them
 *                               (../../shell/CircuitScreen.jsx registerCards): reg and keep name one of `names`, reg
 *                               starts as 「—」, 0 or 1, const is a number from 0 to `top`
 *   settings   { type: [{ key, values, about? }] } what can be set on the game's other primitives
 *   words      what the game calls its tests (../circuit-domain.js TEST_WORDS)
 */
export function tickPlay({ run, given, lanes, more = () => [], registers = null, settings = {}, show = valueText, words = TEST_WORDS }) {
  const offered = {
    ...(registers ? {
      reg: [{ key: 'reg', values: registers.names }, { key: 'start', values: ['0', '1'], about: T('不写时初值为「—」') }],
      keep: [{ key: 'reg', values: registers.names }],
      const: [{ key: 'value', values: ['0', '…', String(registers.top)] }],
    } : {}),
    ...settings,
  }
  const word = (v, lang) => (typeof show(v) === 'object' ? show(v)[lang] : show(v))
  const testsOf = (task, solved) => (solved ? [...task.tests, ...task.hidden] : task.tests)
  const label = words.label
  const failed = (r) => Boolean(r.fail || r.error)
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
    board: ({ game, level, flags, progress }) => {
      const own = game.circuit
      own.syncOwn(progress.built)
      const { shown, folded } = own.offerIn(level.source, flags)
      return { start: own.opening(level.source, progress.built), parts: own.board.wiring(level.source, own), types: [...shown, ...folded] }
    },
    key: ({ game }, type) => (game.circuit.BUILT[type] ? type : `part:${type}`),
    settings: ({ game }, type) => (game.circuit.BUILT[type] ? [] : offered[type] ?? []),
    given: ({ level }) => given(level.source),
    tests: ({ level: { source: task }, solved }) => testsOf(task, solved).map((test, k) => ({ label: label(k), text: T(text(task, test, 'zh'), text(task, test, 'en')) })),
    notes: ({ level: { source: task }, solved }) => {
      const n = task.hidden.length
      return !solved && n ? [words.note(n)] : []
    },
    run: ({ game, level: { source: task }, solved }, board) => {
      const { partOf } = game.circuit
      const shown = run({ ...task, tests: testsOf(task, solved) }, board, partOf)
      const tests = untilFail(shown.runs.map((r, k) => ({ label: label(k), pass: !failed(r), says: r.error ?? r.final ?? r.ticks.find((t) => t.failed)?.failed ?? null })))
      const n = task.hidden.length
      const hidden = solved || !n ? null : run({ ...task, tests: task.hidden }, board, partOf).runs.filter(failed).length
      return {
        tests,
        hidden: hidden === null ? null : { count: n, failed: hidden, says: words.failed(hidden, n) },
        pass: shown.pass && !hidden,
      }
    },
  })
}
