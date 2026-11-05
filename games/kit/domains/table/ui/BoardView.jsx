import { useRef } from 'react'
import { CanvasEditor, Choice, Notice, Palette, SlotBoard, Tray, placement, useSlotEditing } from '../../../circuit/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { PhonePage } from '../../../shell/index.js'
import { signal } from '../model/format.js'
import { isCard } from '../model/parts.js'
import { CARD_W } from './board.js'

// A table board on the shared circuit editor (../../../circuit), the one Vision Complete uses: the same cards, dots,
// wires, keys and gestures. `board` is the circuit level's bridge to it (modes/Circuit.jsx); what a card shows here is
// the value its output carries at the robot's cell, an input card what it reads (board.cardView), and a constant's or
// a merger's setting, chosen with buttons (the kit's Choice) as on the phone's sheet. What a part is comes from the
// course's board model (board.model, ../model/run.js modelOf).

const valueOf = (probe, id) => (probe && id in probe ? signal(probe[id]) : '')
// What a part's card shows: what it computed, or 未算到 when a stopped run never got to it. (A reader shows what it
// reads beside each of its outputs.)
const shownOf = (node, probe, reading) => {
  const text = valueOf(probe, node.id)
  return !text && reading?.halted ? { text: tr('未算到', 'not reached'), cls: 'is-unreached' } : { text }
}
const stop = (event) => event.stopPropagation()

/** Desktop: the board on the workbench's stage, the whole middle column; the parts are in the brief, the view beside the test board. */
export function SgCanvas({ board, overlay }) {
  const graph = board.graph()
  const parts = board.parts()
  const probe = board.probe()
  const reading = board.reading?.()
  const { def, hasValue, valueDefault } = board.model
  const body = (node) => {
    const { text: value, cls } = shownOf(node, probe, reading)
    const swaps = parts.role(node) === 'part' ? board.swaps(node.type) : []
    return (
      <div className={`sg-body ${isCard(node.type) ? 'is-reader' : ''}`} title={parts.role(node) === 'part' ? L(def(node.type).desc) : undefined}>
        {hasValue(node.type) && (
          <div className="param is-choice">
            <span>{tr('数值', 'Value')}</span>
            <Choice options={board.consts().map((v) => [v, String(v)])} value={node.params?.value ?? valueDefault(node.type)} onChange={(v) => board.setValue(node.id, v)} label={tr('数值', 'Value')} />
          </div>
        )}
        {/* An input card holds what it reads, as on a phone: the robot's window and arm, or the cell's facts; click one
            to add or remove its output, which runs down the card's right edge with what it carries. */}
        {isCard(node.type) && <div className="sg-cardview" data-cardview={node.type} onPointerDown={stop}>{board.cardView(node.type)}</div>}
        {swaps.length > 1 && (
          <div className="param is-choice">
            <span>{tr('操作', 'Operation')}</span>
            <Choice options={swaps.map((k) => [k, def(k).tag])} value={node.type} onChange={(k) => board.swap(node.id, k)} label={tr('操作', 'Operation')} />
          </div>
        )}
        {parts.role(node) === 'part' && !hasValue(node.type) && swaps.length < 2 && <small className="sg-tag">{L(def(node.type).tag)}</small>}
        {/* A card shows what it reads beside each of its outputs. */}
        {!isCard(node.type) && <output className={`sg-val ${value && !cls ? 'is-on' : ''} ${cls ?? ''}`}>{value || '—'}</output>}
      </div>
    )
  }
  const wireState = (wire) => {
    if (!probe || !(wire.from in probe)) return null
    const v = probe[wire.from]
    return v === null || v === false ? 'dead' : 'live'
  }
  return (
    <div className="sg-canvas">
      <CanvasEditor
        graph={graph}
        onChange={board.change}
        parts={parts}
        body={body}
        outNote={(node, key) => <b className="sg-oval">{board.outValue(node, key) || '—'}</b>}
        wireState={wireState}
        width={CARD_W}
        height={170}
        minFit={0.62}
        overlay={overlay}
        scope={board.stage()}
        onClear={board.clearable() ? board.reset : null}
        types={board.types()}
      />
    </div>
  )
}

/** Desktop: the level's parts, in the brief as in every game, each with what it does. Clicking one puts it in the first free spot. */
export function SgParts({ board }) {
  const add = (kind) => {
    const graph = board.graph()
    const at = placement(graph, board.parts()).free[0]
    board.change(board.create(graph, kind, at).graph)
  }
  const item = (p) => ({ ...p, label: p.name, desc: p.desc, style: { '--fam': 'var(--accent)' } })
  return <Palette items={board.palette().map(item)} folded={board.folded().map(item)} onAdd={add} compact />
}

/** Phone: the level's page (the shell's PhonePage), the board as a grid of slots, the parts tray and the dock pinned
 *  under it; `children` float over the page (a toast, a sheet). */
export function SgPhone({ board, rootRef, brief, tests, results, dock, children }) {
  const scroller = useRef(null)
  const graph = board.graph()
  const parts = board.parts()
  const probe = board.probe()
  const { def, hasValue, valueDefault } = board.model
  const editing = useSlotEditing({
    root: rootRef,
    scroller,
    graph,
    onChange: board.change,
    parts,
    create: board.create,
    label: parts.label,
    openNode: (id) => board.openNode(id, parts.role(graph.nodes.find((n) => n.id === id) ?? {}) === 'part' ? { move: () => editing.startMove(id) } : {}),
    openSlot: (at) => board.openSlot(at, { place: (kind) => editing.place(kind, at) }),
    scope: board.stage(),
  })
  const reading = board.reading?.()
  const thumb = (node) => {
    // An input card holds what it reads (the robot's window, the cell's facts): tap one to add or remove its output,
    // which then sits over its own dot with what it carries (outNote). A tap anywhere else on the card opens its sheet.
    if (isCard(node.type)) return <div className="sg-cardview" data-cardview={node.type}>{board.cardView(node.type)}</div>
    const { text, cls } = shownOf(node, probe, reading)
    return <i className={`sg-thumb ${text && !cls ? 'is-on' : ''} ${cls ?? ''}`}>{text || '—'}</i>
  }
  // A tile says what it holds: a constant its number, any other part its model. (An input card names each output over its dot.)
  const tileExtra = (node) => (hasValue(node.type) ? `= ${node.params?.value ?? valueDefault(node.type)}` : parts.role(node) === 'part' ? L(def(node.type).tag) : null)
  // On a phone a part goes by its name alone; what it does is in its sheet.
  const tray = <Tray items={board.palette().map((p) => ({ ...p, label: p.name, family: 'sg' }))} folded={board.folded().map((p) => ({ ...p, label: p.name, family: 'sg' }))} onPick={editing.placeFirstFree} />
  return (
    <PhonePage rootRef={rootRef} scrollRef={scroller} className="sg-level is-circuit" brief={brief} tests={tests} tray={tray} results={results} dock={dock}>
      {children}
      <div className="sg-slots">
        <SlotBoard graph={graph} parts={parts} nameOf={editing.nameOf} thumb={thumb} tileExtra={tileExtra} outNote={(node, key) => (isCard(node.type) ? <b className="sg-oval">{board.outValue(node, key) || '—'}</b> : null)} picking={editing.picking} moving={editing.moving} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} onClear={board.clearable() ? board.reset : null} onChange={board.change} types={board.types()} />
      </div>
      <Notice editing={editing} />
    </PhonePage>
  )
}
