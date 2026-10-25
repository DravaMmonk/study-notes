import { useLayoutEffect, useRef } from 'react'
import { CanvasEditor, Choice, Notice, Palette, SlotBoard, Tray, placement, useSlotEditing } from '../../../circuit/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { signal } from '../util.js'
import { def, hasValue, valueDefault, isInput } from './components.js'
import { CARD_W } from './board.js'

// 状态之图's circuit board on the shared circuit editor (../../../kit/circuit), the one Vision Complete uses: the same
// cards, dots, wires, keys and gestures. `board` is the circuit mode's bridge (modes/circuit.js `ctl.board`); what a
// card shows here is the value its output carries at the robot's cell, an input card what it reads (as on a phone),
// and a constant's or a merger's setting, chosen with buttons (the kit's Choice) as on the phone's sheet.

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
  const body = (node) => {
    const { text: value, cls } = shownOf(node, probe, reading)
    const swaps = parts.role(node) === 'part' ? board.swaps(node.type) : []
    return (
      <div className={`sg-body ${isInput(node.type) ? 'is-reader' : ''}`} title={parts.role(node) === 'part' ? L(def(node.type).desc) : undefined}>
        {hasValue(node.type) && (
          <div className="param is-choice">
            <span>{tr('数值', 'Value')}</span>
            <Choice options={board.consts().map((v) => [v, String(v)])} value={node.value ?? valueDefault(node.type)} onChange={(v) => board.setValue(node.id, v)} label={tr('数值', 'Value')} />
          </div>
        )}
        {node.type === 'is' && (
          <div className="param is-choice">
            <span>{tr('哪一类', 'Kind')}</span>
            <Choice options={board.kinds(node.id)} value={node.value ?? ''} onChange={(v) => board.setValue(node.id, v)} label={tr('哪一类', 'Kind')} />
          </div>
        )}
        {/* An input card holds what it reads, as on a phone: the robot's window and arm, or the cell's facts, painted by
            the mode ([data-cardview]); click one to add or remove its output, which runs down the card's right edge
            with what it carries. */}
        {isInput(node.type) && <div className="sg-cardview" data-cardview={node.type === 'fact' ? 'facts' : 'view'} onPointerDown={stop} />}
        {board.layerChoices(node.type).length > 0 && (
          <div className="param is-choice">
            <span>{tr('层', 'Layer')}</span>
            <Choice options={board.layerChoices(node.type)} value={board.layerOf(node)} onChange={(k) => board.setLayer(node.id, k)} label={tr('层', 'Layer')} />
          </div>
        )}
        {node.type === 'arm' && (
          <div className="param is-choice">
            <span>{tr('读', 'Reads')}</span>
            <Choice options={board.inputOptions(node.type)} value={node.value ?? ''} onChange={(v) => board.setValue(node.id, v)} label={tr('读', 'Reads')} />
          </div>
        )}
        {swaps.length > 1 && (
          <div className="param is-choice">
            <span>{tr('操作', 'Operation')}</span>
            <Choice options={swaps.map((k) => [k, def(k).tag])} value={node.type} onChange={(k) => board.swap(node.id, k)} label={tr('操作', 'Operation')} />
          </div>
        )}
        {parts.role(node) === 'part' && !hasValue(node.type) && !isInput(node.type) && swaps.length < 2 && <small className="sg-tag">{L(def(node.type).tag)}</small>}
        {/* A reader shows what it reads beside each of its outputs. */}
        {!isInput(node.type) && <output className={`sg-val ${value && !cls ? 'is-on' : ''} ${cls ?? ''}`}>{value || '—'}</output>}
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

/** Phone: the board as a grid of slots, with the parts tray and the level's dock pinned under it. */
export function SgPhone({ board, rootRef, dock }) {
  const scroller = useRef(null)
  // The input cards' contents are the mode's markup: paint them after every render (a card may be new).
  useLayoutEffect(() => board.paintView?.())
  const graph = board.graph()
  const parts = board.parts()
  const probe = board.probe()
  const editing = useSlotEditing({
    root: rootRef,
    scroller,
    graph,
    onChange: board.change,
    parts,
    create: board.create,
    label: parts.label,
    openNode: (id) => board.openNode(id),
    openSlot: (at) => board.openSlot(at),
    scope: board.stage(),
  })
  const reading = board.reading?.()
  const thumb = (node) => {
    // An input card holds what it reads (the robot's window, the cell's facts), painted by the mode: tap one to add or
    // remove its output, which then sits over its own dot with what it carries (outNote). A tap anywhere else on the
    // card opens its sheet.
    if (isInput(node.type)) return <div className="sg-cardview" data-cardview={node.type === 'fact' ? 'facts' : 'view'} onClick={(event) => event.target.closest('[data-act]') && event.stopPropagation()} />
    const { text, cls } = shownOf(node, probe, reading)
    return <i className={`sg-thumb ${text && !cls ? 'is-on' : ''} ${cls ?? ''}`}>{text || '—'}</i>
  }
  // A tile says what it holds: a constant its number, any other part its model. (An input card names each output over its dot.)
  const tileExtra = (node) => (hasValue(node.type) ? `= ${node.value ?? valueDefault(node.type)}` : isInput(node.type) ? null : L(def(node.type).tag))
  return (
    <>
      <div className="sg-slots" ref={scroller}>
        <SlotBoard graph={graph} parts={parts} nameOf={editing.nameOf} thumb={thumb} tileExtra={tileExtra} outNote={(node, key) => (isInput(node.type) ? <b className="sg-oval">{board.outValue(node, key) || '—'}</b> : null)} picking={editing.picking} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} onClear={board.clearable() ? board.reset : null} onChange={board.change} types={board.types()} />
      </div>
      <div className="sg-foot">
        {/* On a phone a part goes by its name alone; what it does is in its sheet. */}
        <Tray items={board.palette().map((p) => ({ ...p, label: p.name, family: 'sg' }))} folded={board.folded().map((p) => ({ ...p, label: p.name, family: 'sg' }))} onPick={editing.placeFirstFree} />
        {dock}
      </div>
      <Notice editing={editing} />
    </>
  )
}
