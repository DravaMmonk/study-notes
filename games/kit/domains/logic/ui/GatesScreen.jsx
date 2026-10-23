import { useMemo, useRef, useState } from 'react'
import { ArrowRightFromLine, CircleDot, Cpu, ToggleLeft, Trash2 } from 'lucide-react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus, usePlayback } from '../../../shell/index.js'
import Sheet from '../../../shell/Sheet.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, Notice, Palette, SlotBoard, Tray, spotIn, useSlotEditing } from '../../../circuit/index.js'
import { MISSING } from '../../../engine/circuit.js'
import { parse } from '../formula.js'
import { say } from '../notation.js'
import { PRIMITIVE_GATES, checkGates, countGates, gatesOf, rowsFor, runRow, startGates } from '../gates.js'

// A truth-circuit level (《证明完毕》, gates.js) on the shared circuit editor: a card for each letter on the left, the
// sentence's output on the right, gates as parts. The tests are the rows of the sentence's truth table, picked in the table itself (no row tabs, whose labels would
// spell the row out twice): picking one
// shows on every card what the board computes on that row. Running goes down the table one row at a time, as a machine
// filling it in (../../../shell/usePlayback.jsx, each row a test of no steps): each row's card values and result show
// in turn, and the run stops on the first row it gets wrong. A `hideTarget`
// level does not show the target value column; a `blind` one does not show its sentence either: it is a puzzle said in
// words.

const TF = (v) => (v === undefined ? '—' : v ? tr('真', 'T') : tr('假', 'F'))
const T = (zh, en) => ({ zh, en })
const WRONG_ROW = T('这一行算错了', 'This row is wrong')
const SOURCE = T('输入', 'Input')
/** The editor's description of a board of gates (../../circuit/model.js), with a level's words for its letters. */
function gatePartsFor(built, wordOf) {
  const all = gatesOf(built)
  return {
    inputs: (node) => (node.type === 'out' ? ['in'] : node.type === 'letter' ? [] : all[node.type]?.ports ?? []),
    role: (node) => (node.type === 'letter' ? 'source' : node.type === 'out' ? 'sink' : 'part'),
    label: (node) => (node.type === 'letter' ? wordOf(node.params.name) ?? SOURCE : node.type === 'out' ? T('这句话', 'The sentence') : all[node.type]?.name ?? node.type),
    portLabel: (node, port) => (all[node.type] && all[node.type].ports.length > 1 ? port : ''),
    family: (node) => (node.type === 'letter' ? 'given' : node.type === 'out' ? 'end' : PRIMITIVE_GATES[node.type] ? 'gate' : 'built'),
    icon: (node) => (node.type === 'letter' ? ArrowRightFromLine : node.type === 'out' ? CircleDot : PRIMITIVE_GATES[node.type] ? ToggleLeft : Cpu),
    cardWidth: (node) => (node.type === 'letter' || node.type === 'out' ? 170 : 140),
    rules: all,
  }
}

// A saved board still fits: its letters are the level's, and every card is a gate it knows.
const fits = (circuit, level, parts) => {
  const letters = circuit.nodes.filter((n) => n.type === 'letter').map((n) => n.params.name).sort().join()
  return letters === [...rowsFor(level).letters].sort().join() && circuit.nodes.every((n) => n.type === 'letter' || n.type === 'out' || parts.rules[n.type])
}

export default function GatesScreen({ game, level: entry, saved, save, solve, flags, phone }) {
  const level = entry.source
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
  const reset = () => change(startGates(level))
  // A run down the table: every row checked at once, shown one at a time; over budget fails it once every row is right.
  const checked = useMemo(() => checkGates(level, circuit), [level, circuit])
  const playback = usePlayback({
    count: rows.length,
    stepsOf: () => [],
    check: (k) => (checked.results[k].pass ? '' : WRONG_ROW),
    final: () => (checked.overBudget ? tr(`每一行都对，但用了 ${checked.gates} 个门，这一关最多 ${level.budget} 个。`, `Every row is right, but it takes ${checked.gates} gates; this level allows ${level.budget}.`) : ''),
    onSolve: () => solve({ steps: checked.gates }),
    onTest: setRowIndex,
    board: circuit,
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
    : verdict.pass ? tr('每一行都对：这块电路算出了这句话的整张真值表。', 'Every row is right: this board computes the sentence’s whole truth table.')
    : run.final || tr('这一行算错了，机器停在了这里：板上每张卡片显示的是它在这一行算出的值。', 'This row is wrong, and the machine stopped here: every card on the board shows what it computed on this row.')
  const valueOf = (node) => (node.type === 'out' ? view.value : view.values.get(node.id))
  const errorOf = (node) => view.errors.get(node.id)

  const itemOf = (type) => ({ type, label: parts.rules[type].name, desc: parts.rules[type].desc, icon: parts.icon({ type }), family: parts.family({ type }), fresh: entry.fresh?.includes(type) })
  const items = palette.filter((t) => parts.rules[t]).map(itemOf)
  const foldedItems = folded.filter((t) => parts.rules[t]).map(itemOf)
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
          <tr>{letters.map((l) => <th key={l}>{L(word(l))}</th>)}{!hideTarget && <th>{tr('目标真值', 'Target value')}</th>}<th>{tr('电路输出', 'Board output')}</th></tr>
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
      secondary={circuit.nodes.some((n) => parts.role(n) === 'part') ? { label: tr('清空', 'Clear'), icon: <Trash2 size={16} />, onClick: reset } : null}
      {...playback.dock({ go: tr('一行一行算', 'Run row by row'), done: tr('整张表都对', 'Whole table right') })}
    />
  )
  const body = (node) => <div className="lg-card"><CardValue value={valueOf(node)} error={errorOf(node)} /></div>

  if (phone) return <PhoneGates {...{ circuit, parts, items, foldedItems, brief, dock, change, addNode, reset, table, body, valueOf, errorOf }} scope={level.id} />

  return (
    <CircuitLayout
      className="lg-level"
      brief={brief}
      parts={items.length + foldedItems.length > 0 && <Palette compact items={items} folded={foldedItems} onAdd={add} />}
      canvas={
        <div className="lg-stage">
          <div className="lg-board">
            <CanvasEditor
              key={level.id}
              scope={level.id}
              graph={circuit}
              onChange={change}
              parts={parts}
              width={140}
              height={110}
              body={body}
              cardClass={(node) => `lg-node ${node.type === 'out' && verdict ? (verdict.pass ? 'is-pass' : 'is-fail') : ''}`}
              wireState={(wire) => (view.values.get(wire.from) !== undefined ? 'live' : 'dead')}
              emptyNote={{ zh: '从上面一排元件里选一个门放上来，再从卡片右侧的圆点连到另一张卡片左侧的圆点。', en: 'Pick a gate from the row above, then wire a dot on the right of a card to a dot on the left of another.' }}
            />
          </div>
        </div>
      }
      status={<TestStatus states={states} />}
      outputsTitle={tr('真值表', 'Truth table')}
      outputs={table}
      actions={<footer className="run-foot">{dock}</footer>}
    />
  )
}

/** What a card gives on the row picked: true or false, or why it gives nothing yet. */
function CardValue({ value, error }) {
  if (value !== undefined) return <span className={`lg-tv ${value ? 'is-true' : 'is-false'}`}>{L(TF(value))}</span>
  return <span className={`lg-error ${error === MISSING || !error ? 'is-missing' : ''}`}>{!error || error === MISSING ? tr('等接线', 'Waiting for wires') : L(error)}</span>
}

// The board on a phone: the shared slot board, the truth table under it, and the run bar.
function PhoneGates({ circuit, parts, items, foldedItems, brief, dock, change, addNode, reset, table, body, valueOf, errorOf, scope }) {
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
    reset,
    root,
    scroller,
    scope,
  })
  const node = sheet?.node && circuit.nodes.find((n) => n.id === sheet.node)
  return (
    <div className="level-phone is-split lg-phone" ref={root}>
      <div className="lg-scroll" ref={scroller}>
        <TaskCard>{brief}</TaskCard>
        <SlotBoard dense graph={circuit} parts={parts} nameOf={editing.nameOf} thumb={(n) => <CardValue value={valueOf(n)} error={errorOf(n)} />} sinkBody={(n) => body(n)} picking={editing.picking} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} />
        {table}
      </div>
      <Tray items={items} folded={foldedItems} onPick={editing.placeFirstFree} />
      <footer className="run-foot">{dock}</footer>
      <Notice editing={editing} />
      {node && (
        <Sheet title={editing.nameOf(node)} onClose={() => setSheet(null)}>
          <div className="lg-sheet">
            {parts.role(node) === 'part' && <p className="lg-desc">{L(parts.rules[node.type].desc)}</p>}
            {body(node)}
            {parts.role(node) === 'part' && <button type="button" className="lg-remove" onClick={() => { editing.remove(node.id); setSheet(null) }}><Trash2 size={15} />{tr('拿掉这一块', 'Remove this block')}</button>}
          </div>
        </Sheet>
      )}
      {sheet?.slot !== undefined && (
        <Sheet title={tr(`放进第 ${sheet.slot + 1} 格`, `Place in slot ${sheet.slot + 1}`)} onClose={() => setSheet(null)}>
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
    </div>
  )
}
