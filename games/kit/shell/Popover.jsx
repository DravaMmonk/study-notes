import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Sheet from './Sheet.jsx'
import { PHONE, useMedia } from './useMedia.js'

// Something to fill in that belongs to one button (a sentence on 《证明完毕》's rule table, a test case's goal…): on a
// desktop a box beside the button, pointing at it, like a tooltip that holds an editor; on a phone the usual bottom
// sheet (Sheet.jsx), titled. It closes on Escape, on a press anywhere outside it (the button aside), or by its owner.
//
//   anchor  the element it points at (the button pressed)      title  the sheet's      onClose()

const GAP = 10
const EDGE = 12

export default function Popover({ anchor, title, onClose, children, className = '' }) {
  const phone = useMedia(PHONE)
  if (phone) return <Sheet title={title} onClose={onClose}>{children}</Sheet>
  return <Box className={className} anchor={anchor} label={title} onClose={onClose}>{children}</Box>
}

function Box({ anchor, label, onClose, children, className }) {
  const box = useRef(null)
  const [at, setAt] = useState(null) // { left, top, below, arrow, room }
  // Under the button when it fits there, else over it; never past the window's edges. It follows the button as the
  // page scrolls or what it holds grows.
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.getBoundingClientRect()
      const el = box.current
      const w = el.offsetWidth
      const h = el.scrollHeight
      const under = window.innerHeight - a.bottom - GAP - EDGE
      const over = a.top - GAP - EDGE
      const below = h <= under || under >= over
      const room = Math.max(160, below ? under : over)
      const shown = Math.min(h, room)
      const left = Math.min(Math.max(EDGE, a.left + a.width / 2 - w / 2), window.innerWidth - w - EDGE)
      setAt({ left, top: below ? a.bottom + GAP : a.top - GAP - shown, below, arrow: Math.min(Math.max(16, a.left + a.width / 2 - left), w - 16), room })
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(box.current)
    observer.observe(anchor)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchor])
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    const onDown = (event) => !box.current?.contains(event.target) && !anchor.contains(event.target) && onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown, true)
    }
  }, [anchor, onClose])
  // Inside the level, so its colours and words carry over; fixed to the window, so no board's zoom or scroll moves it.
  return createPortal(
    <div
      ref={box}
      className={`kit-pop ${className} ${at && !at.below ? 'is-above' : ''}`}
      role="dialog"
      aria-label={label}
      style={at ? { left: at.left, top: at.top, maxHeight: at.room, '--arrow': `${at.arrow}px` } : { visibility: 'hidden' }}
    >
      <div className="kit-pop-body">{children}</div>
    </div>,
    anchor.closest('.level, .level-phone') ?? document.body,
  )
}
