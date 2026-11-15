import { sourceOf, srcNode } from '../engine/wire-source.js'
import { VIEWS, valueText } from '../engine/views.js'
import { useMemo, useState } from 'react'
import { Dock } from './BoardControls.jsx'
import InteractiveDrawing from './InteractiveDrawing.jsx'
import TracePanel from './TracePanel.jsx'
import { stagesOf } from '../engine/stages.js'
import { CircuitBoard } from 'lucide-react'
import { MISSING } from '../engine/circuit.js'
import { traceSteps, viewAt } from '../engine/trace.js'
import { outputsOf } from '../circuit/model.js'
import { isFixed } from '../circuit/presets.js'
import { runTestGroups, TEST_WORDS } from '../engine/tests.js'
import CircuitLevel, { useLevelBoard, useLevelRun } from './CircuitLevel.jsx'
import { rowsOf } from '../engine/views.js'
import { SettingsContext } from './useSetting.js'
import Results from '../views/Results.jsx'
import { failureText } from '../engine/failure-text.js'
import { failureOf } from '../engine/test-run.js'
import { ViewScope } from '../views/choice.js'
import { valueKey } from '../views/picks.js'
import Show from '../views/Show.jsx'
import { PlaneExtent } from '../views/plots/Plane.jsx'
import { extentOf } from '../views/plots/plane.js'
import { L, T } from './i18n.js'
import { WORDS } from './words.js'
import { partsFor, packedView } from '../circuit/board-parts.js'
import { lookupBoard } from '../circuit/packed-boards.js'
import { definedItem } from './parts/faces.jsx'
import { optionsOf } from '../engine/parts/define.js'
import { useEdit } from './edit.js'
import { PHONE, useMedia } from './useMedia.js'
import Readouts from './Readouts.jsx'
import CircuitCheckTable from './plays/CircuitCheckTable.jsx'
import StepLog from './StepLog.jsx'
import { useTraining } from './TrainingControls.jsx'
import './training.css'

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
//   course                the course read (engine/board-course.js circuitCourse): forTask(task) → the task's view (its
//                         `defined`, when it registers parts of its own per task: engine/board-view.js)
//   cards                 { type: { name, desc, icon, family } } its cards as the tray and boards show them (a fixed
//                         card it leaves out is drawn as a source in the family 'given', or a sink in 'end')
//   run(task, board, partOf, { traced, traceCount }) → { runs, fail, pass, score?, constraint? }   each run holds fail?, error?, ticks? | trace?, …
//   (trace only the first `traceCount` tests; a test with a `label` is called by it)
//   once?(task)           on a tick board, whether this task's tests each run the board once (a run then holds a trace,
//                         as on a board run once, and the results show it so)
//   show(value, { task, test })   a value in words, as a card and the results show it, in the words of the task and
//                         the test on view (a grid is drawn: ../views/Show.jsx)
//   entries({ task, test, run, sample }) → what the results area can show of a test (../engine/views.js: an entry a
//                         port, with its shape and the values given, got and wanted; on the sample, test is null and
//                         `sample` the reference board's run on it)
//   figure?({ task, test, run, at }) → a picture of the test by the results (a scene it stands for): `run` once there
//                         is one to show (on a board run tick by tick, from its first tick), `at` the tick shown
//   judged                a board run once is checked in one go, with nothing to step through
//   sample?(task, board) → the board's run on the task's `sample`, a tab after the tests, never judged (judged boards)
//   ready?(board, held, task)   the board as the task holds it (held: the parts its tray holds), on opening and every
//                         change (a preset locked back in…)
//   settings?(node, ctx)  a card's pickers: [{ key, label, value, options: [[value, label], …] }]
//   defaults?(type)       a new card's settings
//   portLabels?           { type: { port: label } }               defined?  the game's pieces.json parts (CircuitLevel)
//   inspect?(node, ctx)   what a defined part's detail shows of its values (by default, as its card)
//   language?(task, test) the language a defined part's tree setting is built in (../strip/TreePick.jsx)
//   context?(task, test)  what a resource sees on the screen when it works out a setting's options (`from`)
//   sheet?(node, ctx, set), details   a card's detail (CircuitLevel sheet; set as settings' is), offered from desktop
//                         card headers too (details); on a board run tick by tick, by default its settings and each of
//                         its values tick by tick so far, each switched between its views there (tickDetail)
//   card?                 faces of a card over the base's (CircuitLevel card)
//   canvas                { height } of a part's card on the desktop board
//   words                 what the game calls its tests (../engine/tests.js TEST_WORDS)
//   says?                 { go?, done?, pass?, fail? } the run button's words, and a table's verdicts
//   table?(task) → play   the tests are the rows of a table (CircuitCheckTable.jsx, its target column the play's),
//                         picked there rather than in tabs; a run goes down it a row at a time, with no steps inside
//   told?(task, test) → [{ label?, text }]   lines the task says, under it (a sentence, a script to follow)
//   readouts?(task, board, report) → [{ value, label }]   the numbers under the task (Readouts.jsx)
//   log                   a board run once keeps a step log under its results (StepLog.jsx): every step run so far, the
//                         card named after the built parts it is in, what it gave or why it failed, the current one marked
//   className             the domain's class on the level

const reportedFailure = (run) => run.error ?? (run.final ? null : failureText(run.fail))
const finalFailure = (run) => run.fail?.at?.tick === undefined ? reportedFailure(run) : run.error

/** A setting picked from a list, on a card. */
function CardField({ label, value, options, onChange, disabled }) {
  return (
    <label className="cs-field">
      <span>{L(label)}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} onPointerDown={(e) => e.stopPropagation()}>
        {options.map(([v, text]) => <option key={v} value={v}>{L(text)}</option>)}
      </select>
    </label>
  )
}

/** What a card shows of a value (the kit's card scene, ../views/Show.jsx, in the view kept for it: `of`), or why it
 * has none. */
function Value({ value, error, show, of, views }) {
  if (value === undefined) return <span className={`cs-error ${!error || error === MISSING ? 'is-missing' : ''}`}>{!error || error === MISSING ? L(WORDS.notWired) : L(error)}</span>
  return <Show value={value} scene="card" text={show} of={of} views={views} />
}

const noWorld = () => null

export default function CircuitScreen({ screen, course, cards, run: runOn, show: showOf, entries, figure, judged = false, once, sample, ready, fresh, keep, clearable, settings, defaults, portLabels = {}, defined: gameDefined = null, inspect, sheet, details = false, card: faces = {}, canvas = { height: 120 }, words = TEST_WORDS, says = {}, table = null, told, readouts, valueViews, viewControls, language, context, training, testLabel, useWorld = noWorld, log = false, revealOnPass = false, className = '' }) {
  const { game, level: entry, solved, flags, progress } = screen
  const level = entry.source
  const circuit = course.forTask(level)
  // The parts defined as data a task holds: its view's, where its course registers some per task, else the game's.
  const defined = circuit.defined ?? gameDefined
  const { board: kind, BUILT, pieces } = circuit
  const onPhone = useMedia(PHONE)
  const timed = Boolean(kind.ticks) && !once?.(level)
  circuit.syncOwn(progress.built, progress)
  const parts = useMemo(() => partsFor(level, circuit, { cards, portLabels }), [level, circuit, cards, portLabels])
  const packed = useMemo(() => packedView(course, { cards, portLabels }), [course, cards, portLabels])
  const { shown: palette, folded, types } = useMemo(() => circuit.offerIn(level, flags), [circuit, level, flags])
  const held = useMemo(() => new Set(types), [types])
  const hold = (b) => (ready ? ready(b, held, level) : b)
  const opening = () => circuit.opening(level, progress)
  const fitted = (saved) => {
    if (kind.fits(saved, level, circuit)) {
      const prepared = hold(saved)
      if (prepared === saved || kind.fits(prepared, level, circuit)) return prepared
    }
    return hold(opening())
  }
  const state = useLevelBoard(screen, { open: fitted, fresh: () => hold(fresh ? fresh(level) : opening()), clearable })
  const board = ready ? { ...state, change: (next, options) => state.change(hold(next), options) } : state
  const { circuit: drawn, change } = board
  const practice = useTraining(level, drawn, change, training)
  const stages = useMemo(() => stagesOf({ task: level, board: board.circuit, chain: circuit.stageChain(level, progress.built), isFixed: (n) => kind.isFixed(n.type) }), [level, board.circuit, circuit, progress.built, kind])
  const [alreadySolved] = useState(solved)
  const revealed = alreadySolved || (revealOnPass && solved)
  const { shown: tests, checked, hidden } = useMemo(() => runTestGroups(level, revealed,
    (task, traceCount) => runOn(task, drawn, circuit.partOf, { traced: true, traceCount })),
  [level, revealed, board.version, circuit, progress.built])
  const stepsOf = (r) => (timed ? r.ticks.map((tick) => tick.failed ? { ...tick, failed: failureText(tick.failed) } : tick) : r.trace)
  const run = useLevelRun(screen, board, {
    tests: [...tests.map((t, k) => ({ label: L(t.label ?? testLabel?.(level, t, k) ?? words.label(k)), hidden: t.hidden })), ...(judged && level.sample ? [{ label: L(WORDS.sample), sample: true }] : [])],
    ...(judged
      ? { judge: () => ({ pass: checked.pass, score: checked.score, results: checked.runs.map((r) => ({ pass: !failureOf(r), reason: L(finalFailure(r)) ?? '' })) }) }
      : { steps: { of: (k) => (table ? [] : stepsOf(checked.runs[k])), check: (k) => finalFailure(checked.runs[k]) ?? '', final: L(checked.constraint) } }),
    hidden: hidden && {
      ...hidden,
      words: {
        note: L(words.note(hidden.count)),
        failed: (n) => L(words.failed(n, hidden.count)),
      },
    },
    score: () => checked.score,
    ...(useWorld !== noWorld && {
      guard: () => surface.guard?.(),
      onFail: (last) => surface.fail?.(last, checked.runs),
      onSolve: (score) => surface.solve ? surface.solve(score) : screen.solve(score),
    }),
    ...(keep && { onSolve: (s) => { const work = keep(level, drawn); if (work) screen.save(work); screen.solve(s) } }),
  })

  // The sample (judged boards): the board's run on it, and the reference's, never judged.
  const onSample = Boolean(level.sample) && run.at === tests.length
  const sampled = useMemo(() => (onSample ? { run: sample(level, drawn), want: sample(level, level.solution) } : null), [onSample, level, board.version])
  // The step shown: the one a run is on (or its last, once past it). Before a run a tick board shows its first tick,
  // as a preview, and a board run once the whole run; a judged board always its whole run.
  const whole = judged || Boolean(table)
  const runOf = sampled ? sampled.run : checked.runs[run.at]
  const shown = run.playback.shown(run.at)
  // A value in words: in the words of the task and of the test on view.
  const onView = tests[run.at] ?? null
  const show = (v) => showOf(v, { task: level, test: onView })
  const at = !run.run ? (timed ? 0 : -1) : shown.list.length ? (shown.at >= 0 ? shown.at : shown.list.length - 1) : -1
  const tick = timed && at >= 0 ? runOf.ticks[at] : null
  const computed = timed ? tick ?? undefined : whole || !run.run ? runOf : viewAt(runOf.trace, at)
  const ended = whole ? run.over : Boolean(run.run && (run.run.test > run.at || run.run.over))

  const failWorld = ({ panel, ...info }) => screen.fail(panel ? { ...info, extra: <TracePanel panel={panel} /> } : info)
  const surface = useWorld({ screen: { ...screen, fail: failWorld }, task: level, test: onView, run, report: runOf, held, at, ended, circuit: drawn, change, version: board.version })
  const view = surface?.value ?? computed

  const setParam = (node, ctx, key, value) => {
    if (!ctx.readOnly) ctx.setParams(node, { ...node.params, [key]: value })
  }
  // A card shows its value; a card on the right, what reaches it (as its own value: the output's view).
  const valueOf = (node, key, v) => v.values.get(sourceOf(node.id, key))
  const value = (node, ctx) => {
    const into = valueOf(node, null, ctx.view) === undefined && ctx.board.parts.role(node) === 'sink' && ctx.board.circuit.wires.find((w) => w.to === node.id)
    const of = valueKey(ctx, node.id)
    const drawn = into ? ctx.view.values.get(into.from) : valueOf(node, null, ctx.view)
    return into ? <Value value={ctx.view.values.get(into.from)} error={ctx.view.errors.get(srcNode(into.from))} show={show} of={of} views={valueViews?.(ctx.board.level ?? level, node, drawn)} /> : <Value value={valueOf(node, null, ctx.view)} error={ctx.view.errors.get(node.id)} show={show} of={of} views={valueViews?.(ctx.board.level ?? level, node, drawn)} />
  }
  const showsValue = (node, ctx) => !ctx.board.parts.outputs(node) || (ctx.board.parts.role(node) === 'source' && outputsOf(ctx.board.parts, node).some(({ key }) => key === null))
  const cardSettings = (node, ctx) => settings?.(node, { ...ctx, task: ctx.board.level ?? level }).map(({ key, label, value, options }) => (
    <CardField key={key} label={label} value={value} options={options} disabled={ctx.readOnly || isFixed(node, key)}
      onChange={(picked) => setParam(node, ctx, key, options.find(([option]) => String(option) === picked)[0])} />
  ))
  const body = (node, ctx) => {
    const drawing = ctx.path.length ? null : surface?.cardDrawing?.(node, ctx.readOnly)
    const choices = ctx.readOnly || ctx.path.length ? [] : surface?.choices?.(node) ?? []
    return (
      <div className="cs-card">
        {drawing && <InteractiveDrawing {...drawing} />}
        {choices.length > 1 && <CardField label={T('操作')} value={node.type} options={choices} onChange={(type) => surface.swap(node, type)} />}
        {cardSettings(node, ctx)}
        {showsValue(node, ctx) && value(node, ctx)}
      </div>
    )
  }
  // A card's detail on a board run tick by tick: each of its values (a sink: what reaches it) over the ticks so far, a
  // lane each in the detail scene; the shape a port's results row gives it, else bits while every value is 0 or 1.
  // Inside a packed part, what its card shows.
  const lanesOf = (node, { board: b }) => {
    if (b.parts.role(node) !== 'sink') return outputsOf(b.parts, node).map((o) => ({ key: sourceOf(node.id, o.key), of: sourceOf(node.id, o.key), label: o.key === null ? null : o.label }))
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
        {cardSettings(node, ctx)}
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
  // A setting's options worked out on a card: by its resource, on what is wired into the card on the test on view.
  const insOf = (node, ctx) => Object.fromEntries((ctx?.board?.circuit ?? drawn).wires.filter((w) => w.to === node.id).map((w) => [w.port, ctx?.view?.values.get(w.from)]))
  const definedFaces = useMemo(() => defined && {
    ...defined,
    allowed,
    language: language?.(level, onView),
    options: (def, setting, node, ctx) => optionsOf(setting, def, { params: node?.params, ins: node ? insOf(node, ctx) : {}, ctx: { ...context?.(level, onView), node } }, defined.ops),
    value: (node, ctx, output, face) => (face === 'detail' && inspect ? inspect(node, ctx) : output != null ? <Value value={valueOf(node, output, ctx.view)} error={ctx.view.errors.get(node.id)} show={show} of={valueKey(ctx, sourceOf(node.id, output))} views={valueViews?.(ctx.board.level ?? level, node, valueOf(node, output, ctx.view))} /> : ctx.board.parts.outputs(node) ? null : value(node, ctx)),
  }, [defined, inspect, allowed, level, onView, drawn, valueViews])

  const itemOf = (type) => {
    const fresh = entry.fresh?.includes(type)
    if (BUILT[type]) {
      const b = pieces[type]
      return { type, label: b.name, desc: b.desc, icon: CircuitBoard, family: 'built', packed: true }
    }
    if (defined?.of(type)) return definedItem(type, defined.of(type), { fresh }, allowed)
    return { type, label: cards[type].name, desc: cards[type].desc, icon: cards[type].icon, family: cards[type].family, fresh }
  }

  const test = sampled ? null : tests[run.at]
  const verdict = !sampled && ended && (reportedFailure(runOf) ?? (runOf.fail?.at?.tick !== undefined ? failureText(runOf.fail) : null))
  // What a test shows: on a tick board, the ticks run so far; on a board run once, the result once it has run.
  const ran = ended || !run.run
  const upTo = (list) => list.map((v, t) => (run.run && t <= at ? v : undefined))
  const offered = (table ? [] : entries({ task: level, test, run: runOf, sample: sampled?.want ?? null, judged: ended })).map((e) => (!('got' in e) ? e : timed ? { ...e, got: upTo(e.got) } : ran ? e : { ...e, got: undefined }))
  // A task may draw a shape in views of its own (its `views`): on its cards, in its results and its details.
  const views = useMemo(() => (level.views ? { ...game, views: { ...game.views, ...level.views } } : game), [game, level.views])
  const rows = rowsOf(level.results, offered, views.views)
  // Arrows in the plane share one frame across the board and the results: as far as the test's values and the whole
  // run's reach, so it holds still while a run plays.
  const extent = extentOf([...(runOf?.values?.values() ?? []), ...offered.flatMap((e) => [e.given, e.want, e.got])].filter((v) => VIEWS.plane.fits(v)))
  // Each value's view is kept by task; a port may say the one it starts in, and in the studio's editor switching a
  // port's view writes it there.
  const authoring = useEdit()
  const profileScan = useState(0.5)
  const scope = useMemo(() => {
    const ports = [...kind.portsIn(level), ...kind.portsOut(level)]
    const names = new Set(ports.map((p) => p.name))
    return {
      scope: entry.key,
      controls: viewControls?.(level),
      authoring: Boolean(authoring),
      starts: Object.fromEntries(ports.filter((p) => p.view).map((p) => [p.name, p.view])),
      author: (of) => (authoring && names.has(of) ? (view) => authoring.start({ port: of, view }) : null),
    }
  }, [entry.key, level, kind, authoring, viewControls])
  const scene = surface?.drawing ? <><InteractiveDrawing {...surface.drawing} />
    {surface.note && <p className="circuit-world-note">{L(surface.note)}</p>}
    {surface.returnAction && <button className="kit-btn circuit-world-return" type="button" onClick={surface.returnAction.onClick}>{L(surface.returnAction.label)}</button>}
    <TracePanel panel={surface.after} /></> : figure?.({ task: level, test, run: (timed ? run.run : ended || onSample) ? runOf : null, at: timed && run.run ? at : -1 })
  // The step log of a board run once: the steps shown so far, each card named on the board it is on (a built part's
  // inside, at any depth), its value in the words of the task and the test on view.
  const logged = log && !timed && !whole && run.run && runOf?.trace
  const named = useMemo(() => {
    if (!logged) return []
    const boardAt = lookupBoard({ circuit: drawn, level, parts }, packed.open)
    return traceSteps(runOf.trace, {
      nameAt: (path, id) => {
        const at = boardAt(path)
        const node = at?.circuit.nodes.find((n) => n.id === id)
        return node ? at.parts.label(node) : null
      },
      partName: (type) => cards[type]?.name ?? type,
    })
  }, [logged, runOf, drawn, level, parts, packed, cards])
  const stepLog = logged && <StepLog steps={named.slice(0, shown.list.length).map((s) => ({ label: s.label, value: s.value === undefined ? null : <Show value={s.value} scene="card" text={show} />, failed: s.failed }))} at={shown.at} />
  const final = judged
    ? ended && (checked.constraint || (run.hidden?.failed && run.hidden.note))
    : run.run?.over && run.run.final
  const results = <><Results key={run.at} rows={rows} text={show} verdict={[verdict, final]} at={timed && run.run ? at : -1} count={test?.ticks ?? 0} marks={timed && ended && runOf.fail?.at?.tick !== undefined ? [runOf.fail.at.tick] : []} />{stepLog}</>
  // A table of cases: a row a test, what the board gives on each as the run reaches it (before a run, on the row picked).
  const ins = kind.portsIn(level)
  const out = kind.portsOut(level)[0]?.name
  const cases = table && (
    <div className="cs-cases">
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
  const strip = cases || (surface?.drawing && !rows.length ? <div className="cs-scene">{scene}{results}</div> : scene ? <div className="cs-told"><div className="cs-scene">{scene}</div><div className="cs-rows">{results}</div></div> : results)

  return (
    <SettingsContext.Provider value={views}>
      <ViewScope.Provider value={viewControls ? { ...scope, profileScan } : scope}>
        <PlaneExtent.Provider value={extent}>
        <CircuitLevel
          stages={stages}
          screen={screen}
          board={training ? { ...board, clear: () => { board.clear(); practice.clear() } } : surface?.busy ? { ...board, change: () => {}, clear: () => {} } : board}
          run={surface?.busy ? { ...run, select: () => {} } : run}
          className={`cs-level ${className}`.trim()}
          parts={parts}
          trayParts={definedFaces ? undefined : { ...kind.wiring(level, course), valueView: () => game.views?.grid?.[0] ?? 'value' }}
          defined={definedFaces}
          items={palette.map(itemOf)}
          folded={folded.map(itemOf)}
          types={types}
          defaults={defaults}
          view={view}
          card={{
            body,
            outNote: (node, key, ctx) => {
              const sensed = ctx.path.length ? undefined : surface?.portValue?.(node, key)
              if (sensed !== undefined) return L(sensed)
              const v = valueOf(node, key, ctx.view)
              return v === undefined ? null : L(show(v))
            },
            thumb: (node, ctx) => {
              const drawing = ctx.path.length ? null : surface?.cardDrawing?.(node, ctx.readOnly)
              return drawing ? <InteractiveDrawing {...drawing} /> : showsValue(node, ctx) ? value(node, ctx) : null
            },
            ...(surface?.wireState && { wireState: (wire, ctx) => ctx.path.length ? undefined : surface.wireState(wire) }),
            // A frame's region says at its edge what it opens with, and by its result what the frame gives, or why not.
            regionNote: (node, region, ctx) => {
              const v = valueOf(node, region, ctx.view)
              return v === undefined ? null : <Value value={v} show={show} />
            },
            resultNote: (node, _region, ctx) => <Value value={valueOf(node, null, ctx.view)} error={ctx.view.errors.get(node.id)} show={show} />,
            ...faces,
          }}
          canvas={canvas}
          brief={{ hint: surface?.hint ?? level.hint, text: surface?.text, tip: surface?.tip, children: <>{(told?.(level, onView) ?? []).map((line, k) => <p key={k} className="cs-said">{line.label && <>{L(line.label)} </>}<b>{L(line.text)}</b></p>)}{readouts && <Readouts items={readouts(level, drawn, checked)} />}{!onPhone && practice.panel}</> }}
          below={onPhone && practice.panel}
          describe={(n) => (BUILT[n.type] ? pieces[n.type].desc : kind.isFixed(n.type) || !cards[n.type] ? null : game.textAt(cards[n.type], level.id)?.desc)}
          results={strip}
          pad={surface?.pad ? <Dock pad={surface.pad} /> : undefined}
          tabs={!table}
          words={{ go: L(says.go ?? (judged ? WORDS.check : WORDS.run)), done: L(says.done ?? WORDS.passed) }}
          sheet={sheet ? (node, ctx) => sheet(node, ctx, (key) => (v) => setParam(node, ctx, key, v)) : timed ? tickDetail : undefined}
          details={details || (!sheet && Boolean(timed))}
          packed={{
            open: packed.open,
            edit: packed.edit,
            trace: () => {
              const trace = timed ? surface?.trace ?? tick?.trace : runOf.trace
              if (!trace) return null
              return !timed && !whole && run.run && shown.at >= 0
                ? { trace, upTo: shown.at, step: trace[shown.at] }
                : { trace }
            },
          }}
        />
        {surface?.notice}
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
 *                the kit's valueText) and once (which tasks run the board once per test)
 *   course(game) → the course read the screen plays (circuit-game.js: game.circuit)
 *   says, portLabels?, words?, canvas?, sample?, table?, figure?, told?, readouts?   as CircuitScreen
 *                takes them
 */
export function circuitScreen(config, { play, course, ...declared }) {
  const played = { run: play.runLevel, entries: play.entries, show: play.show ?? valueText, once: play.once }
  const judged = config.judge === 'once' || config.judge === 'outputs'
  const revealOnPass = config.checks === 'afterPass'
  return function Screen(screen) {
    return <CircuitScreen screen={screen} course={course(screen.game)} defined={screen.game.defined} {...played} {...declared} judged={judged} revealOnPass={revealOnPass} className={config.layout} />
  }
}
