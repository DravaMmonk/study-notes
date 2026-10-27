import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { tr } from './i18n.js'
import { InSheet } from './Entries.jsx'

// A bottom sheet: slides up over a dimmed page, closes on the backdrop, on Escape, on the close
// button, or by dragging its handle down. What it holds knows it is in a sheet (Entries.jsx: longer lists).
export default function Sheet({ title, onClose, children, footer }) {
  const [drag, setDrag] = useState(0)
  const start = useRef(null)

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="ph-scrim" onClick={onClose}>
      <div className="ph-sheet" role="dialog" aria-modal="true" aria-label={title} style={{ transform: drag ? `translateY(${drag}px)` : undefined }} onClick={(event) => event.stopPropagation()}>
        <div
          className="ph-handle"
          onPointerDown={(event) => {
            start.current = event.clientY
            try {
              event.currentTarget.setPointerCapture(event.pointerId)
            } catch {
              // A pointer that is already gone cannot be captured; the gesture still works.
            }
          }}
          onPointerMove={(event) => start.current !== null && setDrag(Math.max(0, event.clientY - start.current))}
          onPointerUp={() => {
            if (drag > 90) onClose()
            start.current = null
            setDrag(0)
          }}
          onPointerCancel={() => {
            start.current = null
            setDrag(0)
          }}
        >
          <i />
        </div>
        <header className="ph-sheet-head">
          <h2>{title}</h2>
          <button className="ph-icon" onClick={onClose} aria-label={tr('关闭', 'Close')}><X size={18} /></button>
        </header>
        <div className="ph-sheet-body"><InSheet.Provider value>{children}</InSheet.Provider></div>
        {footer && <div className="ph-sheet-foot">{footer}</div>}
      </div>
    </div>
  )
}
