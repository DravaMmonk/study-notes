import { useState } from 'react'
import { X } from 'lucide-react'
import { tr } from './i18n.js'
import { EntriesSize, SHEET } from './Entries.jsx'
import { useOverlay } from './useOverlay.js'
import { usePointerSession } from '../views/usePointerSession.js'
import './sheet.css'

// A centered dialog on desktop and a draggable bottom sheet on phones.
// What it holds knows it is in a sheet (Entries.jsx: longer lists).
export default function Sheet({ title, onClose, children, footer, actions }) {
  const [drag, setDrag] = useState(0)
  const { track } = usePointerSession()
  const overlay = useOverlay(onClose)
  const swipe = (event) => {
    if (event.button !== 0 || !event.isPrimary) return
    const start = event.clientY
    track(event, {
      capture: true,
      escape: true,
      move: (next) => setDrag(Math.max(0, next.clientY - start)),
      finish(commit, release) {
        setDrag(0)
        if (commit && release.clientY - start > 90) onClose()
      },
    })
  }

  return (
    <div ref={overlay} className="ph-scrim" onClick={onClose}>
      <div className="ph-sheet" role="dialog" aria-modal="true" aria-label={title} style={{ transform: drag ? `translateY(${drag}px)` : undefined }} onClick={(event) => event.stopPropagation()}>
        <div className="ph-handle" onPointerDown={swipe}>
          <i />
        </div>
        <header className="ph-sheet-head">
          <h2>{title}</h2>
          {actions && <div className="ph-sheet-actions">{actions}</div>}
          <button className="ph-icon" onClick={onClose} aria-label={tr('关闭')}><X size={18} /></button>
        </header>
        <div className="ph-sheet-body"><EntriesSize.Provider value={SHEET}>{children}</EntriesSize.Provider></div>
        {footer && <div className="ph-sheet-foot">{footer}</div>}
      </div>
    </div>
  )
}
