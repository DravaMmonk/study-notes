import { useMemo, useState } from 'react'
import { stagesOf } from '../engine/stages.js'
import { ArrowRightFromLine, CircuitBoard } from 'lucide-react'
import { MISSING } from '../engine/circuit.js'
import { viewAt } from '../engine/trace.js'
import { outputsOf, srcOf } from '../circuit/model.js'
import { TEST_WORDS } from '../engine/circuit-domain.js'
import CircuitLevel, { useLevelBoard, useLevelRun } from './CircuitLevel.jsx'
import { rowsOf } from '../engine/views.js'
import { SettingsContext } from './useSetting.js'
import Results from '../views/Results.jsx'
import { ViewScope } from '../views/choice.js'
import { valueKey } from '../views/picks.js'
import Show from '../views/Show.jsx'
import { L, tr, T } from './i18n.js'
import { WORDS } from './words.js'
import { openRef } from './refs.js'
import { definedItem } from './parts/faces.jsx'
import { useEdit } from './edit.js'
import NumberField from './NumberField.jsx'
import { PHONE, useMedia } from './useMedia.js'

// The level screen of a domain on the circuit base (engine/circuit-domain.js, the game's course read as
// `game.circuit`), on the kit's circuit level (CircuitLevel.jsx): the level's fixed cards down the left and right
// (named by the ports its task gives them), the parts it holds between, the parts the player built as packed parts
// that open to show the board they run. A run plays every test in turn and stops on the first that fails; hidden tests
// run with every run but say only how many fail, and join the list once the level is solved. A board run tick by tick
// (the board's `ticks`) plays a tick a step, every card showing its value at the tick shown and the results' time axis
// following along; a board run once plays every card the engine computes, a step each, or, `judged`, checks every test
// at once and shows each test's whole run. Under the board, the kit's results area (views/Results.jsx): the rows the
// task lays out (`results`) or the domain's default ones, of the entries the domain offers.
//
// A domain brings only what is its own:
//   cards                 { type: { name, desc, icon, family } } its cards as the tray and boards show them (a fixed
//                         card it leaves out is drawn as a source in the family 'given', or a sink in 'end')
//   run(task, board, partOf) → { runs: [{ fail?, error?, ticks? | trace?, … }] }   its run.js
//   says(run)             what a failed run says
//   show(value)           a value in words, as a card and the results show it (a grid is drawn: ../views/Show.jsx)
//   entries({ task, test, run, sample }) → what the results area can show of a test (../engine/views.js: an entry a
//                         port, with its shape and the values given, got and wanted; on the sample, test is null and
//                         `sample` the reference board's run on it)
//   figure?({ task, test }) → a picture of the test under the results (a scene it stands for)
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
//   canvas                { width, height } of a part's card on the desktop board
//   words                 what the game calls its tests (../engine/circuit-domain.js TEST_WORDS)
//   className             the domain's class on the level

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
 * and a start value are any number, typed (NumberField), and a start value is 0 until set. A new card's settings are
 * its defaults written in (the first register, 0, the first form), so the card shows them.
 */
export function registerCards({ registers, top, forms = {}, numbers = false }) {
  const names = registers.map((r) => [r, r])
  const starts = [['', '—'], ['0', '0'], ['1', '1']]
  const values = Array.from({ length: top + 1 }, (_, k) => [String(k), String(k)])
  const first = (type) => Object.keys(forms[type])[0]
  return {
    defaults: (type) => (type === 'reg' ? { reg: registers[0], ...(numbers ? { start: '0' } : {}) } : type === 'keep' ? { reg: registers[0] } : type === 'const' ? { value: '0' } : forms[type] ? { form: first(type) } : {}),
    settings: (node, set) => {
      const p = node.params ?? {}
      const reg = <CardField label={T('名字', 'Name')} value={p.reg ?? registers[0]} options={names} onChange={set('reg')} />
      const start = numbers ? <CardNumber label={T('初值', 'Start')} value={p.start ?? ''} onChange={set('start')} /> : <CardField label={T('初值', 'Start')} value={p.start ?? ''} options={starts} onChange={set('start')} />
      if (node.type === 'reg') return <>{reg}{start}</>
      if (node.type === 'keep') return reg
      if (node.type === 'const') return numbers ? <CardNumber label={T('数值', 'Value')} value={p.value ?? '0'} onChange={set('value')} /> : <CardField label={T('数值', 'Value')} value={p.value ?? '0'} options={values} onChange={set('value')} />
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
function partsFor(level, circuit, { cards, portLabels, width }) {
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
    cardWidth: (node) => (board.isFixed(node.type) ? 224 : BUILT[node.type] ? Math.max(176, width) : width),
  }
}

export default function CircuitScreen({ screen, cards, run: runOn, says, show, entries, figure, judged = false, sample, ready, settings, defaults, portLabels = {}, defined = null, inspect, sheet, details = false, card: faces = {}, canvas = { width: 156, height: 120 }, words = TEST_WORDS, className = '' }) {
  const { game, level: entry, solved, flags, progress } = screen
  const level = entry.source
  const circuit = game.circuit.forTask(level)
  const { board: kind, BUILT, builtBy } = circuit
  circuit.syncOwn(progress.built)
  const parts = useMemo(() => partsFor(level, circuit, { cards, portLabels, width: canvas.width }), [level, circuit, cards, portLabels, canvas.width])
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
  const board = ready ? { ...state, change: (next, options) => state.change(hold(next), options) } : state
  const { circuit: drawn, change } = board
  const stages = useMemo(() => stagesOf({ task: level, board: board.circuit, chain: circuit.stageChain(level, progress.built), isFixed: (n) => kind.isFixed(n.type) }), [level, board.circuit, circuit, progress.built, kind])
  const [revealed] = useState(solved)
  const tests = useMemo(() => (revealed ? [...level.tests, ...level.hidden.map((t) => ({ ...t, hidden: true }))] : level.tests), [level, revealed])
  const checked = useMemo(() => runOn({ ...level, tests }, drawn, circuit.partOf), [level, tests, board.version, circuit])
  const hidden = revealed ? [] : level.hidden
  const hiddenFailed = useMemo(() => (hidden.length ? runOn({ ...level, tests: hidden }, drawn, circuit.partOf).runs.filter((r) => r.fail || r.error).length : 0), [level, hidden, board.version, circuit])
  const failing = (r) => Boolean(r.fail || r.error)
  const stepsOf = (r) => (kind.ticks ? r.ticks : r.trace)
  const run = useLevelRun(screen, board, {
    tests: [...tests.map((t, k) => ({ label: L(words.label(k)), hidden: t.hidden })), ...(judged && level.sample ? [{ label: L(WORDS.sample), sample: true }] : [])],
    ...(judged
      ? { judge: () => ({ pass: !checked.runs.some(failing), results: checked.runs.map((r) => ({ pass: !failing(r), reason: failing(r) ? L(says(r)) : '' })) }) }
      : { steps: { of: (k) => stepsOf(checked.runs[k]), check: (k) => says(checked.runs[k]) ?? '' } }),
    hidden: {
      count: hidden.length,
      fails: () => hiddenFailed,
      words: {
        note: L(words.note(hidden.length)),
        failed: (n) => L(words.failed(n, hidden.length)),
      },
    },
  })

  // The sample (judged boards): the board's run on it, and the reference's, never judged.
  const onSample = Boolean(level.sample) && run.at === tests.length
  const sampled = useMemo(() => (onSample ? { run: sample(level, drawn), want: sample(level, level.solution) } : null), [onSample, level, board.version])
  // The step shown: the one a run is on (or its last, once past it). Before a run a tick board shows its first tick,
  // as a preview, and a board run once the whole run; a judged board always its whole run.
  const runOf = sampled ? sampled.run : checked.runs[run.at]
  const shown = run.playback.shown(run.at)
  const at = !run.run ? (kind.ticks ? 0 : -1) : shown.list.length ? (shown.at >= 0 ? shown.at : shown.list.length - 1) : -1
  const tick = kind.ticks && at >= 0 ? runOf.ticks[at] : null
  const view = kind.ticks ? tick ?? undefined : judged || !run.run ? runOf : viewAt(runOf.trace, at)
  const ended = judged ? run.over : Boolean(run.run && (run.run.test > run.at || run.run.over))

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
  const definedFaces = useMemo(() => defined && {
    ...defined,
    value: (node, ctx, output, face) => (face === 'detail' && inspect ? inspect(node, ctx) : output ? <Value value={valueOf(node, output, ctx.view)} error={ctx.view.errors.get(node.id)} show={show} of={valueKey(ctx, `${node.id}#${output}`)} /> : ctx.board.parts.outputs(node) ? null : value(node, ctx)),
  }, [defined, inspect])

  const itemOf = (type) => {
    const fresh = entry.fresh?.includes(type)
    if (BUILT[type]) {
      const b = builtBy(type).builds
      return { type, label: b.name, desc: b.desc, icon: CircuitBoard, family: 'built', packed: true }
    }
    if (defined?.of(type)) return definedItem(type, defined.of(type), { fresh }, defined.allowed)
    return { type, label: cards[type].name, desc: cards[type].desc, icon: cards[type].icon, family: cards[type].family, fresh }
  }

  const test = sampled ? null : tests[run.at]
  const failed = shown.list.findIndex((t) => t.failed)
  const verdict = !sampled && ended && (says(runOf) || (failed >= 0 && shown.list[failed].failed))
  // What a test shows: on a tick board, the ticks run so far; on a board run once, the result once it has run.
  const ran = ended || !run.run
  const upTo = (list) => list.map((v, t) => (run.run && t <= at ? v : undefined))
  const offered = entries({ task: level, test, run: runOf, sample: sampled?.want ?? null }).map((e) => (!('got' in e) ? e : kind.ticks ? { ...e, got: upTo(e.got) } : ran ? e : { ...e, got: undefined }))
  // A task may draw a shape in views of its own (its `views`): on its cards, in its results and its details.
  const views = useMemo(() => (level.views ? { ...game, views: { ...game.views, ...level.views } } : game), [game, level.views])
  const rows = rowsOf(level.results, offered, views.views)
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
  const strip = (
    <>
      <Results rows={rows} text={show} verdict={[verdict, run.run?.over && run.run.final]} at={kind.ticks && run.run ? at : -1} count={test?.ticks ?? 0} marks={kind.ticks && ended && runOf.fail?.tick !== undefined ? [runOf.fail.tick] : []} />
      {figure?.({ task: level, test, run: ended || onSample ? runOf : null })}
    </>
  )

  return (
    <SettingsContext.Provider value={views}>
      <ViewScope.Provider value={scope}>
        <CircuitLevel
          stages={stages}
          screen={screen}
          board={board}
          run={run}
          className={`cs-level ${className}`.trim()}
          parts={parts}
          defined={definedFaces}
          items={palette.map(itemOf)}
          folded={folded.map(itemOf)}
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
          brief={{ hint: level.hint }}
          describe={(n) => (BUILT[n.type] ? builtBy(n.type, n.params).builds.desc : kind.isFixed(n.type) || !cards[n.type] ? null : game.textAt(cards[n.type], level.id)?.desc)}
          results={strip}
          words={{ go: L(judged ? WORDS.check : WORDS.run), done: L(WORDS.passed) }}
          sheet={sheet ? (node, ctx) => sheet(node, ctx, (key) => (v) => !ctx.readOnly && setParam(node, key, v)) : kind.ticks ? tickDetail : undefined}
          details={details || (!sheet && Boolean(kind.ticks))}
          packed={{
            open: (node) => {
              const inside = BUILT[node.type]?.opens?.(node.params)
              return inside && { ...inside, parts: partsFor(inside.level, circuit, { cards, portLabels, width: canvas.width }) }
            },
            edit: (node) => {
              const builder = builtBy(node.type, node.params)
              openRef('level', builder.id, builder.task)
            },
            trace: () => (kind.ticks ? (tick?.trace ? { trace: tick.trace } : null) : judged ? { trace: runOf.trace } : { trace: runOf.trace, ...(run.run && shown.at >= 0 ? { upTo: shown.at, step: runOf.trace[shown.at] } : {}) }),
          }}
        />
      </ViewScope.Provider>
    </SettingsContext.Provider>
  )
}
