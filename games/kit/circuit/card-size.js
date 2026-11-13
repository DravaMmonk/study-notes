import { cardView } from '../engine/views.js'

import { PORT_TARGET, SLOT_GUTTER, TILE_PADDING } from './slot-metrics.js'

/** Read the width of a piece from its value view and the faces that have to fit around it. */
export function cardWidth(parts, node, available = Infinity) {
  const ports = Math.max(parts.inputs(node).length, parts.outputs?.(node)?.length ?? 1)
  const view = cardView(parts.valueView?.(node))
  const minimum = Math.max(view.cardWidth, 108 + 18 * ports, parts.hasSettings?.(node) ? 156 : 0, parts.packed?.(node) ? 176 : 0, parts.frames?.(node)?.length ? 240 : 0)
  return Math.min(available, minimum)
}

/** Span a row only when half the row cannot hold its ports or at least half its sentence. */
export function cardColumns(parts, node, available, columns) {
  if (parts.frames?.(node)?.length) return columns
  const half = (available - SLOT_GUTTER) / columns
  const ports = Math.max(parts.inputs?.(node)?.length ?? 0, parts.outputs?.(node)?.length ?? 1)
  const sentence = parts.sentenceWidths?.[node.id] ?? 0
  return ports * PORT_TARGET > half || sentence > 4 * (half - TILE_PADDING * 2) ? columns : 1
}
