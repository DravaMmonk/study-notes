// A list reordered by hand (games/DESIGN.md 6.1): an item dragged with the pointer before or after another, or moved
// one place with Alt+↑/↓ where it has the focus. `onMove(id, to)` gets { before } or { after } another item's id; what
// that writes is the caller's (tag-order.js).
import { useState } from 'react'

/** `ids`: the list in its order; `disabled`: nothing moves. Returns the props of an item and whether one is moving. */
export function useDragOrder({ ids, onMove, disabled = false }) {
  const [moving, setMoving] = useState(null)
  const [over, setOver] = useState(null) // { id, side: 'before' | 'after' }
  const end = () => { setMoving(null); setOver(null) }
  const sideOf = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    return event.clientY < box.top + box.height / 2 ? 'before' : 'after'
  }
  const item = (id) => (disabled ? {} : {
    draggable: true,
    'data-order-drop': over?.id === id && moving && moving !== id ? over.side : undefined,
    'data-dragging': moving === id ? '' : undefined,
    onDragStart: (event) => {
      event.stopPropagation()
      event.dataTransfer.setData('text/plain', id)
      event.dataTransfer.effectAllowed = 'move'
      // After the drag has started: changing the page inside dragstart makes the browser drop the drag.
      window.setTimeout(() => setMoving(id))
    },
    onDragEnd: end,
    onDragOver: (event) => {
      if (!moving || moving === id) return
      event.preventDefault()
      event.stopPropagation()
      const side = sideOf(event)
      if (over?.id !== id || over.side !== side) setOver({ id, side })
    },
    onDragLeave: () => setOver(null),
    onDrop: (event) => {
      if (!moving || moving === id) return
      event.preventDefault()
      event.stopPropagation()
      const side = sideOf(event)
      const from = moving
      end()
      onMove(from, { [side]: id })
    },
    onKeyDown: (event) => {
      if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
      event.preventDefault()
      event.stopPropagation()
      const k = ids.indexOf(id)
      if (event.key === 'ArrowUp' && k > 0) onMove(id, { before: ids[k - 1] })
      if (event.key === 'ArrowDown' && k >= 0 && k < ids.length - 1) onMove(id, { after: ids[k + 1] })
    },
  })
  return { item, moving }
}
