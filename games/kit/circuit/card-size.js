import { cardView } from '../engine/views.js'

// A slot grid uses the large gutter. A region loses its frame and region padding on both sides.
const SLOT_GUTTER = 16
export const REGION_INSET = 20

/** Read the width of a piece from its value view and the faces that have to fit around it. */
export function cardWidth(parts, node, available = Infinity) {
  const ports = Math.max(parts.inputs(node).length, parts.outputs?.(node)?.length ?? 1)
  const view = cardView(parts.valueView?.(node))
  const minimum = Math.max(view.cardWidth, 108 + 18 * ports, parts.hasSettings?.(node) ? 156 : 0, parts.packed?.(node) ? 176 : 0, parts.frames?.(node)?.length ? 240 : 0)
  return Math.min(available, minimum)
}

/** How many columns a card needs in a slot grid. The gutter is part of the width between columns. */
export function cardColumns(parts, node, available, columns) {
  if (parts.frames?.(node)?.length) return columns
  const view = cardView(parts.valueView?.(node))
  if (!view?.tileWidth) return 1
  return view.tileWidth > (available - SLOT_GUTTER) / columns ? columns : 1
}
