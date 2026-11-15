import { useContext, useRef, useState } from 'react'
import { ViewScope } from '../choice.js'
import { GridPicture } from '../grid/GridView.jsx'
import { pointerCell, useInspection } from '../useInspection.js'
import { usePointerSession } from '../usePointerSession.js'
import Plot from './Plot.jsx'
import { rowOf } from './range.js'

// A grey grid with one row picked out (the view `profile`, games/DESIGN.md 6.9): the picture with a scan line across
// it, and under it that row as a function (Plot), each sample under its column, the row wanted on the same axes where
// there is one. Dragging on the picture moves the line. `card` draws the picture and its line only.

const pickRow = (grid, y) => ({ w: grid.w, h: 1, c: 1, data: rowOf(grid, y) })

export default function Profile({ value, want, tolerance = 0, card = false, size = 220, inspection }) {
  const shown = value ?? want
  const root = useRef(null)
  const probe = useInspection(root, shown, inspection, 'profile')
  const local = useState(0.5)
  const [scan, setScan] = useContext(ViewScope).profileScan ?? local
  const y = Math.min(shown.h - 1, Math.floor(scan * shown.h))
  const { track } = usePointerSession()
  const scale = size / Math.max(shown.w, shown.h)
  const drag = (event) => {
    if (event.button !== 0 || !event.isPrimary) return
    event.stopPropagation()
    const picture = event.currentTarget
    const pick = (pointer, toggle) => {
      const cell = pointerCell(shown, picture.getBoundingClientRect(), pointer)
      if (!cell) return
      const nextScan = (cell.y + 0.5) / shown.h
      setScan(nextScan)
      if (inspection) probe.select(cell.x, cell.y, true, { toggle, scan: nextScan })
    }
    pick(event, true)
    track(event, { move: (pointer) => pick(pointer, false), escape: true })
  }
  const plotProbe = inspection && {
    active: probe.active ? { x: probe.active.x, y: 0 } : null,
    select: (col, _row, pinned) => probe.select(col, y, pinned, { scan }),
    leave: probe.leave,
  }
  return (
    <div ref={root} className={`pf ${card ? 'is-card' : ''}`}>
      <div className={`pf-picture ${card ? '' : 'is-draggable'}`} onPointerDown={card ? undefined : drag}
        onPointerMove={!card && inspection ? (event) => {
          if (event.pointerType !== 'mouse' || event.buttons) return
          const cell = pointerCell(shown, event.currentTarget.getBoundingClientRect(), event)
          if (cell) probe.select(cell.x, y, false, { scan })
        } : undefined}
        onPointerLeave={inspection ? probe.leave : undefined}>
        <GridPicture value={shown} scale={scale} />
        <span className="pf-line" style={{ top: `${((y + 0.5) / shown.h) * 100}%` }} aria-hidden="true" />
        {!card && !inspection && <span className="pf-tag" style={{ top: `${((y + 0.5) / shown.h) * 100}%` }}>y = {y}</span>}
      </div>
      {!card && <Plot value={value && pickRow(value, y)} want={want && pickRow(want, y)} tolerance={tolerance} probe={plotProbe} fit={{ pitch: scale, pad: 0, min: 0, max: Infinity }} />}
    </div>
  )
}
