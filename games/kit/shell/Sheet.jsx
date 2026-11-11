import { useEffect } from 'react'
import { X } from 'lucide-react'
import { tr } from './i18n.js'
import { EntriesSize, SHEET } from './Entries.jsx'
import './sheet.css'

// A sheet: a window in the middle of a dimmed page, closed on the backdrop, on Escape or on the close button.
// What it holds knows it is in a sheet (Entries.jsx: longer lists).
export default function Sheet({ title, onClose, children, footer, actions }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="ph-scrim" onClick={onClose}>
      <div className="ph-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
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
