// A grid value (games/DESIGN.md 6.9, the shape `grid`): { w, h, c, data }, c channels a cell (1 grey, 3 R, G, B),
// row by row, a cell's channels side by side — the value of channel ch at (x, y) is data[(y * w + x) * c + ch]. A
// matrix, an image and a row of numbers are all grids; drawing one maps [0, 1] onto black to white.
import { numberText } from './number.js'

export const isGrid = (v) => v !== null && typeof v === 'object' && Number.isInteger(v.w) && Number.isInteger(v.h) && Array.isArray(v.data)

/** The value at (x, y): a number for one channel, [R, G, B] for three. */
export function pixel(grid, x, y) {
  const c = grid.c ?? 1
  const at = (y * grid.w + x) * c
  return c === 1 ? grid.data[at] : grid.data.slice(at, at + c)
}

/** A value as it is drawn: clipped to [0, 1]; the value itself stays as it is. */
export const display = (v) => Math.min(1, Math.max(0, v))

/** A cell's number as a grid writes it in the cell: up to two decimals (./number.js). */
export const cellNumber = (v) => numberText(v, 2)
