import { useRef } from 'react'
import { CanvasEditor, Notice, Palette, SlotBoard, Tray, placement, useSlotEditing } from '../../../kit/circuit/index.js'
import { L, tr } from '../../../kit/shell/i18n.js'
import { signal } from '../util.js'
import { def } from './components.js'

// 状态之图's circuit board on the shared circuit editor (../../../kit/circuit), the one Vision Complete uses: the same
// cards, dots, wires, keys and gestures. `board` is the circuit mode's bridge (modes/circuit.js `ctl.board`); what a
// card shows here is the value its output carries at the robot's cell, and a constant's or a merger's setting.

const valueOf = (probe, id) => (probe && id in probe ? signal(probe[id]) : '')
const stop = (event) => event.stopPropagation()

/** Desktop: the board on the workbench's stage. */
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
        emptyNote={{ zh: '在机器人的视野里点亮格子，它们会变成左边的输入；再从左边选元件放上来，从卡片右侧的圆点拖线连接。', en: "Light cells in the robot's view and they become inputs on the left; then pick components on the left and drag wires from the dot on the right of a card." }}
      />
    </div>
  )
}

/** Desktop: the brief's parts list. Clicking a part puts it in the first free spot. */
export function SgPalette({ board }) {
  const add = (kind) => {
    const graph = board.graph()
    const at = placement(graph, board.parts()).free[0]
    board.change(board.create(graph, kind, at).graph)
  }
  return (
    <section>
      <h3 className="panel-label">{tr('元件', 'Components')}</h3>
      <Palette items={board.palette().map((p) => ({ ...p, desc: p.desc, style: { '--fam': 'var(--accent)' } }))} onAdd={add} />
      <p className="panel-note">{tr('从卡片右侧的圆点拖线到下一张卡片。选中卡片或连线后按 Delete 删除；按住 ⌘/Ctrl 滚动可缩放。', 'Drag a wire from the dot on the right of a card to the next card. Select a card or wire and press Delete to remove it; hold ⌘/Ctrl and scroll to zoom.')}</p>
    </section>
  )
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
        <Tray items={board.palette().map((p) => ({ ...p, family: 'sg' }))} onPick={editing.placeFirstFree} />
        {dock}
      </div>
      <Notice editing={editing} />
    </>
  )
}
