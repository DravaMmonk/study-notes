import { useMemo, useRef, useState } from 'react'
import { CircuitBoard } from 'lucide-react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus, TestTabs, Timeline, usePlayback } from '../../../shell/index.js'
import Sheet from '../../../shell/Sheet.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, Notice, Palette, PartActions, SlotBoard, Tray, spotIn, useSlotEditing } from '../../../circuit/index.js'
import { MISSING, portsOf } from '../../../engine/circuit.js'
import { startBoard } from '../build.js'
import { FIXED, PARTS, REGISTERS } from '../parts.js'
import { runLevel, show } from '../run.js'
import { CARDS, FORMS, PORT_LABELS } from './catalog.js'

// A level of 《车在说话》 on the shared circuit editor: the bus and the level's inputs down the left, its outputs down the
// right, the parts it holds between. A run goes tick by tick (../../../shell/usePlayback.jsx, a tick a step): every
// card shows its value at the tick shown, and the waveform under the board follows along, the outputs against what
// they should be; a run stops on the first tick an output is wrong.

const T = (zh, en) => ({ zh, en })

/** The editor's description of this level's cards (../../../circuit/model.js). */
function partsFor(level, bus) {
  const builderOf = (type) => bus.LEVELS.find((L) => L.builds?.type === type)
  const labelOf = (list, name) => list?.find((x) => x.name === name)?.label ?? name
  return {
    inputs: (node) => {
      if (bus.BUILT[node.type]) return builderOf(node.type).inputs?.map((i) => i.name) ?? []
      return PARTS[node.type] ? portsOf(PARTS[node.type], node) : []
    },
    role: (node) => (node.type === 'line' || node.type === 'in' ? 'source' : node.type === 'out' ? 'sink' : 'part'),
    label: (node) => {
      if (node.type === 'in') return labelOf(level.inputs, node.params?.name)
      if (node.type === 'out') return labelOf(level.outputs, node.params?.name)
      return bus.BUILT[node.type] ? builderOf(node.type).builds.name : CARDS[node.type]?.name ?? node.type
    },
    portLabel: (node, port) => (bus.BUILT[node.type] ? labelOf(builderOf(node.type).inputs, port) : PORT_LABELS[node.type]?.[port] ?? ''),
    family: (node) => (bus.BUILT[node.type] ? 'built' : CARDS[node.type]?.family),
    icon: (node) => (bus.BUILT[node.type] ? CircuitBoard : CARDS[node.type]?.icon),
    packed: (node) => Boolean(bus.BUILT[node.type]),
    outputs: (node) => {
      const outs = bus.BUILT[node.type] && builderOf(node.type).outputs
      return outs && outs.length > 1 ? outs.map((o) => ({ key: o.name, label: o.label })) : null
    },
    cardWidth: (node) => (FIXED.includes(node.type) ? 140 : 156),
  }
}

// A saved board still fits: the level's fixed cards, and every card one the domain knows.
const fits = (circuit, level, partOf) => {
  const fixed = (c) => c.nodes.filter((n) => FIXED.includes(n.type)).map((n) => n.id).sort().join()
  return fixed(circuit) === fixed(startBoard(level)) && circuit.nodes.every((n) => partOf(n.type))
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

export default function BusScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, flags, progress, phone }) {
  const level = entry.source
  const bus = game.bus
  bus.syncOwn(progress.built)
  const parts = useMemo(() => partsFor(level, bus), [level, bus])
  const [circuit, setCircuit] = useState(() => (saved?.nodes && fits(saved, level, bus.partOf) ? saved : startBoard(level)))
  const [testIndex, setTestIndex] = useState(0)
  const checked = useMemo(() => runLevel(level, circuit, bus.partOf), [level, circuit, bus])
  const { shown: palette, folded } = useMemo(() => bus.offerIn(level, flags), [bus, level, flags])

  const change = (next) => {
    setCircuit(next)
    save(next)
  }
  const onClear = circuit.nodes.some((n) => parts.role(n) === 'part') ? () => change(startBoard(level)) : null
  const playback = usePlayback({
    count: level.tests.length,
    stepsOf: (k) => checked.runs[k].ticks,
    check: (k) => checked.runs[k].error ?? '',
    onSolve: () => solve(),
    onTest: setTestIndex,
    board: circuit,
    kept: lastRun,
    onKeep: keepRun,
  })
  const { run, states } = playback

  // The tick shown: the one a run is on (or its last, once past it); before a run, the first, as a preview.
  const runOf = checked.runs[testIndex]
  const shown = playback.shown(testIndex)
  const at = !run ? 0 : shown.list.length ? (shown.at >= 0 ? shown.at : shown.list.length - 1) : -1
  const tick = at >= 0 ? runOf.ticks[at] : null

  const valueOf = (node, key = null) => tick?.values.get(key ? `${node.id}#${key}` : node.id)
  const errorOf = (node) => tick?.errors.get(node.id)
  const setParam = (node, key, value) => change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, [key]: value } } : n)) })

  const settings = (node) => {
    const p = node.params ?? {}
    const set = (key) => (v) => setParam(node, key, v)
    if (node.type === 'reg') return <><Field label={T('名字', 'Name')} value={p.reg ?? 'A'} options={NAMES} onChange={set('reg')} /><Field label={T('初值', 'Start')} value={p.start ?? ''} options={STARTS} onChange={set('start')} /></>
    if (node.type === 'keep') return <Field label={T('名字', 'Name')} value={p.reg ?? 'A'} options={NAMES} onChange={set('reg')} />
    if (node.type === 'const') return <Field label={T('数值', 'Value')} value={p.value ?? '0'} options={NUMBERS} onChange={set('value')} />
    if (FORMS[node.type]) return <Field label={T('形状', 'Form')} value={p.form ?? Object.keys(FORMS[node.type])[0]} options={Object.entries(FORMS[node.type])} onChange={set('form')} />
    return null
  }
  const body = (node) => {
    const many = parts.outputs(node)
    return (
      <div className="cn-card">
        {settings(node)}
        {!many && <Value value={valueOf(node)} error={errorOf(node)} />}
      </div>
    )
  }
  const outNote = (node, key) => {
    const v = valueOf(node, key)
    return v === undefined ? null : L(show(v))
  }

  const builtItem = (type) => {
    const b = bus.LEVELS.find((L) => L.builds?.type === type).builds
    return { type, label: b.name, desc: b.desc, icon: CircuitBoard, family: 'built', packed: true }
  }
  const itemOf = (type) => (bus.BUILT[type] ? builtItem(type) : { type, label: CARDS[type].name, desc: CARDS[type].desc, icon: CARDS[type].icon, family: CARDS[type].family, fresh: entry.fresh?.includes(type) })
  const items = palette.map(itemOf)
  const foldedItems = folded.map(itemOf)
  const types = [...palette, ...folded]
  // Registers start named A; a new card's settings are its defaults written in, so the card shows them.
  const defaults = (type) => (type === 'reg' || type === 'keep' ? { reg: 'A' } : type === 'const' ? { value: '0' } : FORMS[type] ? { form: Object.keys(FORMS[type])[0] } : {})
  const addNode = (type, extra = {}) => {
    const taken = new Set(circuit.nodes.map((n) => n.id))
    let k = 1
    while (taken.has(`${type}${k}`)) k += 1
    const id = `${type}${k}`
    return { id, graph: { ...circuit, nodes: [...circuit.nodes, { id, type, params: defaults(type), ...extra }] } }
  }
  const add = (type) => {
    const [x, y] = spotIn(circuit, null)
    change(addNode(type, { x, y }).graph)
  }

  const test = level.tests[testIndex]
  const upTo = (list) => list.map((v, t) => (run && t <= at ? v : undefined))
  const lanes = [
    ...(level.listens ? [{ key: 'line', label: CARDS.line.name, kind: 'wave', ticks: test.bus.bits }] : []),
    ...(level.inputs ?? []).map((i) => ({ key: `in:${i.name}`, label: i.label, kind: 'wave', ticks: test.inputs[i.name] })),
    ...level.outputs.flatMap((o) => [
      { key: `got:${o.name}`, label: o.label, kind: 'value', ticks: upTo(runOf.ticks.map((t) => t.outputs[o.name] ?? null)), text: (v) => L(show(v)) },
      { key: `want:${o.name}`, label: T('应当', 'Wanted'), kind: 'value', ticks: runOf.want[o.name].map((v) => (v === undefined ? null : v)), text: (v) => L(show(v)) },
    ]),
  ]
  const failed = shown.list.findIndex((t) => t.failed)
  const ended = Boolean(run && (run.test > testIndex || run.over))
  const strip = (
    <div className="cn-strip">
      <Timeline lanes={lanes} count={test.bus.bits.length} at={run ? at : -1} marks={ended && runOf.fail ? [runOf.fail.tick] : []} />
      {ended && (runOf.error || (failed >= 0 && shown.list[failed].failed)) && <p className="cn-verdict is-fail">{L(runOf.error ?? shown.list[failed].failed)}</p>}
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  const tests = <TestTabs tests={level.tests.map((_, k) => ({ label: tr(`总线 ${k + 1}`, `Bus ${k + 1}`) }))} states={states} index={testIndex} onSelect={setTestIndex} phone={phone} />
  const dock = <RunDock {...playback.dock({ go: tr('运行', 'Run'), done: tr('全部通过', 'All passed') })} />

  if (phone) return <PhoneBoard {...{ circuit, parts, items, foldedItems, brief, dock, change, addNode, onClear, strip, tests, body, valueOf, errorOf, types, game, level, bus }} scope={level.id} />

  return (
    <CircuitLayout
      className="cn-level"
      brief={brief}
      parts={items.length + foldedItems.length > 0 && <Palette compact items={items} folded={foldedItems} onAdd={add} />}
      canvas={
        <div className="cn-stage">
          <div className="cn-board">
            <CanvasEditor
              onClear={onClear}
              types={types}
              key={level.id}
              scope={level.id}
              graph={circuit}
              onChange={change}
              parts={parts}
              width={156}
              height={120}
              body={body}
              outNote={outNote}
              wireState={(wire) => (tick && tick.values.get(wire.from) !== undefined ? 'live' : 'dead')}
              emptyNote={T('从上方元件栏选择元件放到板上，再从元件右侧的圆点连线到另一元件左侧的圆点。', 'Add a part from the row above, then drag from a dot on its right side to a dot on another part’s left side.')}
            />
          </div>
        </div>
      }
      tests={tests}
      status={<TestStatus states={states} />}
      outputsTitle={tr(`总线 ${testIndex + 1}`, `Bus ${testIndex + 1}`)}
      outputs={strip}
      actions={<footer className="run-foot">{dock}</footer>}
    />
  )
}

// The board on a phone: the shared slot board, the tests and the waveform under it, and the run bar.
function PhoneBoard({ circuit, parts, items, foldedItems, brief, dock, change, addNode, onClear, strip, tests, body, valueOf, errorOf, types, scope, game, level, bus }) {
  const [sheet, setSheet] = useState(null) // { node } or { slot }
  const root = useRef(null)
  const scroller = useRef(null)
  const editing = useSlotEditing({
    graph: circuit,
    onChange: change,
    parts,
    create: (_, type, at) => {
      const [x, y] = spotIn(circuit, null)
      return addNode(type, { slot: at, x, y })
    },
    label: parts.label,
    openNode: (id) => setSheet({ node: id }),
    openSlot: (at) => items.length + foldedItems.length > 0 && setSheet({ slot: at }),
    root,
    scroller,
    scope,
  })
  const node = sheet?.node && circuit.nodes.find((n) => n.id === sheet.node)
  const descOf = (n) => (bus.BUILT[n.type] ? bus.LEVELS.find((L) => L.builds?.type === n.type).builds.desc : game.textAt(CARDS[n.type], level.id).desc)
  return (
    <div className="level-phone is-split cn-phone" ref={root}>
      {tests}
      <div className="cn-scroll" ref={scroller}>
        <TaskCard>{brief}</TaskCard>
        <SlotBoard dense graph={circuit} parts={parts} nameOf={editing.nameOf} thumb={(n) => (parts.outputs(n) ? null : <Value value={valueOf(n)} error={errorOf(n)} />)} sinkBody={(n) => body(n)} picking={editing.picking} moving={editing.moving} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} onClear={onClear} onChange={change} types={types} />
        {strip}
      </div>
      <Tray items={items} folded={foldedItems} onPick={editing.placeFirstFree} />
      <footer className="run-foot">{dock}</footer>
      <Notice editing={editing} />
      {node && (
        <Sheet title={editing.nameOf(node)} onClose={() => setSheet(null)}>
          <div className="cn-sheet">
            <p className="cn-desc">{L(descOf(node))}</p>
            {body(node)}
            {parts.role(node) === 'part' && <PartActions onMove={() => { editing.startMove(node.id); setSheet(null) }} onRemove={node.locked ? null : () => { editing.remove(node.id); setSheet(null) }} />}
          </div>
        </Sheet>
      )}
      {sheet?.slot !== undefined && (
        <Sheet title={tr('放入这一格', 'Place in this slot')} onClose={() => setSheet(null)}>
          <div className="cn-add">
            {[...items, ...foldedItems].map((item) => (
              <button key={item.type} type="button" data-family={item.family} onClick={() => { editing.place(item.type, sheet.slot); setSheet(null) }}>
                <b>{L(item.label)}</b>
                <small>{L(item.desc)}</small>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}

