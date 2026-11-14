import { SCENES } from '../views/plots/scenes.js'
import { caught } from '../engine/caught.js'
import Checks, { checksSay, useChecks } from './Checks.jsx'
import { VIEWS, valueText } from '../engine/views.js'
import { useMemo, useState } from 'react'
import { stagesOf } from '../engine/stages.js'
import { ArrowRightFromLine, CircuitBoard } from 'lucide-react'
import { MISSING } from '../engine/circuit.js'
import { viewAt } from '../engine/trace.js'
import { outputsOf, srcOf } from '../circuit/model.js'
import { TEST_WORDS } from '../engine/tests.js'
import CircuitLevel, { useLevelBoard, useLevelRun } from './CircuitLevel.jsx'
import { rowsOf } from '../engine/views.js'
import { SettingsContext } from './useSetting.js'
import Results from '../views/Results.jsx'
import { failureText } from '../engine/failure-text.js'
import { ViewScope } from '../views/choice.js'
import { valueKey } from '../views/picks.js'
import Show from '../views/Show.jsx'
import { PlaneExtent } from '../views/plots/Plane.jsx'
import { extentOf } from '../views/plots/plane.js'
import { L, T, tr } from './i18n.js'
import { WORDS } from './words.js'
import { openRef } from './refs.js'
import { definedItem } from './parts/faces.jsx'
import { useEdit } from './edit.js'
import NumberField from './NumberField.jsx'
import { PHONE, useMedia } from './useMedia.js'
import Readouts from './Readouts.jsx'
import CircuitCheckTable from './plays/CircuitCheckTable.jsx'
import { PackedBoard } from '../circuit/Inside.jsx'

// The level screen of a domain on the circuit base (engine/circuit-preset.js, the game's course read: `course`), on
// the kit's circuit level (CircuitLevel.jsx): the level's fixed cards down the left and right
// (named by the ports its task gives them), the parts it holds between, the parts the player built as packed parts
// that open to show the board they run. A run plays every test in turn and stops on the first that fails; hidden tests
// run with every run but say only how many fail, and join the list once the level is solved. A board run tick by tick
// (the board's `ticks`) plays a tick a step, every card showing its value at the tick shown and the results' time axis
// following along; a board run once plays every card the engine computes, a step each, or, `judged`, checks every test
// at once and shows each test's whole run. Under the board, the kit's results area (views/Results.jsx): the rows the
// task lays out (`results`) or the domain's default ones, of the entries the domain offers.
//
// A domain brings only what is its own:
//   course                the course read (engine/board-course.js circuitCourse): forTask(task) → the task's view
//   cards                 { type: { name, desc, icon, family } } its cards as the tray and boards show them (a fixed
//                         card it leaves out is drawn as a source in the family 'given', or a sink in 'end')
//   run(task, board, partOf) → { runs: [{ fail?, error?, ticks? | trace?, … }] }   its run.js
//   once?(task)           on a tick board, whether this task's tests each run the board once (a run then holds a trace,
//                         as on a board run once, and the results show it so)
//   show(value)           a value in words, as a card and the results show it (a grid is drawn: ../views/Show.jsx)
//   entries({ task, test, run, sample }) → what the results area can show of a test (../engine/views.js: an entry a
//                         port, with its shape and the values given, got and wanted; on the sample, test is null and
//                         `sample` the reference board's run on it)
//   figure?({ task, test, run, at }) → a picture of the test by the results (a scene it stands for): `run` once there
//                         is one to show (on a board run tick by tick, from its first tick), `at` the tick shown
//   judged                a board run once is checked in one go, with nothing to step through
//   sample?(task, board) → the board's run on the task's `sample`, a tab after the tests, never judged (judged boards)
//   ready?(board, held)   the board as the task holds it (held: the parts its tray holds), on opening and every change
//   settings?(node, set, ctx)  a card's own settings (CardField; registerCards for registers, constants and forms)
//   defaults?(type)       a new card's settings
//   portLabels?           { type: { port: label } }               defined?  the game's parts.json parts (CircuitLevel)
//   inspect?(node, ctx)   what a defined part's detail shows of its values (by default, as its card)
//   sheet?(node, ctx, set), details   a card's detail (CircuitLevel sheet; set as settings' is), offered from desktop
//                         card headers too (details); on a board run tick by tick, by default its settings and each of
//                         its values tick by tick so far, each switched between its views there (tickDetail)
//   card?                 faces of a card over the base's (CircuitLevel card)
//   canvas                { height } of a part's card on the desktop board
//   words                 what the game calls its tests (../engine/tests.js TEST_WORDS)
//   says?                 { go?, done?, pass?, fail? } the run button's words, and a table's verdicts
//   table?(task) → play   the tests are the rows of a table (CircuitCheckTable.jsx, its target column the play's),
//                         picked there rather than in tabs; a run goes down it a row at a time, with no steps inside
//   told?(task) → { label, text }   a line over the table
//   final?(task, board)   why the whole run fails though every test passed (over budget…), or ''
//   score?(task, board)   the score the level is passed with
//   readouts?(task, board) → [{ value, label }]   the numbers under the task (Readouts.jsx)
//   className             the domain's class on the level

const reportedFailure = (run) => run.error ?? (run.final ? null : failureText(run.fail))
const finalFailure = (run) => run.fail?.at?.tick === undefined ? reportedFailure(run) : run.error

const labelOf = (list, name) => list?.find((x) => x.name === name)?.label ?? name

/** A number typed on a card: a keypad on a phone (NumberField). */
function CardNumber({ label, value, onChange }) {
  const phone = useMedia(PHONE)
  return (
    <label className="cs-field">
      <span>{L(label)}</span>
      <NumberField label={label} value={value} phone={phone} onChange={onChange} />
    </label>
  )
}

/** A setting picked from a list, on a card. */
export function CardField({ label, value, options, onChange }) {
  return (
    <label className="cs-field">
      <span>{L(label)}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} onPointerDown={(e) => e.stopPropagation()}>
        {options.map(([v, text]) => <option key={v} value={v}>{L(text)}</option>)}
      </select>
    </label>
  )
}

/**
 * The settings of the cards a tick board keeps registers with (../engine/ticks.js register, store), as a domain's
 * screen gives them: `reg` and `keep` name one of `registers`, `reg` has a start value (「—」, 0 or 1), `const` a number
 * from 0 to `top`, and a part with forms (`forms`: { type: { form: label } }) one of them. With `numbers`, a constant
 * and a start value are any number, typed (NumberField), and a start value is 0 until set. `numberConstants` and `numberStarts` give constants and optional register starts numeric fields. A new card's settings are
 * its defaults written in (the first register, 0, the first form), so the card shows them.
 */
export function registerCards({ registers, top, forms = {}, numbers = false, numberConstants = false, numberStarts = false }) {
  const names = registers.map((r) => [r, r])
  const starts = [['', '—'], ['0', '0'], ['1', '1']]
  const values = numbers || numberConstants ? [] : Array.from({ length: top + 1 }, (_, k) => [String(k), String(k)])
  const first = (type) => Object.keys(forms[type])[0]
  return {
    defaults: (type) => (type === 'reg' ? { reg: registers[0], ...(numbers ? { start: '0' } : {}) } : type === 'keep' ? { reg: registers[0] } : type === 'const' ? { value: '0' } : forms[type] ? { form: first(type) } : {}),
    settings: (node, set) => {
      const p = node.params ?? {}
      const reg = <CardField label={T('名字', 'Name')} value={p.reg ?? registers[0]} options={names} onChange={set('reg')} />
      const start = numberStarts ? <><CardNumber label={T('初值')} value={p.start ?? ''} onChange={set('start')} /><button type="button" disabled={p.start === undefined || p.start === ''} onPointerDown={(event) => event.stopPropagation()} onClick={() => set('start')('')}>{L(T('清空初值', 'Clear initial value'))}</button></> : numbers ? <CardNumber label={T('初值')} value={p.start ?? ''} onChange={set('start')} /> : <CardField label={T('初值')} value={p.start ?? ''} options={starts} onChange={set('start')} />
      if (node.type === 'reg') return <>{reg}{start}</>
      if (node.type === 'keep') return reg
      if (node.type === 'const') return numbers || numberConstants ? <CardNumber label={T('数值', 'Value')} value={p.value ?? '0'} onChange={set('value')} /> : <CardField label={T('数值', 'Value')} value={p.value ?? '0'} options={values} onChange={set('value')} />
      if (forms[node.type]) return <CardField label={T('形状', 'Form')} value={p.form ?? first(node.type)} options={Object.entries(forms[node.type])} onChange={set('form')} />
      return null
    },
  }
}

/** What a card shows of a value (the kit's card scene, ../views/Show.jsx, in the view kept for it: `of`), or why it
 * has none. */
function Value({ value, error, show, of }) {
  if (value === undefined) return <span className={`cs-error ${!error || error === MISSING ? 'is-missing' : ''}`}>{!error || error === MISSING ? L(WORDS.notWired) : L(error)}</span>
  return <Show value={value} scene="card" text={show} of={of} />
}

/** The editor's description of a task's cards (../circuit/model.js): the board's wiring, drawn. */
export function partsFor(level, circuit, { cards, portLabels }) {
  const { board, BUILT, builtBy } = circuit
  const wiring = board.wiring(level, circuit)
  // A fixed card the domain does not draw its own way: a source on the left, a sink on the right.
  const given = (node) => board.isFixed(node.type) && !cards[node.type]
  return {
    ...wiring,
    label: (node) => (board.isFixed(node.type) ? board.labelOf(level, node.id) : BUILT[node.type] ? builtBy(node.type, node.params).builds.name : cards[node.type]?.name ?? node.type),
    portLabel: (node, port) => (BUILT[node.type] ? labelOf(board.portsIn(builtBy(node.type, node.params)), port) : portLabels[node.type]?.[port] ?? ''),
    family: (node) => (BUILT[node.type] ? 'built' : given(node) ? (wiring.role(node) === 'sink' ? 'end' : 'given') : cards[node.type]?.family),
    icon: (node) => (BUILT[node.type] ? CircuitBoard : given(node) ? ArrowRightFromLine : cards[node.type]?.icon),
    valueView: () => level.views?.grid?.[0] ?? 'value',
  }
}

/** The run of a board that has not run: nothing on any card. */
const NOTHING = { values: new Map(), errors: new Map(), outputs: {}, trace: [] }

export default function CircuitScreen({ screen, course, cards, run: runOn, show, entries, figure, judged = false, once, check, cells, sample, ready, settings, defaults, portLabels = {}, defined = null, inspect, sheet, details = false, card: faces = {}, canvas = { height: 120 }, words = TEST_WORDS, says = {}, table = null, told, final, score, readouts, className = '' }) {
  const { game, level: entry, solved, flags, progress } = screen
  const level = entry.source
  const circuit = course.forTask(level)
  const { board: kind, BUILT, builtBy } = circuit
  // A task that gives works (things made, each wrong in its own way) is played from the other side: the board shows
  // the work a tab picks and is not the player's, and the player writes the checks in the results (Checks.jsx).
  const works = level.works ?? null
  const onPhone = useMedia(PHONE)
  // A board run tick by tick: the player's own plays a tick at a time; a work's is shown whole, on the tick it goes wrong.
  const ticked = Boolean(kind.ticks) && !once?.(level)
  const timed = ticked && !works
  circuit.syncOwn(progress.built)
  const parts = useMemo(() => partsFor(level, circuit, { cards, portLabels }), [level, circuit, cards, portLabels])
  const { shown: palette, folded } = useMemo(() => circuit.offerIn(level, flags), [circuit, level, flags])
  const held = useMemo(() => new Set([...palette, ...folded]), [palette, folded])
  const hold = (b) => (ready ? ready(b, held) : b)
  // A task that goes on from the task before (`carries`) opens on that board, its ports swapped for its own, unless
  // its new starter parts are added without replacing the inherited work.
  const opening = () => circuit.opening(level, progress.built)
  const fitted = (saved) => {
    if (saved?.nodes && level.carries && !progress.data[entry.key]) return circuit.opening(level, progress.built, saved)
    return saved?.nodes && kind.fits(saved, level, circuit.partOf) ? saved : opening()
  }
  const state = useLevelBoard(screen, { open: (saved) => hold(fitted(saved)), fresh: () => hold(opening()) })
  const checks = useChecks(screen, level, cells)
  // A work is shown as it is: every card on it locked. Where its cards sit is the canvas's to settle and the player's
  // to move (a change that keeps what the board computes), kept while the level is open.
  const [placed, setPlaced] = useState({})
  const given = useMemo(() => works?.map((w) => ({ ...w.board, nodes: w.board.nodes.map((n) => ({ ...n, locked: true })) })), [works])
  const board = works ? { circuit: works[0].board, version: checks.version, change: () => {}, clear: () => {}, clearable: () => false } : ready ? { ...state, change: (next, options) => state.change(hold(next), options) } : state
  const found = useMemo(() => works && caught({ task: level, rows: checks.rows, check, run: (b, tests) => runOn({ ...level, tests }, b, circuit.partOf).runs }), [level, checks.version, circuit])
  const uncaught = (k) => (found.why ? checksSay(found) : found.catches[k] >= 0 ? '' : tr('这一样通过了每一行：还没有哪一行挡住它。', 'This one passes every row: none catches it yet.'))
  const { circuit: drawn, change } = board
  const stages = useMemo(() => stagesOf({ task: level, board: board.circuit, chain: circuit.stageChain(level, progress.built), isFixed: (n) => kind.isFixed(n.type) }), [level, board.circuit, circuit, progress.built, kind])
  const [revealed] = useState(solved)
  const tests = useMemo(() => (works ? [] : revealed ? [...level.tests, ...level.hidden.map((t) => ({ ...t, hidden: true }))] : level.tests), [level, revealed])
  const checked = useMemo(() => (works ? { runs: [] } : runOn({ ...level, tests }, drawn, circuit.partOf)), [level, tests, board.version, circuit])
  const hidden = works || revealed ? [] : level.hidden
  const hiddenFailed = useMemo(() => (hidden.length ? runOn({ ...level, tests: hidden }, drawn, circuit.partOf, { traced: false }).runs.filter((r) => r.fail || r.error).length : 0), [level, hidden, board.version, circuit])
  const failing = (r) => Boolean(r.fail || r.error)
  const stepsOf = (r) => (timed ? r.ticks.map((tick) => tick.failed ? { ...tick, failed: failureText(tick.failed) } : tick) : r.trace)
  const run = useLevelRun(screen, board, works ? {
    tests: works.map((w, k) => ({ label: L(w.label ?? T(`作品 ${k + 1}`, `Work ${k + 1}`)) })),
    judge: () => ({ pass: works.every((_, k) => !uncaught(k)), results: works.map((_, k) => ({ pass: !uncaught(k), reason: uncaught(k) })) }),
    score: () => ({ steps: checks.rows.length, unit: 'cases' }),
  } : {
    tests: [...tests.map((t, k) => ({ label: L(words.label(k)), hidden: t.hidden })), ...(judged && level.sample ? [{ label: L(WORDS.sample), sample: true }] : [])],
    ...(judged
      ? { judge: () => ({ pass: !checked.runs.some(failing), results: checked.runs.map((r) => ({ pass: !failing(r), reason: failing(r) ? L(finalFailure(r)) : '' })) }) }
      : { steps: { of: (k) => (table ? [] : stepsOf(checked.runs[k])), check: (k) => finalFailure(checked.runs[k]) ?? '', ...(final ? { final: () => final(level, drawn) } : {}) } }),
    hidden: {
      count: hidden.length,
      fails: () => hiddenFailed,
      words: {
        note: L(words.note(hidden.length)),
        failed: (n) => L(words.failed(n, hidden.length)),
      },
    },
    ...(score ? { score: () => score(level, drawn) } : {}),
  })

  // The sample (judged boards): the board's run on it, and the reference's, never judged.
  const onSample = Boolean(level.sample) && run.at === tests.length
  const sampled = useMemo(() => (onSample ? { run: sample(level, drawn), want: sample(level, level.solution) } : null), [onSample, level, board.version])
  // The step shown: the one a run is on (or its last, once past it). Before a run a tick board shows its first tick,
  // as a preview, and a board run once the whole run; a judged board always its whole run.
  const whole = judged || Boolean(works) || Boolean(table)
  const runOf = sampled ? sampled.run : works ? found.works?.[run.at][checks.at] ?? NOTHING : checked.runs[run.at]
  const shown = run.playback.shown(run.at)
  const at = !run.run ? (timed ? 0 : -1) : shown.list.length ? (shown.at >= 0 ? shown.at : shown.list.length - 1) : -1
  const tick = timed && at >= 0 ? runOf.ticks[at] : null
  // A work run tick by tick stands on the tick a row catches it (its last, where none does).
  const caughtAt = works && ticked && run.over && runOf.ticks ? runOf.fail?.at?.tick ?? runOf.ticks.length - 1 : -1
  const view = timed ? tick ?? undefined : caughtAt >= 0 ? runOf.ticks[caughtAt] : works && ticked ? undefined : whole || !run.run ? runOf : viewAt(runOf.trace, at)
  const ended = whole ? run.over : Boolean(run.run && (run.run.test > run.at || run.run.over))

  const setParam = (node, key, value) => {
    const next = { ...node, params: { ...node.params, [key]: value } }
    const nodes = drawn.nodes.map(n => n.id === node.id ? next : n)
    if (key !== 'form') return change({ ...drawn, nodes })
    const inputs = new Set(parts.inputs(next))
    const outputs = parts.outputs(next)
    const wires = drawn.wires.filter(wire => {
      if (wire.to === node.id && !inputs.has(wire.port)) return false
      const [from, port] = wire.from.split('#')
      return from !== node.id || (outputs ? outputs.some(output => output.key === port) : !port)
    })
    change({ ...drawn, nodes, wires })
  }
  // A card shows its value; a card on the right, what reaches it (as its own value: the output's view).
  const valueOf = (node, key, v) => v.values.get(key ? `${node.id}#${key}` : node.id)
  const value = (node, ctx) => {
    const into = valueOf(node, null, ctx.view) === undefined && ctx.board.parts.role(node) === 'sink' && ctx.board.circuit.wires.find((w) => w.to === node.id)
    const of = valueKey(ctx, node.id)
    return into ? <Value value={ctx.view.values.get(into.from)} error={ctx.view.errors.get(into.from.split('#')[0])} show={show} of={of} /> : <Value value={valueOf(node, null, ctx.view)} error={ctx.view.errors.get(node.id)} show={show} of={of} />
  }
  const body = (node, ctx) => (
    <div className="cs-card">
      {settings?.(node, (key) => (v) => !ctx.readOnly && setParam(node, key, v), ctx)}
      {!ctx.board.parts.outputs(node) && value(node, ctx)}
    </div>
  )
  // A card's detail on a board run tick by tick: each of its values (a sink: what reaches it) over the ticks so far, a
  // lane each in the detail scene; the shape a port's results row gives it, else bits while every value is 0 or 1.
  // Inside a packed part, what its card shows.
  const lanesOf = (node, { board: b }) => {
    if (b.parts.role(node) !== 'sink') return outputsOf(b.parts, node).map((o) => ({ key: srcOf(node, o.key), of: srcOf(node, o.key), label: o.key === null ? null : o.label }))
    const into = b.circuit.wires.find((w) => w.to === node.id)
    return into ? [{ key: into.from, of: node.id, label: null }] : []
  }
  const shapeOf = (of, values) => offered.find((e) => e.of === of)?.shape ?? (values.every((v) => v === 0 || v === 1 || v === null) ? 'bits' : 'ticks')
  const tickDetail = (node, ctx) => {
    const lanes = ctx.path.length ? [] : lanesOf(node, ctx)
    if (!lanes.length) return body(node, ctx)
    const seen = runOf.ticks.slice(0, at + 1)
    return (
      <div className="cs-card">
        {settings?.(node, (key) => (v) => !ctx.readOnly && setParam(node, key, v), ctx)}
        {lanes.map(({ key, of, label }) => {
          const values = seen.map((t) => t.values.get(key) ?? null)
          return <Show key={of} value={values} shape={shapeOf(of, values)} scene="detail" of={valueKey(ctx, of)} label={label} text={show} />
        })}
      </div>
    )
  }
  // A defined part shows each output's value; with several, none of its own (its detail, `inspect`'s).
  // What the task holds of a defined part's setting (../course.js holds): null when every value, [] when not the
  // setting itself, else the values it holds.
  const has = useMemo(() => circuit.holdsIn(level, flags), [circuit, level, flags])
  const allowed = useMemo(() => (type, key) => {
    const setting = defined?.of(type)?.setting[key]
    if (!setting) return null
    if (!has(type, key)) return []
    const open = setting.options?.map((o) => o.value).filter((v) => has(type, key, String(v)))
    return !open || open.length === setting.options.length ? null : open
  }, [defined, has])
  const definedFaces = useMemo(() => defined && {
    ...defined,
    allowed,
    value: (node, ctx, output, face) => (face === 'detail' && inspect ? inspect(node, ctx) : output ? <Value value={valueOf(node, output, ctx.view)} error={ctx.view.errors.get(node.id)} show={show} of={valueKey(ctx, `${node.id}#${output}`)} /> : ctx.board.parts.outputs(node) ? null : value(node, ctx)),
  }, [defined, inspect, allowed])

  const itemOf = (type) => {
    const fresh = entry.fresh?.includes(type)
    if (BUILT[type]) {
      const b = builtBy(type).builds
      return { type, label: b.name, desc: b.desc, icon: CircuitBoard, family: 'built', packed: true }
    }
    if (defined?.of(type)) return definedItem(type, defined.of(type), { fresh }, allowed)
    return { type, label: cards[type].name, desc: cards[type].desc, icon: cards[type].icon, family: cards[type].family, fresh }
  }

  const test = sampled ? null : works ? found.tests?.[checks.at] ?? null : tests[run.at]
  const verdict = !sampled && !works && ended && (reportedFailure(runOf) ?? (runOf.fail?.at?.tick !== undefined ? failureText(runOf.fail) : null))
  // What a test shows: on a tick board, the ticks run so far; on a board run once, the result once it has run.
  const ran = ended || !run.run
  const upTo = (list) => list.map((v, t) => (run.run && t <= at ? v : undefined))
  const offered = (table || (works && caughtAt < 0) ? [] : entries({ task: level, test, run: runOf, sample: sampled?.want ?? null })).map((e) => (!('got' in e) ? e : timed ? { ...e, got: upTo(e.got) } : ran ? e : { ...e, got: undefined }))
  // A task may draw a shape in views of its own (its `views`): on its cards, in its results and its details.
  const views = useMemo(() => (level.views ? { ...game, views: { ...game.views, ...level.views } } : game), [game, level.views])
  const rows = rowsOf(level.results, offered, views.views)
  // Arrows in the plane share one frame across the board and the results: as far as the test's values and the whole
  // run's reach, so it holds still while a run plays.
  const extent = extentOf([...(runOf?.values?.values() ?? []), ...offered.flatMap((e) => [e.given, e.want, e.got])].filter((v) => VIEWS.plane.fits(v)))
  // Each value's view is kept by task; a port may say the one it starts in, and in the studio's editor switching a
  // port's view writes it there.
  const authoring = useEdit()
  const scope = useMemo(() => {
    const ports = [...(level.inputs ?? []), ...(level.outputs ?? [])]
    const names = new Set(ports.map((p) => p.name))
    return {
      scope: entry.key,
      starts: Object.fromEntries(ports.filter((p) => p.view).map((p) => [p.name, p.view])),
      author: (of) => (authoring && names.has(of) ? (view) => authoring.start({ port: of, view }) : null),
    }
  }, [entry.key, level, authoring])
  const scene = figure?.({ task: level, test, run: (timed ? run.run : ended || onSample) ? runOf : null, at: timed && run.run ? at : -1 })
  // What the work on view gives on a row: its outputs, or on a board run tick by tick where it first goes wrong.
  const gave = (r) => (!r.ticks ? level.outputs.map((o) => L(show(r.outputs[o.name] ?? null))).join(' · ')
    : !r.fail ? tr('和对的一样', 'As a sound one')
    : r.fail.at?.tick === undefined ? L(finalFailure(r))
    : tr(`第 ${r.fail.at.tick} 拍给出 ${L(show(r.fail.got))}`, `${L(show(r.fail.got))} at tick ${r.fail.at.tick}`))
  const gives = (k) => (run.over && found.works ? gave(found.works[run.at][k]) : null)
  const written = works && (
    <Checks
      phone={onPhone} cells={checks.cells} rows={checks.rows} onChange={checks.set} fixed onPick={checks.pick}
      rowClass={(k) => k === checks.at ? 'is-on' : ''}
      formTitle={(k) => T(`第 ${k + 1} 行`, `Row ${k + 1}`)}
      result={{
        label: T('这一样给出'),
        empty: '—',
        at: (k) => {
          const text = gives(k)
          return text === null ? null : { text, tone: found.works[run.at][k].fail || found.works[run.at][k].error ? 'wrong' : null }
        },
      }}
      verdict={run.over ? { pass: !uncaught(run.at), text: uncaught(run.at) || tr('挡住了。') } : null}
    />
  )
  const results = works
    ? caughtAt < 0 ? written : <>{written}<Results rows={rows} text={show} verdict={[]} at={-1} count={test.ticks} marks={runOf.fail?.at?.tick !== undefined ? [runOf.fail.at.tick] : []} /></>
    : <Results rows={rows} text={show} verdict={[verdict, run.run?.over && run.run.final]} at={timed && run.run ? at : -1} count={test?.ticks ?? 0} marks={timed && ended && runOf.fail?.at?.tick !== undefined ? [runOf.fail.at.tick] : []} />
  // A table of cases: a row a test, what the board gives on each as the run reaches it (before a run, on the row picked).
  const ins = kind.portsIn(level)
  const out = kind.portsOut(level)[0]?.name
  const said = told?.(level)
  const cases = table && (
    <div className="cs-cases">
      {said && <p className="cs-said">{L(said.label)} <b>{L(said.text)}</b></p>}
      <CircuitCheckTable
        play={table(level)} inputs={ins.map((p) => ({ key: p.name, label: p.label }))} at={run.at} select={run.select}
        rows={tests.map((t, k) => ({
          given: Object.fromEntries(ins.map((p) => [p.name, show(t.inputs[p.name])])),
          want: show(t.expect[out]),
          got: (run.run ? k < run.run.results.length : k === run.at) ? show(checked.runs[k].outputs[out]) : '',
          state: run.states[k],
        }))}
      />
      {run.over && <p className={`rv-verdict ${run.passed ? 'is-pass' : 'is-fail'}`}>{L(run.passed ? says.pass : run.run.final || says.fail)}</p>}
    </div>
  )
  // The scene comes first: beside the results on a desktop, above them on a phone.
  const strip = cases || (scene ? <div className="cs-told"><div className="cs-scene">{scene}</div><div className="cs-rows">{results}</div></div> : results)

  return (
    <SettingsContext.Provider value={views}>
      <ViewScope.Provider value={scope}>
        <PlaneExtent.Provider value={extent}>
        <CircuitLevel
          stages={stages}
          screen={screen}
          board={works ? { ...board, key: run.at, circuit: placed[run.at] ?? given[run.at], change: (next, { keep = false } = {}) => keep && setPlaced((p) => ({ ...p, [run.at]: next })) } : board}
          run={run}
          className={`cs-level ${className}`.trim()}
          parts={parts}
          trayParts={definedFaces ? undefined : { ...kind.wiring(level, course), valueView: () => game.views?.grid?.[0] ?? 'value' }}
          defined={definedFaces}
          items={works ? [] : palette.map(itemOf)}
          folded={works ? [] : folded.map(itemOf)}
          defaults={defaults}
          view={view}
          card={{
            body,
            outNote: (node, key, ctx) => {
              const v = valueOf(node, key, ctx.view)
              return v === undefined ? null : L(show(v))
            },
            thumb: (n, ctx) => (ctx.board.parts.outputs(n) ? null : value(n, ctx)),
            ...faces,
          }}
          canvas={canvas}
          brief={{ hint: level.hint, children: readouts && <Readouts items={readouts(level, drawn)} /> }}
          describe={(n) => (BUILT[n.type] ? builtBy(n.type, n.params).builds.desc : kind.isFixed(n.type) || !cards[n.type] ? null : game.textAt(cards[n.type], level.id)?.desc)}
          results={strip}
          tabs={!table}
          words={works ? { go: tr('运行检验'), done: tr('都挡住了') } : { go: L(says.go ?? (judged ? WORDS.check : WORDS.run)), done: L(says.done ?? WORDS.passed) }}
          sheet={sheet ? (node, ctx) => sheet(node, ctx, (key) => (v) => !ctx.readOnly && setParam(node, key, v)) : timed ? tickDetail : undefined}
          details={details || (!sheet && Boolean(timed))}
          packed={{
            open: (node) => {
              const inside = BUILT[node.type]?.opens?.(node.params)
              return inside && { ...inside, parts: partsFor(inside.level, circuit, { cards, portLabels }) }
            },
            edit: (node) => {
              const builder = builtBy(node.type, node.params)
              openRef('level', builder.id, builder.task)
            },
            trace: () => (timed ? (tick?.trace ? { trace: tick.trace } : null) : whole ? { trace: runOf.trace } : { trace: runOf.trace, ...(run.run && shown.at >= 0 ? { upTo: shown.at, step: runOf.trace[shown.at] } : {}) }),
          }}
        />
        </PlaneExtent.Provider>
      </ViewScope.Provider>
    </SettingsContext.Provider>
  )
}

/**
 * The screen of a domain on the circuit base, from what the domain declares (its ui/screen.js; plain data and pure
 * functions, no component of its own):
 *
 *   play         the domain's run.js whole: its runLevel, entries, and where it has them show (how a value reads; else
 *                the kit's valueText), once (which tasks run the board once a test) and check (a row the player
 *                wrote as one of its tests, for a task that gives works: engine/caught.js) and cells (what such
 *                a row is made of, where it is not a number a card: Checks.jsx)
 *   course(game) → the course read the screen plays (circuit-game.js: game.circuit)
 *   says, portLabels?, words?, judged?, canvas?, sample?, table?, told?, final?, score?, readouts?   as CircuitScreen
 *                takes them
 *   registers?   what registerCards takes: the settings of the cards a tick board keeps registers with
 *   scene?({ task, test, run, at }) → [{ part, ...props }]   the test's scene, each a kit part by name (SCENES:
 *                'chart' …) with the props it draws from
 *   parts?       { name: Component }, scene parts of the domain's own, for what the kit has no part for yet
 */
export function circuitScreen({ play, registers, scene, parts = {}, course, ...declared }) {
  const played = { run: play.runLevel, entries: play.entries, show: play.show ?? valueText, once: play.once, check: play.check, cells: play.cells }
  const fields = registers ? registerCards(registers) : {}
  const drawn = { ...SCENES, ...parts }
  const figure = scene && ((told) => (scene(told) ?? []).map(({ part, ...props }, k) => {
    const Part = drawn[part]
    return <Part key={k} {...props} />
  }))
  return function Screen(screen) {
    return <CircuitScreen screen={screen} course={course(screen.game)} defined={screen.game.defined} {...played} {...declared} {...fields} figure={figure} />
  }
}

/**
 * A part the player built, in the components box: the board it runs, read only (../circuit/Inside.jsx PackedBoard), the
 * parts it holds opening in turn. `course` is the course read, `cards` and `portLabels` as CircuitScreen takes them.
 */
export function BuiltBoard({ course, type, cards, portLabels = {} }) {
  const drawn = (inside) => inside && { ...inside, parts: partsFor(inside.level, course.forTask(inside.level), { cards, portLabels }) }
  const open = (node, at) => drawn(course.forTask(at.level).BUILT[node.type]?.opens?.(node.params))
  const edit = (node, at) => {
    const builder = course.forTask(at.level).builtBy(node.type, node.params)
    openRef('level', builder.id, builder.task)
  }
  const describe = (node, ctx) => (ctx.board.parts.role(node) === 'part' && !course.BUILT[node.type] ? L(cards[node.type]?.desc) : null)
  return <PackedBoard top={drawn(course.BUILT[type].opens())} open={open} edit={edit} card={{}} describe={describe} />
}
