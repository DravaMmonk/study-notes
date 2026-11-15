import { useLayoutEffect, useRef } from 'react'

const overlays = new Map()

/** The visible overlay with the highest layer, using paint order for ties. */
export function topOverlay() {
  let top = null
  let layer = -Infinity
  for (const node of overlays.keys()) {
    if (!node.getClientRects().length) continue
    const style = getComputedStyle(node)
    if (style.visibility === 'hidden') continue
    const z = Number.parseInt(style.zIndex, 10) || 0
    if (z > layer || (z === layer && (top.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING))) {
      top = node
      layer = z
    }
  }
  return top
}

function route(event) {
  if (event.defaultPrevented || event.isComposing) return
  const keys = overlays.get(topOverlay())?.current
  if (!keys) return
  if (event.key !== 'Escape' && !keys.onKey?.(event)) return
  event.preventDefault()
  event.stopImmediatePropagation()
  if (event.key === 'Escape' && !event.repeat) keys.onClose?.()
}

/** Put the returned ref on the positioned overlay so its layer also sets its keyboard order. */
export function useOverlayKeys(onClose, { active = true, onKey } = {}) {
  const root = useRef(null)
  const keys = useRef(null)
  keys.current = { onClose, onKey }
  useLayoutEffect(() => {
    const node = root.current
    if (!active || !node) return undefined
    if (!overlays.size) window.addEventListener('keydown', route)
    overlays.set(node, keys)
    return () => {
      overlays.delete(node)
      if (!overlays.size) window.removeEventListener('keydown', route)
    }
  }, [active])
  return root
}
