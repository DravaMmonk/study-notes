import { useMemo, useState } from 'react'
import { ArrowRightFromLine, CircuitBoard } from 'lucide-react'
import { MISSING } from '../engine/circuit.js'
import { viewAt } from '../engine/trace.js'
import { TEST_WORDS } from '../engine/circuit-domain.js'
import CircuitLevel, { useLevelBoard, useLevelRun } from './CircuitLevel.jsx'
import Timeline from './Timeline.jsx'
import { L, tr, T } from './i18n.js'
import { openRef } from './refs.js'
import { definedItem } from './parts/faces.jsx'

// The level screen of a domain on the circuit base (engine/circuit-domain.js, the game's course read as
// `game.circuit`), on the kit's circuit level (CircuitLevel.jsx): the level's fixed cards down the left and right
// (named by the ports its task gives them), the parts it holds between, the parts the player built as packed parts
// that open to show the board they run. A run plays every test in turn and stops on the first that fails; hidden tests
// run with every run but say only how many fail, and join the list once the level is solved. A board run tick by tick
// (the board's `ticks`) plays a tick a step, every card showing its value at the tick shown and the waveform under the
// board (`lanes`) following along; a board run once plays every card the engine computes, a step each.
//
// A domain brings only what is its own:
//   cards                 { type: { name, desc, icon, family } } its cards as the tray and boards show them (a fixed
//                         card it leaves out is drawn as a source in the family 'given', or a sink in 'end')
//   run(task, board, partOf) → { runs: [{ fail?, error?, ticks? | trace?, … }] }   its run.js
//   says(run)             what a failed run says
//   show(value)           a value as a card shows it
//   lanes?({ level, test, run, upTo }) → the waveform's lanes (a tick board; a lane's text by default `show`'s),
//                         notes? → lines under it
//   results?({ level, test, run, ended, ran, verdict }) → what a test shows under a board run once (verdict: what a
//                         failed run says, for results that do not show it already)
//   settings?(node, set)  a card's own settings (CardField; registerCards for registers, constants and forms)
//   defaults?(type)       a new card's settings
//   portLabels?           { type: { port: label } }               defined?  the game's parts.json parts (CircuitLevel)
//   canvas                { width, height } of a part's card on the desktop board
//   words                 what the game calls its tests (../engine/circuit-domain.js TEST_WORDS)

const labelOf = (list, name) => list?.find((x) => x.name === name)?.label ?? name

/** What a lane of wanted values is called. */
export const WANTED = T('应当', 'Wanted')

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
 * from 0 to `top`, and a part with forms (`forms`: { type: { form: label } }) one of them. A new card's settings are
 * its defaults written in (the first register, 0, the first form), so the card shows them.
 */
export function registerCards({ registers, top, forms = {} }) {
  const names = registers.map((r) => [r, r])
  const starts = [['', '—'], ['0', '0'], ['1', '1']]
  const numbers = Array.from({ length: top + 1 }, (_, k) => [String(k), String(k)])
  const first = (type) => Object.keys(forms[type])[0]
  return {
    defaults: (type) => (type === 'reg' || type === 'keep' ? { reg: registers[0] } : type === 'const' ? { value: '0' } : forms[type] ? { form: first(type) } : {}),
    settings: (node, set) => {
      const p = node.params ?? {}
      const reg = <CardField label={T('名字', 'Name')} value={p.reg ?? registers[0]} options={names} onChange={set('reg')} />
      if (node.type === 'reg') return <>{reg}<CardField label={T('初值', 'Start')} value={p.start ?? ''} options={starts} onChange={set('start')} /></>
      if (node.type === 'keep') return reg
      if (node.type === 'const') return <CardField label={T('数值', 'Value')} value={p.value ?? '0'} options={numbers} onChange={set('value')} />
      if (forms[node.type]) return <CardField label={T('形状', 'Form')} value={p.form ?? first(node.type)} options={Object.entries(forms[node.type])} onChange={set('form')} />
      return null
    },
  }
}

/** What a card shows of a value, or why it has none. */
function Value({ value, error, show }) {
  if (value === undefined) return <span className={`cs-error ${!error || error === MISSING ? 'is-missing' : ''}`}>{!error || error === MISSING ? tr('待接线', 'Not wired') : L(error)}</span>
  return <span className={`cs-value ${value === null ? 'is-none' : typeof value === 'boolean' ? `is-${value}` : ''}`}>{L(show(value))}</span>
}

/** The editor's description of a task's cards (../circuit/model.js): the board's wiring, drawn. */
function partsFor(level, circuit, { cards, portLabels, width }) {
  const { board, BUILT, builtBy } = circuit
  const fixed = [...board.portsIn(level), ...board.portsOut(level)]
  const wiring = board.wiring(level, circuit)
  // A fixed card the domain does not draw its own way: a source on the left, a sink on the right.
  const given = (node) => board.isFixed(node.type) && !cards[node.type]
  return {
    ...wiring,
    label: (node) => (board.isFixed(node.type) ? labelOf(fixed, node.id) : BUILT[node.type] ? builtBy(node.type).builds.name : cards[node.type]?.name ?? node.type),
    portLabel: (node, port) => (BUILT[node.type] ? labelOf(board.portsIn(builtBy(node.type)), port) : portLabels[node.type]?.[port] ?? ''),
    family: (node) => (BUILT[node.type] ? 'built' : given(node) ? (wiring.role(node) === 'sink' ? 'end' : 'given') : cards[node.type]?.family),
    icon: (node) => (BUILT[node.type] ? CircuitBoard : given(node) ? ArrowRightFromLine : cards[node.type]?.icon),
    cardWidth: (node) => (board.isFixed(node.type) ? 140 : BUILT[node.type] ? Math.max(176, width) : width),
  }
}

export default function CircuitScreen({ screen, cards, run: runOn, says, show, lanes, notes, results, settings, defaults, portLabels = {}, defined = null, canvas = { width: 156, height: 120 }, words = TEST_WORDS }) {
  const { game, level: entry, solved, flags, progress } = screen
  const level = entry.source
  const circuit = game.circuit
  const { board: kind, BUILT, builtBy } = circuit
  circuit.syncOwn(progress.built)
  const parts = useMemo(() => partsFor(level, circuit, { cards, portLabels, width: canvas.width }), [level, circuit, cards, portLabels, canvas.width])
  // A task that goes on from the task before (`carries`) opens on that board, its ports swapped for its own.
  const opening = () => circuit.opening(level, progress.built)
  const board = useLevelBoard(screen, { open: (saved) => (saved?.nodes && kind.fits(saved, level, circuit.partOf) ? saved : saved?.nodes && level.carries ? kind.carriedOnto(level, saved) : opening()), fresh: opening })
  const { circuit: drawn, change } = board
  const [revealed] = useState(solved)
  const tests = useMemo(() => (revealed ? [...level.tests, ...level.hidden.map((t) => ({ ...t, hidden: true }))] : level.tests), [level, revealed])
  const checked = useMemo(() => runOn({ ...level, tests }, drawn, circuit.partOf), [level, tests, board.version, circuit])
  const hidden = revealed ? [] : level.hidden
  const hiddenFailed = useMemo(() => (hidden.length ? runOn({ ...level, tests: hidden }, drawn, circuit.partOf).runs.filter((r) => r.fail || r.error).length : 0), [level, hidden, board.version, circuit])
  const stepsOf = (r) => (kind.ticks ? r.ticks : r.trace)
  const run = useLevelRun(screen, board, {
    tests: tests.map((t, k) => ({ label: L(words.label(k)), hidden: t.hidden })),
    steps: { of: (k) => stepsOf(checked.runs[k]), check: (k) => says(checked.runs[k]) ?? '' },
    hidden: {
      count: hidden.length,
      fails: () => hiddenFailed,
      words: {
        note: L(words.note(hidden.length)),
        failed: (n) => L(words.failed(n, hidden.length)),
      },
    },
  })
  const { shown: palette, folded } = useMemo(() => circuit.offerIn(level, flags), [circuit, level, flags])

  // The step shown: the one a run is on (or its last, once past it). Before a run a tick board shows its first tick,
  // as a preview, and a board run once the whole run.
  const runOf = checked.runs[run.at]
  const shown = run.playback.shown(run.at)
  const at = !run.run ? (kind.ticks ? 0 : -1) : shown.list.length ? (shown.at >= 0 ? shown.at : shown.list.length - 1) : -1
  const tick = kind.ticks && at >= 0 ? runOf.ticks[at] : null
  const view = kind.ticks ? tick ?? undefined : run.run ? viewAt(runOf.trace, at) : runOf
  const ended = Boolean(run.run && (run.run.test > run.at || run.run.over))

  const setParam = (node, key, value) => change({ ...drawn, nodes: drawn.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, [key]: value } } : n)) })
  // A card shows its value; a card on the right, what reaches it.
  const valueOf = (node, key, v) => v.values.get(key ? `${node.id}#${key}` : node.id)
  const value = (node, ctx) => {
    const into = valueOf(node, null, ctx.view) === undefined && ctx.board.parts.role(node) === 'sink' && ctx.board.circuit.wires.find((w) => w.to === node.id)
    return into ? <Value value={ctx.view.values.get(into.from)} error={ctx.view.errors.get(into.from.split('#')[0])} show={show} /> : <Value value={valueOf(node, null, ctx.view)} error={ctx.view.errors.get(node.id)} show={show} />
  }
  const body = (node, ctx) => (
    <div className="cs-card">
      {settings?.(node, (key) => (v) => !ctx.readOnly && setParam(node, key, v))}
      {!ctx.board.parts.outputs(node) && value(node, ctx)}
    </div>
  )
  const definedFaces = useMemo(() => defined && { ...defined, value: (node, ctx, output) => (output ? <Value value={valueOf(node, output, ctx.view)} error={ctx.view.errors.get(node.id)} show={show} /> : value(node, ctx)) }, [defined])

  const itemOf = (type) => {
    const fresh = entry.fresh?.includes(type)
    if (BUILT[type]) {
      const b = builtBy(type).builds
      return { type, label: b.name, desc: b.desc, icon: CircuitBoard, family: 'built', packed: true }
    }
    if (defined?.of(type)) return definedItem(type, defined.of(type), { fresh })
    return { type, label: cards[type].name, desc: cards[type].desc, icon: cards[type].icon, family: cards[type].family, fresh }
  }

  const test = tests[run.at]
  const failed = shown.list.findIndex((t) => t.failed)
  const verdict = ended && (says(runOf) || (failed >= 0 && shown.list[failed].failed))
  const upTo = (list) => list.map((v, t) => (run.run && t <= at ? v : undefined))
  const strip = (
    <div className="cs-strip">
      {kind.ticks ? (
        <>
          <Timeline lanes={lanes({ level, test, run: runOf, upTo }).map((lane) => ({ text: (v) => L(show(v)), ...lane }))} count={test.ticks} at={run.run ? at : -1} marks={ended && runOf.fail?.tick !== undefined ? [runOf.fail.tick] : []} />
          {notes?.({ level, run: runOf })}
          {verdict && <p className="cs-verdict is-fail">{L(verdict)}</p>}
        </>
      ) : results({ level, test, run: runOf, ended, ran: ended || !run.run, verdict })}
      {run.run?.over && run.run.final && <p className="cs-verdict is-fail">{run.run.final}</p>}
    </div>
  )

  return (
    <CircuitLevel
      screen={screen}
      board={board}
      run={run}
      className="cs-level"
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
      }}
      canvas={canvas}
      brief={{ hint: level.hint }}
      describe={(n) => (BUILT[n.type] ? builtBy(n.type).builds.desc : kind.isFixed(n.type) || !cards[n.type] ? null : game.textAt(cards[n.type], level.id)?.desc)}
      results={strip}
      packed={{
        open: (node) => {
          const inside = BUILT[node.type]?.opens?.()
          return inside && { ...inside, parts: partsFor(inside.level, circuit, { cards, portLabels, width: canvas.width }) }
        },
        edit: (node) => openRef('level', builtBy(node.type).id),
        trace: () => (kind.ticks ? (tick?.trace ? { trace: tick.trace } : null) : { trace: runOf.trace, ...(run.run && shown.at >= 0 ? { upTo: shown.at, step: runOf.trace[shown.at] } : {}) }),
      }}
    />
  )
}
