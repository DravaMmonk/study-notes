// The sizes a grid is drawn at (GridView, GridInspector): cells keep one width whatever their numbers, a longer number
// written smaller, never in a wider cell.

export const AXIS = 18
/** A numbered cell: wide enough for three channels in a colour grid. */
export const inspectorCell = (grid) => ((grid.c ?? 1) === 3 ? 56 : 36)
/** A narrower numbered cell, for a desktop results row read by pointer rather than touch. */
export const denseCell = (grid) => ((grid.c ?? 1) === 3 ? 46 : 28)
/** A cell number's font size: 10 px, smaller when its text would not fit the cell. */
export const numberSize = (text, cell) => Math.min(10, (cell - 4) / (String(text).length * 0.62))
// A frame never narrower than its caption needs.
const MIN_FRAME_W = 88

/** Fit the numbered cells and axes within the available scroll frame. */
export function fitFrame(grid, max, cellOf = inspectorCell) {
  const cell = cellOf(grid)
  return { w: Math.min(max.w, Math.max(MIN_FRAME_W, AXIS + grid.w * cell + 2)), h: Math.min(max.h, AXIS + grid.h * cell + 2) }
}
