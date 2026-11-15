// What the plots share: a grid's row as a list, and one value range for every grid drawn on the same axes — from
// zero up when nothing is negative, symmetric about zero when something is.
import { finiteExtent } from '../../engine/number.js'

export const rowOf = (grid, y) => Array.from(grid.data.slice(y * grid.w, (y + 1) * grid.w))

export function rangeOf(...grids) {
  const { lo, hi } = finiteExtent(grids.map((grid) => grid?.data)) ?? { lo: 0, hi: 0 }
  if (lo < 0) {
    const m = Math.max(-lo, hi)
    return { lo: -m, hi: m }
  }
  return { lo: 0, hi: hi || 1 }
}
