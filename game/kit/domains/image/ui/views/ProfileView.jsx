import { useRef } from 'react'
import ImageView from '../ImageView.jsx'
import CurveView from './CurveView.jsx'
import { rowOf } from './views.js'

// A 2-D value with one row picked out: the picture with a scan line, and under it that row's
// brightness as a curve. Drag on the picture to move the line; every card that shows a profile
// follows the same row, so the row can be traced through the whole circuit.
export default function ProfileView({ img, range, size = 112, theme, scan = 0.5, onScan, onHover, compact }) {
  const dragging = useRef(false)
  const row = Math.min(img.h - 1, Math.max(0, Math.round(scan * (img.h - 1))))

  const pick = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const y = Math.floor(((event.clientY - box.top) / box.height) * img.h)
    if (onScan && y >= 0 && y < img.h) onScan(img.h > 1 ? y / (img.h - 1) : 0.5)
  }
  return (
    <div className="profile-view" style={{ width: size }}>
      <div
        className={`profile-picture ${onScan ? 'is-draggable' : ''}`}
        onPointerDown={(event) => {
          if (!onScan) return
          event.stopPropagation()
          dragging.current = true
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            // Synthetic pointers cannot be captured; picking a row still works.
          }
          pick(event)
        }}
        onPointerMove={(event) => dragging.current && pick(event)}
        onPointerUp={() => {
          dragging.current = false
        }}
        onPointerCancel={() => {
          dragging.current = false
        }}
      >
        <ImageView img={img} range={range} size={size} theme={theme} onHover={onHover} />
        <span className="profile-line" style={{ top: `${((row + 0.5) / img.h) * 100}%` }} aria-hidden="true" />
        <span className="profile-tag" style={{ top: `${((row + 0.5) / img.h) * 100}%` }}>y = {row}</span>
      </div>
      {!compact && <CurveView img={rowOf(img, row)} range={range} width={size} height={Math.round(size * 0.5)} />}
    </div>
  )
}
