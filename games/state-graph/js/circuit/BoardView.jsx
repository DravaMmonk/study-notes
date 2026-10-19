import { useLayoutEffect, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { CanvasEditor, Choice, Notice, Palette, SlotBoard, Tray, placement, useSlotEditing } from '../../../kit/circuit/index.js'
import { L, tr } from '../../../kit/shell/i18n.js'
import { signal } from '../util.js'
import { def, hasValue, valueDefault, isInput, isViewReader, picksOf } from './components.js'

// 状态之图's circuit board on the shared circuit editor (../../../kit/circuit), the one Vision Complete uses: the same
// cards, dots, wires, keys and gestures. `board` is the circuit mode's bridge (modes/circuit.js `ctl.board`); what a
// card shows here is the value its output carries at the robot's cell, and a constant's or a merger's setting, chosen
// with buttons (the kit's Choice) as on the phone's sheet.

const valueOf = (probe, id) => (probe && id in probe ? signal(probe[id]) : '')
// What a part's card shows: what it computed, or 未算到 when a stopped run never got to it. (A reader shows what it
// reads beside each of its outputs.)
const shownOf = (node, probe, reading) => {
  const text = valueOf(probe, node.id)
  return !text && reading?.halted ? { text: tr('未算到', 'not reached'), cls: 'is-unreached' } : { text }
}
const stop = (event) => event.stopPropagation()

/** 视野's box: a blank square for each cell the robot sees (its own framed); the ones it reads are lit, each an output
 *  of its own. Click a square to read it too, or to stop reading it. */
function ReaderBox({ grid, onPick }) {
  return (
    <div className="rgrid" style={{ '--rn': grid.n }} onPointerDown={stop} role="group" aria-label={tr('读哪几格', 'Which cells')}>
      {grid.cells.map((x) => (
        <button key={`${x.dr},${x.dc}`} type="button" className={`rcell ${x.on ? 'on' : ''} ${x.self ? 'self' : ''}`} disabled={!x.ok} aria-pressed={x.on} aria-label={`${x.dr},${x.dc}`} onClick={() => onPick(x.dr, x.dc)} />
      ))}
    </div>
  )
}

/** What 视野's arm reaches (a telescopic arm's cells, a sweep): each picked one is an output of its own. */
function ArmPicks({ items, onPick }) {
  return (
    <div className="fpicks" onPointerDown={stop} role="group" aria-label={tr('手臂够到的', 'What the arm reaches')}>
      {items.map((a) => (
        <button key={a.key} type="button" className={`fpick ${a.on ? 'on' : ''}`} aria-pressed={a.on} title={L(a.label)} onClick={() => onPick(a.key)}>{L(a.label)}</button>
      ))}
    </div>
  )
}

/** One output of 本格信息 on the desktop: which fact it reads (one it does not read on another output), what that is
 *  now, and × to take the output off. */
function FactPort({ node, pick, board }) {
  const picks = picksOf({ kind: node.type, value: node.value })
  const options = board.inputOptions('fact').filter(([v]) => v === pick || !picks.includes(v))
  return (
    <span className="fport" onPointerDown={stop}>
      <select value={pick} onChange={(e) => board.setPick(node.id, pick, e.target.value)} aria-label={tr('这个输出口读哪一条', 'Which fact this output reads')}>
        {options.map(([v, l]) => <option key={v} value={v}>{L(l)}</option>)}
      </select>
      <b className="sg-oval">{board.outValue(node, pick) || '—'}</b>
      {<button type="button" className="fport-del" onClick={() => board.togglePick(node.id, pick)} aria-label={tr('去掉这个输出口', 'Remove this output')}><X size={11} /></button>}
    </span>
  )
}

/** Under a cell reader's output rows (which sit over this space): a button for one more output, up to the most. */
function FactRows({ node, board }) {
  const picks = picksOf({ kind: node.type, value: node.value })
  const more = picks.length < board.inputOptions('fact').length
  return (
    <div className="frows" style={{ '--n': picks.length }}>
      {more && <button type="button" className="fport-add" onPointerDown={stop} onClick={() => board.addPick(node.id)}><Plus size={12} />{tr('加一个输出口', 'Add an output')}</button>}
    </div>
  )
}

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
        {/* An input part is set on its card: what it reads on the left (the robot's view, the cell's facts), its
            outputs beside that on the right edge, then for a layered view reader which layer. */}
        {isInput(node.type) && (
          // The outputs run down the card's right edge beside the box: the box keeps room for all of them.
          <div className={`rd-pick is-${node.type}`} style={node.type === 'see' ? { minHeight: Math.max(64, picksOf({ kind: node.type, value: node.value }).length * 20 - 6) } : undefined}>
            {isViewReader(node.type) && <ReaderBox grid={board.gridOf(node)} onPick={(dr, dc) => board.setPos(node.id, dr, dc)} />}
            {node.type === 'see' && board.armOf(node).length > 0 && <ArmPicks items={board.armOf(node)} onPick={(key) => board.togglePick(node.id, key)} />}
            {node.type === 'fact' && <FactRows node={node} board={board} />}
          </div>
        )}
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
        outNote={(node, key) => (node.type === 'fact' ? <FactPort node={node} pick={key} board={board} /> : <b className="sg-oval">{board.outValue(node, key) || '—'}</b>)}
        wireState={wireState}
        width={176}
        height={120}
        minFit={0.62}
        overlay={overlay}
        scope={board.stage()}
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
  return <Palette items={board.palette().map((p) => ({ ...p, label: p.name, desc: p.desc, style: { '--fam': 'var(--accent)' } }))} onAdd={add} compact />
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
    reset: board.reset,
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
        <SlotBoard graph={graph} parts={parts} nameOf={editing.nameOf} thumb={thumb} tileExtra={tileExtra} outNote={(node, key) => (isInput(node.type) ? <b className="sg-oval">{board.outValue(node, key) || '—'}</b> : null)} picking={editing.picking} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} history={editing.history} />
      </div>
      <div className="sg-foot">
        {/* On a phone a part goes by its name alone; what it does is in its sheet. */}
        <Tray items={board.palette().map((p) => ({ ...p, label: p.name, family: 'sg' }))} onPick={editing.placeFirstFree} />
        {dock}
      </div>
      <Notice editing={editing} />
    </>
  )
}
