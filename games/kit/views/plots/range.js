// What the plots share: a grid's row as a list, and one value range for every grid drawn on the same axes — from
// zero up when nothing is negative, symmetric about zero when something is.

export const rowOf = (grid, y) => Array.from(grid.data.slice(y * grid.w, (y + 1) * grid.w))

export function rangeOf(...grids) {
  let lo = 0
  let hi = 0
  for (const g of grids) for (const v of g?.data ?? []) if (Number.isFinite(v)) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  if (lo < 0) {
    const m = Math.max(-lo, hi)
    return { lo: -m, hi: m || 1 }
  }
  return { lo: 0, hi: hi || 1 }
}
