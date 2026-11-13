// CSS-pixel geometry shared by slot placement and the touch board.
export const PORT_TARGET = 44
export const SLOT_GUTTER = 12
export const REGION_INSET = 8
export const TILE_PADDING = 8

export const slotMetrics = {
  '--pb-dot': `${PORT_TARGET}px`,
  '--pb-column-gap': `${SLOT_GUTTER}px`,
  '--pb-region-inset': `${REGION_INSET / 2}px`,
  '--pb-tile-padding': `${TILE_PADDING}px`,
}
