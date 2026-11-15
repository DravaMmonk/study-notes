import { useRef, useState } from 'react'
import { tr } from '../shell/i18n.js'
import { useElementSize } from '../views/useElementSize.js'
import { usePointerSession } from '../views/usePointerSession.js'
import { boardGeometry, linkKey, wireCurve } from './arrangement.js'

export default function ArrangementBoard({ board, label, describe, active, picked, wire, pending, onLevel, onPick, onWire, onConnect, onCancel }) {
  const scroller = useRef(null)
  const canvas = useRef(null)
  const width = useElementSize(scroller)?.width ?? 520
  const { track } = usePointerSession()
  const [drag, setDrag] = useState(null)
  const [positions, setPositions] = useState(new Map())
  const [moving, setMoving] = useState(null)
  const skipClick = useRef(false)
  const preview = moving ? new Map(positions).set(moving.id, moving) : positions
  const { cards, ports, width: boardWidth, height } = boardGeometry(board.rows, width, preview)
  const moveCard = (event, id, x, y) => {
    if (event.button !== 0) return
    skipClick.current = false
    const { clientX, clientY } = event
    const initialScroll = scroller.current.scrollTop
    let position
    track(event, {
      escape: true,
      capture: true,
      move(move) {
        const dx = move.clientX - clientX
        const dy = move.clientY - clientY
        if (!position && Math.hypot(dx, dy) < 5) return
        position = { id, x: x + dx, y: y + dy + scroller.current.scrollTop - initialScroll }
        skipClick.current = true
        setMoving(position)
      },
      finish(commit) {
        setMoving(null)
        if (commit && position) setPositions((old) => new Map(old).set(id, position))
      },
    })
  }
  const start = (event, id) => {
    if (pending || event.pointerType !== 'mouse' || event.button !== 0) return
    skipClick.current = false
    const { clientX, clientY } = event
    let travelled = false
    const point = (move) => {
      const rect = canvas.current.getBoundingClientRect()
      return { x: move.clientX - rect.left, y: move.clientY - rect.top }
    }
    track(event, {
      escape: true,
      move(move) {
        travelled ||= Math.hypot(move.clientX - clientX, move.clientY - clientY) >= 5
        if (travelled) { skipClick.current = true; setDrag({ from: id, to: point(move) }) }
      },
      finish(commit, release) {
        setDrag(null)
        if (!commit || !travelled) return
        const to = document.elementFromPoint(release.clientX, release.clientY)?.closest('[data-course-input]')?.dataset.courseInput
        if (to !== undefined) onConnect(id, to)
        else onPick(id)
      },
    })
  }
  const click = (event, action) => {
    if (!event.detail || !skipClick.current) action()
    skipClick.current = false
  }
  return (
    <div ref={scroller} className="course-board" aria-label={tr('关卡接线板', 'Course wiring board')}
      onKeyDown={(event) => { if (event.key === 'Escape') onCancel() }}>
      <div className="course-board-canvas" ref={canvas} style={{ width: boardWidth, height }}>
        <svg className="course-board-wires" width={boardWidth} height={height}>
          <defs><marker id="course-wire-arrow" viewBox="0 0 8 8" refX={8} refY={4} markerWidth={4} markerHeight={4} orient="auto">
            <path d="M0 0L8 4L0 8Z" />
          </marker></defs>
          {board.edges.map((edge) => {
            const key = linkKey(edge)
            const name = `${describe(edge.from)} → ${describe(edge.to)}`
            const d = wireCurve(ports.get(edge.from).output, ports.get(edge.to).input)
            return (
              <g key={key} className={wire === key ? 'is-picked' : active === edge.from || active === edge.to ? 'is-near' : ''}>
                <path className="course-wire-line" d={d} markerEnd="url(#course-wire-arrow)" />
                <path className="course-wire-hit" d={d} role="button" tabIndex={0} aria-label={name}
                  onClick={() => onWire(edge)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onWire(edge) } }}>
                  <title>{name}</title>
                </path>
              </g>
            )
          })}
          {drag && ports.has(drag.from) && <path className="course-wire-line is-draft" d={wireCurve(ports.get(drag.from).output, drag.to)} />}
        </svg>
        {cards.map(({ id, portal, x, y, width, height }) => (
          <div key={id} className={`course-card ${portal ? 'is-portal' : ''} ${moving?.id === id ? 'is-moving' : ''}`}
            style={{ left: x, top: y, width, height }}>
            {portal && <div className="course-card-head">{tr('外部关卡', 'External level')}</div>}
            <button type="button" className={`course-card-label ${active === id ? 'is-current' : ''}`}
              onPointerDown={(event) => moveCard(event, id, x, y)} onClick={(event) => click(event, () => onLevel(id))} title={describe(id)} aria-current={active === id ? 'true' : undefined}>
              {label(id)}
            </button>
            <button type="button" className={`course-port is-input ${(picked || drag) && (drag?.from ?? picked) !== id ? 'is-ready' : ''}`}
              data-course-input={id} aria-label={`${tr('输入', 'Input')} ${id}`} title={tr('前置输入', 'Prerequisite input')} disabled={pending}
              onClick={() => { if (picked) onConnect(picked, id); else onLevel(id) }} />
            <button type="button" className={`course-port is-output ${id === picked || id === drag?.from ? 'is-picked' : ''}`}
              aria-label={`${tr('输出', 'Output')} ${id}`} aria-pressed={id === picked} title={tr('后续输出', 'Successor output')}
              disabled={pending} onPointerDown={(event) => start(event, id)} onClick={(event) => click(event, () => onPick(id))} />
          </div>
        ))}
      </div>
    </div>
  )
}
