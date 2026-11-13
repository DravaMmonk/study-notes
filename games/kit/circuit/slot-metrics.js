// CSS-pixel geometry shared by slot placement and the touch board.
export const PORT_TARGET = 44
const PORT_DOT = 20
const PORT_LABEL = 12
export const SLOT_GUTTER = 12
export const TILE_PADDING = 8
export const TILE_HEIGHT = 72
export const MIN_SLOT = PORT_TARGET + 2 * TILE_PADDING

export const slotMetrics = {
  '--pb-tile-height': `${TILE_HEIGHT}px`,
  '--pb-target': `${PORT_TARGET}px`,
  '--pb-dot': `${PORT_DOT}px`,
  '--pb-port-label': `${PORT_LABEL}px`,
  '--pb-column-gap': `${SLOT_GUTTER}px`,
  '--pb-min-slot': `${MIN_SLOT}px`,
  '--pb-tile-padding': `${TILE_PADDING}px`,
}
