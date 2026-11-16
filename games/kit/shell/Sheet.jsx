import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { tr } from './i18n.js'
import { EntriesSize, SHEET } from './Entries.jsx'
import { useOverlay } from './useOverlay.js'
import { PHONE, useMedia } from './useMedia.js'
import { isTextField, playFrame } from './viewport.js'
import { usePointerSession } from '../views/usePointerSession.js'
import './sheet.css'

export const SheetHost = createContext(null)
const SheetLayer = createContext(49)

/** Anchor mobile overlays beside their play surface so their forms share its keyboard geometry. */
export function SheetOverlay({ onClose, className = '', layer = 50, children }) {
  const phone = useMedia(PHONE)
  const host = useContext(SheetHost)
  const above = useContext(SheetLayer)
  const order = Math.max(layer, above + 1)
  const overlay = (
    <SheetLayer.Provider value={order}>
      <Overlay onClose={onClose} className={className} phone={phone} inPlay={Boolean(host)} layer={order}>{children}</Overlay>
    </SheetLayer.Provider>
  )
  return phone ? createPortal(overlay, host ?? document.body) : overlay
}

function Overlay({ onClose, className, phone, inPlay, layer, children }) {
  const overlay = useOverlay(onClose)

  useLayoutEffect(() => {
    if (!phone) return undefined
    const root = overlay.current
    const reveal = () => {
      const field = document.activeElement
      if (!root.contains(field) || !isTextField(field)) return
      const panel = field.closest('[data-sheet-scroll]')
      if (!panel || !root.contains(panel)) return
      // Scroll only the sheet's content. scrollIntoView can also pan the Safari viewport.
      const bounds = panel.getBoundingClientRect()
      const box = field.getBoundingClientRect()
      if (box.top < bounds.top || box.height > bounds.height) panel.scrollTop += box.top - bounds.top
      else if (box.bottom > bounds.bottom) panel.scrollTop += box.bottom - bounds.bottom
    }
    const viewport = inPlay ? null : window.visualViewport
    const resize = () => {
      const layout = Math.max(window.innerHeight, document.documentElement.clientHeight)
      const frame = playFrame(viewport, layout, isTextField(document.activeElement))
      root.style.setProperty('--sheet-top', frame ? `${frame.top}px` : '')
      root.style.setProperty('--sheet-height', frame ? `${frame.height}px` : '')
    }
    if (viewport) {
      resize()
      viewport.addEventListener('resize', resize)
      viewport.addEventListener('scroll', resize)
      document.addEventListener('focusin', resize)
      document.addEventListener('focusout', resize)
    }
    const observer = new ResizeObserver(reveal)
    observer.observe(root)
    for (const panel of root.querySelectorAll('[data-sheet-scroll]')) observer.observe(panel)
    root.addEventListener('focusin', reveal)
    return () => {
      if (viewport) {
        viewport.removeEventListener('resize', resize)
        viewport.removeEventListener('scroll', resize)
        document.removeEventListener('focusin', resize)
        document.removeEventListener('focusout', resize)
      }
      observer.disconnect()
      root.removeEventListener('focusin', reveal)
    }
  }, [inPlay, overlay, phone])

  const mode = phone ? (inPlay ? ' is-play-sheet' : ' is-phone-sheet') : ''
  return <div ref={overlay} className={`ph-scrim${mode}${className ? ` ${className}` : ''}`} style={phone ? { zIndex: layer } : undefined} onClick={onClose}>{children}</div>
}

// A centered dialog on desktop and a draggable bottom sheet on phones.
// What it holds knows it is in a sheet (Entries.jsx: longer lists).
export default function Sheet({ title, onClose, children, footer, actions, className = '', initialFocus }) {
  const [drag, setDrag] = useState(0)
  const { track } = usePointerSession()
  const phone = useMedia(PHONE)
  const sheet = useRef(null)
  useLayoutEffect(() => {
    if (!phone && initialFocus) sheet.current?.querySelector(initialFocus)?.focus({ preventScroll: true })
  }, [initialFocus, phone])
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
    <SheetOverlay onClose={onClose}>
      <div ref={sheet} className={`ph-sheet ${className}`} role="dialog" aria-modal="true" aria-label={title} style={{ transform: drag ? `translateY(${drag}px)` : undefined }} onClick={(event) => event.stopPropagation()}>
        <div className="ph-handle" onPointerDown={swipe}>
          <i />
        </div>
        <header className="ph-sheet-head">
          <h2>{title}</h2>
          {actions && <div className="ph-sheet-actions">{actions}</div>}
          <button className="ph-icon" onClick={onClose} aria-label={tr('关闭')}><X size={18} /></button>
        </header>
        <div className="ph-sheet-body" data-sheet-scroll><EntriesSize.Provider value={SHEET}>{children}</EntriesSize.Provider></div>
        {footer && <div className="ph-sheet-foot">{footer}</div>}
      </div>
    </SheetOverlay>
  )
}
