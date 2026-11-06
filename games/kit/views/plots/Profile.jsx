import { useRef, useState } from 'react'
import { GridPicture } from '../grid/GridView.jsx'
import Plot from './Plot.jsx'
import { rowOf } from './range.js'

// A grey grid with one row picked out (the view `profile`, games/DESIGN.md 6.10): the picture with a scan line across
// it, and under it that row as a function (Plot), the row wanted on the same axes where there is one. Dragging on the
// picture moves the line. `card` draws the picture and its line only.

const pickRow = (grid, y) => ({ w: grid.w, h: 1, c: 1, data: rowOf(grid, y) })

export default function Profile({ value, want, tolerance = 0, card = false }) {
  const shown = value ?? want
  const [row, setRow] = useState(Math.floor((shown.h - 1) / 2))
  const y = Math.min(shown.h - 1, row)
  const dragging = useRef(false)
  const scale = Math.max(2, Math.floor((card ? 96 : 220) / Math.max(shown.w, shown.h)))
  const pick = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const at = Math.floor(((event.clientY - box.top) / box.height) * shown.h)
    if (at >= 0 && at < shown.h) setRow(at)
  }
  const drag = card ? {} : {
    onPointerDown: (event) => {
      event.stopPropagation()
      dragging.current = true
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* a synthetic pointer: picking still works */ }
      pick(event)
    },
    onPointerMove: (event) => dragging.current && pick(event),
    onPointerUp: () => { dragging.current = false },
    onPointerCancel: () => { dragging.current = false },
  }
  return (
    <div className={`pf ${card ? 'is-card' : ''}`}>
      <div className={`pf-picture ${card ? '' : 'is-draggable'}`} {...drag}>
        <GridPicture value={shown} scale={scale} />
        <span className="pf-line" style={{ top: `${((y + 0.5) / shown.h) * 100}%` }} aria-hidden="true" />
        {!card && <span className="pf-tag" style={{ top: `${((y + 0.5) / shown.h) * 100}%` }}>y = {y}</span>}
      </div>
      {!card && <Plot value={value && pickRow(value, y)} want={want && pickRow(want, y)} tolerance={tolerance} />}
    </div>
  )
}
