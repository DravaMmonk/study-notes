import { cardView } from '../engine/views.js'

import { PORT_TARGET, SLOT_GUTTER, TILE_PADDING } from './slot-metrics.js'

/** Read the width of a piece from its value view and the faces that have to fit around it. */
export function cardWidth(parts, node, available = Infinity) {
  const ports = Math.max(parts.inputs?.(node)?.length ?? 0, parts.outputs?.(node)?.length ?? 1)
  const view = cardView(parts.valueView?.(node))
  const minimum = Math.max(view.cardWidth, 108 + 18 * ports, parts.hasSettings?.(node) ? 156 : 0, parts.packed?.(node) ? 176 : 0, parts.frames?.(node)?.length ? 240 : 0)
  return Math.min(available, minimum)
}

/** Pick a supported column count from the task's held pieces and the root board width. */
export function slotColumns(parts, available, held) {
  if (!Number.isFinite(available) || !held?.length) return 2
  const minimum = PORT_TARGET + 2 * TILE_PADDING
  const narrowest = Math.min(...held.map((node) => Math.max(minimum, cardWidth(parts, node))))
  return [4, 3, 2].find((count) => count * narrowest + (count - 1) * SLOT_GUTTER <= available) ?? 2
}

/** Span enough columns for the ports and at least half the displayed sentence in two lines. */
export function cardColumns(parts, node, available, columns) {
  if (parts.frames?.(node)?.length) return columns
  const slot = (available - (columns - 1) * SLOT_GUTTER) / columns
  const ports = Math.max(parts.inputs?.(node)?.length ?? 0, parts.outputs?.(node)?.length ?? 1)
  const sentence = parts.sentenceWidths?.[node.id] ?? 0
  const preferred = columns > 2 ? cardWidth(parts, node) : 0
  const width = Math.max(preferred, ports * PORT_TARGET, sentence / 4 + TILE_PADDING * 2)
  const span = (width + SLOT_GUTTER) / (slot + SLOT_GUTTER)
  return Math.min(columns, Math.max(1, Math.ceil(span)))
}
