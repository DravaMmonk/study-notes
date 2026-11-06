// The sizes a grid is drawn at (GridView, GridInspector): cells keep one width whatever their numbers, a longer number
// written smaller, never in a wider cell.

export const AXIS = 18
/** A numbered cell: wide enough for three channels in a colour grid. */
export const inspectorCell = (grid) => ((grid.c ?? 1) === 3 ? 56 : 36)
/** A narrower numbered cell, for a desktop results row read by pointer rather than touch. */
export const denseCell = (grid) => ((grid.c ?? 1) === 3 ? 46 : 28)
/** A cell number's font size: 10 px, smaller when its text would not fit the cell. */
export const numberSize = (text, cell) => Math.min(10, (cell - 4) / (String(text).length * 0.62))
/** A picture's cell: about 96 px for the whole grid, between 3 and 14 px a cell. */
export const thumbCell = (grid) => Math.max(3, Math.min(14, Math.floor(96 / Math.max(grid.w, grid.h))))

// A frame never narrower than its caption needs.
const MIN_FRAME_W = 88

/**
 * The frame a grid needs, at most `max` ({ w, h } px, border included): numbered, its cells and axes; as a picture, a
 * thumbnail just large enough to tell its cells apart; a small grid's frame shrinks to it.
 */
export function fitFrame(grid, numbers, max, cellOf = inspectorCell) {
  const inner = { w: max.w - 2, h: max.h - 2 }
  const cell = numbers ? cellOf(grid) : Math.min(thumbCell(grid), inner.w / grid.w, inner.h / grid.h)
  const off = numbers ? AXIS : 0
  return { w: Math.min(max.w, Math.max(MIN_FRAME_W, Math.ceil(off + grid.w * cell) + 2)), h: Math.min(max.h, Math.ceil(off + grid.h * cell) + 2) }
}
