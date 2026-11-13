import { cardView } from '../engine/views.js'

import { MIN_SLOT, PORT_TARGET, SLOT_GUTTER, TILE_HEIGHT } from './slot-metrics.js'

const portCount = (parts, node) => Math.max(parts.inputs?.(node)?.length ?? 0, parts.outputs?.(node)?.length ?? 1)

/** Read the width of a piece from its value view and the faces that have to fit around it. */
export function cardWidth(parts, node, available = Infinity) {
  const ports = portCount(parts, node)
  const view = cardView(parts.valueView?.(node))
  const minimum = Math.max(view.cardWidth, 108 + 18 * ports, parts.hasSettings?.(node) ? 156 : 0, parts.packed?.(node) ? 176 : 0, parts.frames?.(node)?.length ? 240 : 0)
  return Math.min(available, minimum)
}

export const cardHeight = (parts, node) => cardView(parts.valueView?.(node)).tileHeight ?? TILE_HEIGHT

const mostCommon = (sizes, defaultSize) => {
  const counts = new Map()
  for (const size of sizes) counts.set(size, (counts.get(size) ?? 0) + 1)
  return [...counts].sort(([a, countA], [b, countB]) => countB - countA || a - b)[0]?.[0] ?? defaultSize
}

/** The nominal dimensions of one slot come from the fixed tray. */
export function traySize(types, parts, defaults = () => ({})) {
  const pieces = types.map((type) => ({ type, params: defaults(type) }))
  return {
    width: mostCommon(pieces.map((node) => cardWidth(parts, node)), cardView().cardWidth),
    height: mostCommon(pieces.map((node) => cardHeight(parts, node)), TILE_HEIGHT),
  }
}

/** Fit as many slots of the tray's nominal width as the board has room for. */
export function slotColumns(available, size) {
  if (!Number.isFinite(available) || !size) return 2
  const width = Math.max(MIN_SLOT, size.width)
  return [4, 3, 2].find((count) => count * width + (count - 1) * SLOT_GUTTER <= available) ?? 2
}

export const slotWidth = (available, columns) => Math.max(MIN_SLOT, (available - (columns - 1) * SLOT_GUTTER) / columns)

/** Use the declared card width to choose a span, with room for every port at the actual width. */
export function cardColumns(parts, node, available, columns) {
  const slot = slotWidth(available, columns)
  // A tray's ordinary card still fills one slot when the two-column minimum compresses the grid.
  const preferred = Math.max(slot, parts.traySize?.width ?? 0)
  const span = Math.max(
    (cardWidth(parts, node) + SLOT_GUTTER) / (preferred + SLOT_GUTTER),
    (portCount(parts, node) * PORT_TARGET + SLOT_GUTTER) / (slot + SLOT_GUTTER),
  )
  return Math.min(columns, Math.max(1, Math.ceil(span)))
}
