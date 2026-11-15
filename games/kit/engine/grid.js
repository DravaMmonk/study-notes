// A grid value (games/DESIGN.md 6.9, the shape `grid`): { w, h, c, data }, c channels a cell (1 grey, 3 R, G, B),
// row by row, a cell's channels side by side — the value of channel ch at (x, y) is data[(y * w + x) * c + ch]. A
// matrix, an image and a row of numbers are all grids; drawing one maps [0, 1] onto black to white.
import { numberError, numberText } from './number.js'

export const isGrid = (v) => v !== null && typeof v === 'object' && Number.isInteger(v.w) && Number.isInteger(v.h) && (Array.isArray(v.data) || (ArrayBuffer.isView(v.data) && !(v.data instanceof DataView)))

/** Two grids can be compared cell for cell when dimensions and channels match. */
export const sameGridShape = (a, b) => isGrid(a) && isGrid(b) && a.w === b.w && a.h === b.h && (a.c ?? 1) === (b.c ?? 1)

/** Maximum channel error at a row-major cell index in two grids of the same shape. */
export function cellError(a, b, cell) {
  const channels = a.c ?? 1
  const at = cell * channels
  let error = 0
  for (let ch = 0; ch < channels; ch++) error = Math.max(error, numberError(a.data[at + ch], b.data[at + ch]))
  return error
}

/** The value at (x, y): a number for one channel, [R, G, B] for three. */
export function pixel(grid, x, y) {
  const c = grid.c ?? 1
  const at = (y * grid.w + x) * c
  return c === 1 ? grid.data[at] : Array.from(grid.data.slice(at, at + c))
}

/** A value as it is drawn: clipped to [0, 1]; the value itself stays as it is. */
export const display = (v) => v > 0 ? Math.min(1, v) : 0

/** A cell's number as a grid writes it in the cell: up to two decimals (./number.js). */
const CELL_DIGITS = 2
export const cellNumber = (v) => numberText(v, CELL_DIGITS)

/** Read the cell that contains the selected cell's centre in relative grid coordinates. */
export function readCell({ x, y }, source, target) {
  const col = Math.floor((x + 0.5) * target.w / source.w)
  const row = Math.floor((y + 0.5) * target.h / source.h)
  return { x: col, y: row, value: pixel(target, col, row) }
}

/** Channel labels for a numbered cell or a full reading of it. */
export function pixelLabels(value, digits = CELL_DIGITS) {
  return Array.isArray(value) ? value.map((v, k) => `${'RGB'[k]} ${numberText(v, digits)}`) : [numberText(value, digits)]
}

export const pixelText = (value, digits = 4) => pixelLabels(value, digits).join(' · ')

/** A grid as rows of numbers, with each colour pixel an ordered RGB triple. */
export function gridText(grid) {
  if (!isGrid(grid)) return '—'
  const { w, h } = grid
  const colour = grid.c === 3
  if (!colour && w === 1 && h === 1) return cellNumber(pixel(grid, 0, 0))
  const cell = (x, y) => {
    const value = pixel(grid, x, y)
    return Array.isArray(value) ? `(${value.map(cellNumber).join(',')})` : cellNumber(value)
  }
  const rows = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => cell(x, y)).join(' '))
  return [`${w}×${h}${colour ? ' · RGB' : ''}`, ...rows].join('\n')
}
