const overlays = new Map()

/** The visible overlay with the highest layer, using paint order for ties. */
export function topOverlay() {
  let top = null
  let highest = -Infinity
  for (const [node, { layer }] of overlays) {
    if (!node.getClientRects().length) continue
    const style = getComputedStyle(node)
    if (style.visibility === 'hidden') continue
    const z = Number.parseInt(layer === node ? style.zIndex : getComputedStyle(layer).zIndex, 10) || 0
    if (z > highest || (z === highest && (top.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING))) {
      top = node
      highest = z
    }
  }
  return top
}

function route(event) {
  if (event.defaultPrevented || event.isComposing) return
  const keys = overlays.get(topOverlay())?.keys()
  if (!keys) return
  if (event.key !== 'Escape' && !keys.onKey?.(event)) return
  event.preventDefault()
  event.stopImmediatePropagation()
  if (event.key === 'Escape' && !event.repeat) keys.onClose?.()
}

/** Register an overlay with the layer of its own element or of the container that positions it. */
export function registerOverlay(node, keys, layer = node) {
  if (!overlays.size) window.addEventListener('keydown', route)
  overlays.set(node, { keys, layer })
  return () => {
    overlays.delete(node)
    if (!overlays.size) window.removeEventListener('keydown', route)
  }
}
