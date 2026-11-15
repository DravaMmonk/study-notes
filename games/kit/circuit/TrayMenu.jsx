import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { L } from '../shell/i18n.js'

export const trayItemCount = (entries) => entries.reduce((total, entry) => total + (entry.children?.length ?? 1), 0)

export default function TrayMenu({ entry, className, renderPiece }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`tray-menu ${open ? 'is-open' : ''}`}>
      <button type="button" className={`${className} tray-menu-toggle`} aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{L(entry.label)}</span>
        <ChevronRight size={14} aria-hidden="true" />
      </button>
      {open && <div className="tray-menu-items">{entry.children.map(renderPiece)}</div>}
    </div>
  )
}
