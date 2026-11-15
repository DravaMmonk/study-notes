import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { L } from '../shell/i18n.js'
import Popover from '../shell/Popover.jsx'
import { useOverlay } from '../shell/useOverlay.js'

export const trayItemCount = (entries) => entries.reduce((total, entry) => total + (entry.children?.length ?? 1), 0)

export default function TrayMenu({ entry, className, compact, phoneHost, renderPiece }) {
  const [anchor, setAnchor] = useState(null)
  const id = useId()
  const toggle = useRef(null)
  const phone = Boolean(phoneHost)
  const close = () => setAnchor(null)
  const panel = useOverlay(() => { close(); toggle.current?.focus() }, {
    active: phone && Boolean(anchor), onOutside: close, anchor: () => anchor,
  })
  const Chevron = phone ? ChevronUp : ChevronDown
  return (
    <div className="tray-menu">
      <button ref={toggle} type="button" className={`${className} tray-menu-toggle`} aria-expanded={Boolean(anchor)} aria-controls={anchor ? id : undefined}
        onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}>
        <span>{L(entry.label)}</span>
        <Chevron size={14} aria-hidden="true" />
      </button>
      {anchor && (phone
        ? createPortal(<div id={id} ref={panel} className="tray-menu-row" role="group" aria-label={L(entry.label)}>{entry.children.map(renderPiece)}</div>, phoneHost.current)
        : <Popover anchor={anchor} title={L(entry.label)} placement="below" className="tray-menu-pop" onClose={close}>
          <div id={id} className={`palette ${compact ? 'is-compact' : ''}`}>{entry.children.map(renderPiece)}</div>
        </Popover>)}
    </div>
  )
}
