import { useMemo, useState } from 'react'
import { CircuitBoard } from 'lucide-react'
import { CircuitLevel, Timeline, useLevelBoard, useLevelRun } from '../../../shell/index.js'
import { L, tr, T } from '../../../shell/i18n.js'
import { openRef } from '../../../shell/refs.js'
import { MISSING } from '../../../engine/circuit.js'
import { fits, startBoard, wiring } from '../board.js'
import { FIXED, REGISTERS } from '../parts.js'
import { runLevel, show } from '../run.js'
import { CARDS, FORMS, PORT_LABELS } from './catalog.js'

// A level of 《车在说话》 on the kit's circuit level (../../../shell/CircuitLevel.jsx): the bus and the level's inputs
// down the left, its outputs down the right, the parts it holds between. A run goes tick by tick (a tick a step): every
// card shows its value at the tick shown, and the waveform under the board follows along, the outputs against what
// they should be; a run stops on the first tick an output is wrong. A level's hidden tests run with every run but show
// only how many fail; once the level is solved they join the list when it opens again. A part the player built opens
// to show the board it runs, each card on it at the tick shown.


/** The editor's description of this level's cards (../../../circuit/model.js): the wiring (../board.js), drawn. */
function partsFor(level, bus) {
  const builderOf = (type) => bus.LEVELS.find((L) => L.builds?.type === type)
  const labelOf = (list, name) => list?.find((x) => x.name === name)?.label ?? name
  return {
    ...wiring(level, bus),
    label: (node) => {
      if (node.type === 'in') return labelOf(level.inputs, node.params?.name)
      if (node.type === 'out') return labelOf(level.outputs, node.params?.name)
      return bus.BUILT[node.type] ? builderOf(node.type).builds.name : CARDS[node.type]?.name ?? node.type
    },
    portLabel: (node, port) => (bus.BUILT[node.type] ? labelOf(builderOf(node.type).inputs, port) : PORT_LABELS[node.type]?.[port] ?? ''),
    family: (node) => (bus.BUILT[node.type] ? 'built' : CARDS[node.type]?.family),
    icon: (node) => (bus.BUILT[node.type] ? CircuitBoard : CARDS[node.type]?.icon),
    cardWidth: (node) => (FIXED.includes(node.type) ? 140 : 156),
  }
}

/** What a card shows of a value: a bit, a number, yes or no, or 「—」. */
function Value({ value, error }) {
  if (value === undefined) return <span className={`cn-error ${!error || error === MISSING ? 'is-missing' : ''}`}>{!error || error === MISSING ? tr('待接线', 'Not wired') : L(error)}</span>
  return <span className={`cn-value ${value === null ? 'is-none' : typeof value === 'boolean' ? `is-${value}` : ''}`}>{L(show(value))}</span>
}

// A setting picked from a list, on a card.
function Field({ label, value, options, onChange }) {
  return (
    <label className="cn-field">
      <span>{L(label)}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} onPointerDown={(e) => e.stopPropagation()}>
        {options.map(([v, text]) => <option key={v} value={v}>{L(text)}</option>)}
      </select>
    </label>
  )
}

const NAMES = REGISTERS.map((r) => [r, r])
const STARTS = [['', '—'], ['0', '0'], ['1', '1']]
const NUMBERS = Array.from({ length: 33 }, (_, k) => [String(k), String(k)])
// Registers start named A; a new card's settings are its defaults written in, so the card shows them.
const defaults = (type) => (type === 'reg' || type === 'keep' ? { reg: 'A' } : type === 'const' ? { value: '0' } : FORMS[type] ? { form: Object.keys(FORMS[type])[0] } : {})
const valueOf = (node, key, view) => view.values.get(key ? `${node.id}#${key}` : node.id)

export default function BusScreen(screen) {
  const { game, level: entry, solved, flags, progress } = screen
  const level = entry.source
  const bus = game.bus
  bus.syncOwn(progress.built)
  const parts = useMemo(() => partsFor(level, bus), [level, bus])
  const board = useLevelBoard(screen, { open: (saved) => (saved?.nodes && fits(saved, level, bus.partOf) ? saved : startBoard(level)), fresh: () => startBoard(level) })
  const { circuit, change } = board
  const [revealed] = useState(solved)
  const tests = useMemo(() => (revealed ? [...level.tests, ...level.hidden.map((t) => ({ ...t, hidden: true }))] : level.tests), [level, revealed])
  const checked = useMemo(() => runLevel({ ...level, tests }, circuit, bus.partOf), [level, tests, board.version, bus])
  const hidden = revealed ? [] : level.hidden
  const hiddenFailed = useMemo(() => (hidden.length ? runLevel({ ...level, tests: hidden }, circuit, bus.partOf).runs.filter((r) => r.fail || r.error).length : 0), [level, hidden, board.version, bus])
  const run = useLevelRun(screen, board, {
    tests: tests.map((t, k) => ({ label: tr(`总线 ${k + 1}`, `Bus ${k + 1}`), hidden: t.hidden })),
    steps: { of: (k) => checked.runs[k].ticks, check: (k) => checked.runs[k].error ?? '' },
    hidden: {
      count: hidden.length,
      fails: () => hiddenFailed,
      words: {
        note: tr(`另有 ${hidden.length} 条隐藏的总线，每次运行一并检查，通关后公开。`, `${hidden.length} more hidden ${hidden.length === 1 ? 'bus is' : 'buses are'} checked with every run and shown once you pass.`),
        failed: (n) => tr(`可见的总线全部通过，但 ${hidden.length} 条隐藏的总线中有 ${n} 条没有通过：这块板可能只是恰好合上了这几条总线。`, `Every bus shown passes, but ${n} of ${hidden.length} hidden ${hidden.length === 1 ? 'bus fails' : 'buses fail'}: the board may only happen to fit these.`),
      },
    },
  })
  const { shown: palette, folded } = useMemo(() => bus.offerIn(level, flags), [bus, level, flags])
  const builderOf = (type) => bus.LEVELS.find((L) => L.builds?.type === type)

  // The tick shown: the one a run is on (or its last, once past it); before a run, the first, as a preview.
  const runOf = checked.runs[run.at]
  const shown = run.playback.shown(run.at)
  const at = !run.run ? 0 : shown.list.length ? (shown.at >= 0 ? shown.at : shown.list.length - 1) : -1
  const tick = at >= 0 ? runOf.ticks[at] : null

  const setParam = (node, key, value) => change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, [key]: value } } : n)) })
  const settings = (node, ctx) => {
    const p = node.params ?? {}
    const set = (key) => (v) => !ctx.readOnly && setParam(node, key, v)
    if (node.type === 'reg') return <><Field label={T('名字', 'Name')} value={p.reg ?? 'A'} options={NAMES} onChange={set('reg')} /><Field label={T('初值', 'Start')} value={p.start ?? ''} options={STARTS} onChange={set('start')} /></>
    if (node.type === 'keep') return <Field label={T('名字', 'Name')} value={p.reg ?? 'A'} options={NAMES} onChange={set('reg')} />
    if (node.type === 'const') return <Field label={T('数值', 'Value')} value={p.value ?? '0'} options={NUMBERS} onChange={set('value')} />
    if (FORMS[node.type]) return <Field label={T('形状', 'Form')} value={p.form ?? Object.keys(FORMS[node.type])[0]} options={Object.entries(FORMS[node.type])} onChange={set('form')} />
    return null
  }
  const value = (node, ctx) => <Value value={valueOf(node, null, ctx.view)} error={ctx.view.errors.get(node.id)} />
  const body = (node, ctx) => (
    <div className="cn-card">
      {settings(node, ctx)}
      {!ctx.board.parts.outputs(node) && value(node, ctx)}
    </div>
  )

  const builtItem = (type) => {
    const b = builderOf(type).builds
    return { type, label: b.name, desc: b.desc, icon: CircuitBoard, family: 'built', packed: true }
  }
  const itemOf = (type) => (bus.BUILT[type] ? builtItem(type) : { type, label: CARDS[type].name, desc: CARDS[type].desc, icon: CARDS[type].icon, family: CARDS[type].family, fresh: entry.fresh?.includes(type) })

  const test = tests[run.at]
  const upTo = (list) => list.map((v, t) => (run.run && t <= at ? v : undefined))
  const lanes = [
    ...(level.listens ? [{ key: 'line', label: CARDS.line.name, kind: 'wave', ticks: test.bus.bits }] : []),
    ...(level.inputs ?? []).map((i) => ({ key: `in:${i.name}`, label: i.label, kind: 'wave', ticks: test.inputs[i.name] })),
    ...level.outputs.flatMap((o) => [
      { key: `got:${o.name}`, label: o.label, kind: 'value', ticks: upTo(runOf.ticks.map((t) => t.outputs[o.name] ?? null)), text: (v) => L(show(v)) },
      { key: `want:${o.name}`, label: T('应当', 'Wanted'), kind: 'value', ticks: runOf.want[o.name].map((v) => (v === undefined ? null : v)), text: (v) => L(show(v)) },
    ]),
  ]
  const failed = shown.list.findIndex((t) => t.failed)
  const ended = Boolean(run.run && (run.run.test > run.at || run.run.over))
  const strip = (
    <div className="cn-strip">
      <Timeline lanes={lanes} count={test.bus.bits.length} at={run.run ? at : -1} marks={ended && runOf.fail ? [runOf.fail.tick] : []} />
      {ended && (runOf.error || (failed >= 0 && shown.list[failed].failed)) && <p className="cn-verdict is-fail">{L(runOf.error ?? shown.list[failed].failed)}</p>}
      {run.run?.over && run.run.final && <p className="cn-verdict is-fail">{run.run.final}</p>}
    </div>
  )

  return (
    <CircuitLevel
      screen={screen}
      board={board}
      run={run}
      className="cn-level"
      parts={parts}
      items={palette.map(itemOf)}
      folded={folded.map(itemOf)}
      defaults={defaults}
      view={tick ?? undefined}
      card={{
        body,
        outNote: (node, key, ctx) => {
          const v = valueOf(node, key, ctx.view)
          return v === undefined ? null : L(show(v))
        },
        thumb: (n, ctx) => (ctx.board.parts.outputs(n) ? null : value(n, ctx)),
      }}
      canvas={{ width: 156, height: 120 }}
      brief={{ hint: level.hint }}
      describe={(n) => (bus.BUILT[n.type] ? builderOf(n.type).builds.desc : game.textAt(CARDS[n.type], level.id)?.desc)}
      results={strip}
      packed={{
        open: (node) => {
          const inside = bus.BUILT[node.type]?.opens?.()
          return inside && { ...inside, parts: partsFor(inside.level, bus) }
        },
        edit: (node) => openRef('level', builderOf(node.type).id),
        trace: () => (tick?.trace ? { trace: tick.trace } : null),
      }}
    />
  )
}
