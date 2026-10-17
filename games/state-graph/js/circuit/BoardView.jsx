import { useRef } from 'react'
import { CanvasEditor, FloatWindow, Notice, Palette, SlotBoard, Tray, placement, useSlotEditing } from '../../../kit/circuit/index.js'
import { L, tr } from '../../../kit/shell/i18n.js'
import { signal } from '../util.js'
import { def } from './components.js'

// 状态之图's circuit board on the shared circuit editor (../../../kit/circuit), the one Vision Complete uses: the same
// cards, dots, wires, keys and gestures. `board` is the circuit mode's bridge (modes/circuit.js `ctl.board`); what a
// card shows here is the value its output carries at the robot's cell, and a constant's or a merger's setting.

const valueOf = (probe, id) => (probe && id in probe ? signal(probe[id]) : '')
const stop = (event) => event.stopPropagation()

/** Desktop: the board on the workbench's stage, with the robot's view (top left) and the parts (top right) floating over it. */
export function SgCanvas({ board }) {
  const graph = board.graph()
  const parts = board.parts()
  const probe = board.probe()
  const body = (node) => {
    const value = valueOf(probe, node.id)
    const swaps = parts.role(node) === 'part' ? board.swaps(node.type) : []
    return (
      <div className="sg-body" title={parts.role(node) === 'part' ? L(def(node.type).desc) : undefined}>
        {node.type === 'const' && (
          <label className="param" onPointerDown={stop}>
            <span>{tr('数值', 'Value')}</span>
            <select value={node.value ?? 1} onChange={(e) => board.setValue(node.id, +e.target.value)}>
              {board.consts().map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        )}
        {swaps.length > 1 && (
          <label className="param" onPointerDown={stop}>
            <span>{tr('型号', 'Model')}</span>
            <select value={node.type} onChange={(e) => board.swap(node.id, e.target.value)}>
              {swaps.map((k) => <option key={k} value={k}>{L(def(k).tag)}</option>)}
            </select>
          </label>
        )}
        {parts.role(node) === 'part' && node.type !== 'const' && swaps.length < 2 && <small className="sg-tag">{L(def(node.type).tag)}</small>}
        <output className={`sg-val ${value ? 'is-on' : ''}`}>{value || '—'}</output>
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
        wireState={wireState}
        width={176}
        height={120}
        overlay={
          <>
            <FloatWindow id="state-graph.robot" title={{ zh: '机器人视野', en: "Robot's view" }} at={{ left: 12, top: 12 }} className="is-view">
              {/* Painted by the circuit mode (mounted): the robot's window, where cells are lit as inputs. */}
              <div className="cview" id="cview" />
            </FloatWindow>
            <FloatWindow id="state-graph.palette" title={{ zh: '元件', en: 'Parts' }} at={{ right: 12, top: 12 }}>
              <SgParts board={board} />
            </FloatWindow>
          </>
        }
      />
    </div>
  )
}

/** Desktop: the parts, one line each with what they do in a tooltip. Clicking one puts it in the first free spot. */
function SgParts({ board }) {
  const add = (kind) => {
    const graph = board.graph()
    const at = placement(graph, board.parts()).free[0]
    board.change(board.create(graph, kind, at).graph)
  }
  return <Palette compact items={board.palette().map((p) => ({ ...p, label: p.name, style: { '--fam': 'var(--accent)' } }))} onAdd={add} />
}

/** Phone: the board as a grid of slots, with the parts tray and the level's dock pinned under it. */
export function SgPhone({ board, rootRef, dock }) {
  const scroller = useRef(null)
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
  })
  const thumb = (node) => <i className={`sg-thumb ${valueOf(probe, node.id) ? 'is-on' : ''}`}>{valueOf(probe, node.id) || '—'}</i>
  const tileExtra = (node) => (node.type === 'const' ? `= ${node.value ?? 1}` : L(def(node.type).tag))
  return (
    <>
      <div className="sg-slots" ref={scroller}>
        <SlotBoard graph={graph} parts={parts} nameOf={editing.nameOf} thumb={thumb} tileExtra={tileExtra} picking={editing.picking} canLand={editing.canLand} onPort={editing.onPort} onNode={editing.onNode} onSlot={editing.onSlot} />
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
