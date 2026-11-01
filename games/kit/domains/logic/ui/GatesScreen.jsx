import { useMemo, useRef, useState } from 'react'
import { ArrowRightFromLine, CircleDot, CircuitBoard, ToggleLeft } from 'lucide-react'
import { Brief, PhonePage, RunDock, TestStatus, Workbench, usePlayback } from '../../../shell/index.js'
import Sheet from '../../../shell/Sheet.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, Notice, Palette, PartActions, SlotBoard, Tray, spotIn, useSlotEditing } from '../../../circuit/index.js'
import { MISSING } from '../../../engine/circuit.js'
import { parse } from '../formula.js'
import { say } from '../notation.js'
import { runBoard } from '../../../engine/boards.js'
import { openRef } from '../../../shell/refs.js'
import { PRIMITIVE_GATES, checkGates, countGates, gateParts, gatesOf, rowsFor, runRow, startGates } from '../gates.js'
import { gateShape } from '../blueprint.js'
import { syncOwn } from '../built.js'
import { BuiltTools, edgeParts, edged } from './inside.jsx'

// A truth-circuit level (《证明完毕》, gates.js) on the shared circuit editor: a card for each letter on the left, the
// sentence's output on the right, gates as parts. The tests are the rows of the sentence's truth table, picked in the table itself (no row tabs, whose labels would
// spell the row out twice): picking one
// shows on every card what the board computes on that row. Running goes down the table one row at a time, as a machine
// filling it in (../../../shell/usePlayback.jsx, each row a test of no steps): each row's card values and result show
// in turn, and the run stops on the first row it gets wrong. A `hideTarget`
// level does not show the target value column; a `blind` one does not show its sentence either: it is a puzzle said in
// words. A gate the player built opens to show the board it runs (read only, each card's value on the row picked): on
// a desktop its card unfolds, on a phone its sheet shows it, and the components box shows it too (GateInside).

const TF = (v) => (v === undefined ? '—' : v ? tr('真', 'T') : tr('假', 'F'))
const T = (zh, en) => ({ zh, en })
const WRONG_ROW = T('这一行的结果错误', 'This row is wrong')
const SOURCE = T('输入', 'Input')
/** The editor's description of a board of gates (../../circuit/model.js), with a level's words for its letters. */
function gatePartsFor(built, wordOf) {
  const all = gatesOf(built)
  return {
    ...gateShape(built),
    label: (node) => (node.type === 'letter' ? wordOf(node.params.name) ?? SOURCE : node.type === 'out' ? T('这句话', 'The sentence') : all[node.type]?.name ?? node.type),
    portLabel: (node, port) => (all[node.type] && all[node.type].ports.length > 1 ? port : ''),
    family: (node) => (node.type === 'letter' ? 'given' : node.type === 'out' ? 'end' : PRIMITIVE_GATES[node.type] ? 'gate' : 'built'),
    // A gate the player built runs the board that built it: a packed part.
    packed: (node) => Boolean(all[node.type]?.built),
    icon: (node) => (node.type === 'letter' ? ArrowRightFromLine : node.type === 'out' ? CircleDot : PRIMITIVE_GATES[node.type] ? ToggleLeft : CircuitBoard),
    cardWidth: (node) => (node.type === 'letter' || node.type === 'out' ? 170 : node.open && all[node.type]?.built ? 440 : 140),
    rules: all,
  }
}
// What a built gate's card can do: go to the level that builds it, and open the board it runs.
const builtOf = (gates) => ({ is: (node) => Boolean(gates[node.type]?.built), edit: (type) => openRef('level', gates[type].opens().level.id) })
// What reaches each of a card's ports on the row picked, by port.
const insOf = (circuit, node, values) => Object.fromEntries(circuit.wires.filter((w) => w.to === node.id).map((w) => [w.port, values.get(w.from)]))

// A saved board still fits: its letters are the level's, and every card is a gate it knows.
const fits = (circuit, level, parts) => {
  const letters = circuit.nodes.filter((n) => n.type === 'letter').map((n) => n.params.name).sort().join()
  return letters === [...rowsFor(level).letters].sort().join() && circuit.nodes.every((n) => n.type === 'letter' || n.type === 'out' || parts.rules[n.type])
}

export default function GatesScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, flags, progress, phone }) {
  const level = entry.source
  // The gates the player built run the boards that last passed their levels.
  syncOwn(progress.built)
  const word = (letter) => say(parse(letter), level.notation)
  const parts = useMemo(() => gatePartsFor(level.gates, word), [level])
  const [circuit, setCircuit] = useState(() => (saved?.nodes && fits(saved, level, parts) ? saved : startGates(level)))
  const [rowIndex, setRowIndex] = useState(0)
  const { letters, rows } = useMemo(() => rowsFor(level), [level])
  const row = rows[Math.min(rowIndex, rows.length - 1)]
  const view = useMemo(() => runRow(level, circuit, row.row), [level, circuit, row])
  const { shown: palette, folded } = useMemo(() => game.logic.offerIn(level, flags), [game, level, flags])
  const sentence = L(say(parse(level.target), level.notation))
  const hideTarget = level.blind || level.hideTarget

  const change = (next) => {
    setCircuit(next)
    save(next)
  }
  // Clearing is the board's own (a button among its tools, which asks first).
  const onClear = circuit.nodes.some((n) => parts.role(n) === 'part') ? () => change(startGates(level)) : null
  // A run down the table: every row checked at once, shown one at a time; over budget fails it once every row is right.
  const checked = useMemo(() => checkGates(level, circuit), [level, circuit])
  const playback = usePlayback({
    count: rows.length,
    stepsOf: () => [],
    check: (k) => (checked.results[k].pass ? '' : WRONG_ROW),
    final: () => (checked.overBudget ? tr(`每一行都正确，但用了 ${checked.gates} 个门，这一关最多允许 ${level.budget} 个。`, `Every row is correct, but it uses ${checked.gates} gates; this level allows ${level.budget}.`) : ''),
    onSolve: () => solve({ steps: checked.gates }),
    onTest: setRowIndex,
    board: circuit,
    kept: lastRun,
    onKeep: keepRun,
  })
  const run = playback.run
  const addNode = (type, extra = {}) => {
    const taken = new Set(circuit.nodes.map((n) => n.id))
    let k = circuit.nodes.length
    while (taken.has(`${type}-${k}`)) k += 1
    const id = `${type}-${k}`
    return { id, graph: { ...circuit, nodes: [...circuit.nodes, { id, type, params: {}, ...extra }] } }
  }
  const add = (type) => {
    const [x, y] = spotIn(circuit, null)
    change(addNode(type, { x, y }).graph)
  }

  const states = playback.states
  const verdict = run?.over ? { pass: playback.passed } : null
  const verdictText = !verdict ? null
    : verdict.pass ? tr('每一行都正确：这块电路算出了这句话的完整真值表。', 'Every row is correct: this circuit computes the sentence’s full truth table.')
    : run.final || tr('这一行的结果错误，运行停在这里。板上每个元件显示它在这一行算出的值。', 'This row is wrong; the run stopped here. Each part on the board shows its value on this row.')
  const valueOf = (node) => (node.type === 'out' ? view.value : view.values.get(node.id))
  const errorOf = (node) => view.errors.get(node.id)

  const itemOf = (type) => ({ type, label: parts.rules[type].name, desc: parts.rules[type].desc, icon: parts.icon({ type }), family: parts.family({ type }), packed: Boolean(parts.rules[type].built), fresh: entry.fresh?.includes(type) })
  const items = palette.filter((t) => parts.rules[t]).map(itemOf)
  const foldedItems = folded.filter((t) => parts.rules[t]).map(itemOf)
  const types = [...palette, ...folded].filter((t) => parts.rules[t])
  const brief = (
    <Brief game={game} level={entry} hint={level.hint} phone={phone}>
      <section className="lg-score">
        <div className="stat-row">
          <div className="stat"><b>{countGates(level, circuit)}</b><span>{tr('门', 'Gates')}</span></div>
          {level.budget !== undefined && <div className="stat"><b>{level.budget}</b><span>{tr('最多', 'At most')}</span></div>}
        </div>
      </section>
    </Brief>
  )
  const table = (
    <div className="lg-strip">
      {!level.blind && <p className="lg-sequent">{tr('这句话', 'The sentence')} <b>{sentence}</b></p>}
      <table className="lg-rows">
        <thead>
          <tr>{letters.map((l) => <th key={l}>{L(word(l))}</th>)}{!hideTarget && <th>{tr('目标真值', 'Target value')}</th>}<th>{tr('电路输出', 'Circuit output')}</th></tr>
        </thead>
        <tbody>
          {rows.map((r, k) => (
            <tr key={k} className={`${k === rows.indexOf(row) ? 'is-on' : ''} ${states[k] ? `is-${states[k]}` : ''}`} onClick={() => setRowIndex(k)}>
              {letters.map((l) => <td key={l}>{L(TF(r.row[l]))}</td>)}
              {!hideTarget && <td>{L(TF(r.want))}</td>}
              <td>{run && k < run.results.length ? L(TF(checked.results[k].got)) : !run && k === rows.indexOf(row) ? L(TF(view.value)) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {verdictText && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
    </div>
  )
  const dock = (
    <RunDock
      {...playback.dock({ go: tr('逐行运行', 'Run row by row'), done: tr('真值表全部正确', 'Truth table correct') })}
    />
  )
  const built = builtOf(level.gates)
  const toggle = (node) => change({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === node.id ? { ...n, open: !n.open } : n)) })
  const inside = (node) => <GateInside type={node.type} gates={level.gates} ins={insOf(circuit, node, view.values)} phone={phone} />
  const body = (node) => <div className="lg-card"><CardValue value={valueOf(node)} error={errorOf(node)} />{!phone && node.open && built.is(node) && inside(node)}</div>

  if (phone) return <PhoneGates {...{ circuit, parts, items, foldedItems, brief, dock, change, addNode, onClear, table, body, valueOf, errorOf, types, built, inside }} scope={level.id} />

  return (
    <Workbench
      className="lg-level"
      brief={brief}
      parts={items.length + foldedItems.length > 0 && <Palette compact items={items} folded={foldedItems} onAdd={add} />}
      stage={
        <div className="lg-stage">
          <div className="lg-board">
            <CanvasEditor
              onClear={onClear}
              types={types}
              key={level.id}
              scope={level.id}
              graph={circuit}
              onChange={change}
              parts={parts}
              width={140}
              height={110}
              body={body}
              head={(node) => <BuiltTools node={node} built={built} onToggle={() => toggle(node)} />}
              cardClass={(node) => `lg-node ${node.type === 'out' && verdict ? (verdict.pass ? 'is-pass' : 'is-fail') : ''}`}
              wireState={(wire) => (view.values.get(wire.from) !== undefined ? 'live' : 'dead')}
              emptyNote={{ zh: '从上方元件栏选择门放到板上，再把元件右侧的圆点连到另一元件左侧的圆点。', en: 'Place a gate from the bar above, then connect a dot on the right of one part to a dot on the left of another.' }}
            />
          </div>
        </div>
      }
      status={<TestStatus states={states} />}
      results={table}
      dock={dock}
    />
  )
}

/** What a card gives on the row picked: true or false, or why it gives nothing yet. */
function CardValue({ value, error }) {
  if (value !== undefined) return <span className={`lg-tv ${value ? 'is-true' : 'is-false'}`}>{L(TF(value))}</span>
  return <span className={`lg-error ${error === MISSING || !error ? 'is-missing' : ''}`}>{!error || error === MISSING ? tr('等待接线', 'Not wired yet') : L(error)}</span>
}

// The board on a phone: the shared slot board, the truth table under it, and the run bar.
function PhoneGates({ circuit, parts, items, foldedItems, brief, dock, change, addNode, onClear, table, body, valueOf, errorOf, types, built, inside, scope }) {
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
  return (
    <PhonePage rootRef={root} scrollRef={scroller} className="lg-phone" brief={brief} tray={<Tray items={items} folded={foldedItems} onPick={editing.placeFirstFree} />} results={table} dock={dock}>
      <SlotBoard dense graph={circuit} parts={parts} nameOf={editing.nameOf} thumb={(n) => <CardValue value={valueOf(n)} error={errorOf(n)} />} sinkBody={(n) => body(n)} picking={editing.picking} moving={editing.moving} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} widthOf={editing.widthOf} history={editing.history} onClear={onClear} onChange={change} types={types} />
      <Notice editing={editing} />
      {node && (
        <Sheet title={editing.nameOf(node)} onClose={() => setSheet(null)}>
          <div className="lg-sheet">
            {parts.role(node) === 'part' && <p className="lg-desc">{L(parts.rules[node.type].desc)}</p>}
            {body(node)}
            {built.is(node) && inside(node)}
            {parts.role(node) === 'part' && <PartActions onEdit={built.is(node) ? () => { setSheet(null); built.edit(node.type) } : null} onMove={() => { editing.startMove(node.id); setSheet(null) }} onRemove={node.locked ? null : () => { editing.remove(node.id); setSheet(null) }} />}
          </div>
        </Sheet>
      )}
      {sheet?.slot !== undefined && (
        <Sheet title={tr('放在这一格', 'Place in this slot')} onClose={() => setSheet(null)}>
          <div className="lg-add">
            {[...items, ...foldedItems].map((item) => (
              <button key={item.type} type="button" data-family={item.family} onClick={() => { editing.place(item.type, sheet.slot); setSheet(null) }}>
                <b>{L(item.label)}</b>
                <small>{L(item.desc)}</small>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </PhonePage>
  )
}

// The board inside a built gate: its letters are the gate's ports, its output the gate's.
const insideParts = (gates) => ({ ...gatePartsFor(gates, (name) => ({ zh: name, en: name })), label: (node) => (node.type === 'letter' ? { zh: node.params.name, en: node.params.name } : node.type === 'out' ? T('输出', 'Out') : gatesOf(gates)[node.type]?.name ?? node.type) })

/**
 * The board a gate the player built runs (gates.js builtGates opens), read only: on a desktop the circuit editor with
 * the gate's ports on its edges, on a phone the slot board. Fed `ins` (what reaches the gate's ports, by port), each
 * card shows what it gives; without them (the components box) the board shows how it is wired. A gate on it the player
 * built opens the same way, here only.
 */
export function GateInside({ type, gates, ins = null, phone }) {
  const [opened, setOpened] = useState(() => new Set())
  const { circuit, level } = gates[type].opens()
  const parts = useMemo(() => insideParts(level.gates), [level])
  const view = useMemo(() => ins && runBoard(circuit, { parts: gateParts(level.gates), bind: ins }), [circuit, level, JSON.stringify(ins)])
  const built = builtOf(level.gates)
  const graph = { ...circuit, nodes: circuit.nodes.map((n) => (opened.has(n.id) ? { ...n, open: true } : n)) }
  const toggle = (node) => setOpened((was) => {
    const next = new Set(was)
    if (!next.delete(node.id)) next.add(node.id)
    return next
  })
  const value = (node) => (view ? <CardValue value={node.type === 'out' ? view.outputs.out : view.values.get(node.id)} error={view.errors.get(node.id)} /> : null)
  const nested = (node) => built.is(node) && <GateInside type={node.type} gates={level.gates} ins={view && insOf(circuit, node, view.values)} phone={phone} />
  if (phone) {
    return (
      <div className="lg-inside-phone" onPointerDown={(e) => e.stopPropagation()}>
        <div className="lg-inside-scroll">
          <SlotBoard fixed dense graph={graph} parts={parts} nameOf={(n) => L(parts.label(n))} thumb={value} sinkBody={() => null} onPort={() => {}} onSlot={() => {}} onNode={(id) => built.is(graph.nodes.find((n) => n.id === id)) && toggle({ id })} />
        </div>
        {graph.nodes.filter((n) => n.open && built.is(n)).map((n) => <div key={n.id}>{nested(n)}</div>)}
      </div>
    )
  }
  const shown = edgeParts(parts)
  return (
    <div className="lg-inside" onPointerDown={(e) => e.stopPropagation()}>
      <CanvasEditor
        readOnly
        key={type}
        graph={edged(graph, shown)}
        parts={shown}
        width={140}
        height={110}
        head={(node) => <BuiltTools node={node} built={built} onToggle={() => toggle(node)} />}
        body={(node) => (parts.role(node) === 'part' ? <div className="lg-card">{value(node)}{node.open && nested(node)}</div> : null)}
        cardClass={(node) => (parts.role(node) === 'part' ? 'lg-node' : 'lg-edge')}
        wireState={(wire) => (view?.values.get(wire.from) !== undefined ? 'live' : 'dead')}
      />
    </div>
  )
}
