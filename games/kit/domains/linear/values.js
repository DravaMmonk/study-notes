// The values on a linear board's wires: a number, a vector and a matrix. A matrix is the kit's grid (../../engine/grid.js:
// { w, h, c: 1, data } row by row, w columns and h rows); a vector is a matrix of one column, its entries top to bottom,
// so the kit draws both (as numbers, or as arrows in the plane: the view `plane`). Content writes a vector as a list of
// numbers and a matrix as a list of its rows.
import { isGrid } from '../../engine/grid.js'
import { numberText } from '../../engine/number.js'
import { T as t } from '../../shell/i18n.js'

export { isGrid }

/** A matrix of w columns and h rows from its entries, row by row. */
export const grid = (w, h, data) => ({ w, h, c: 1, data })

export const isVector = (v) => isGrid(v) && v.w === 1

/** A value as content writes it (a number, a list of numbers, a list of rows) made a value on the wires. */
export function fromContent(v) {
  if (!Array.isArray(v)) return v
  if (v.every((x) => typeof x === 'number')) return grid(1, v.length, [...v])
  return grid(v[0].length, v.length, v.flat())
}

/** What a value is, in words: a number, a vector of n entries, an m × n matrix, nothing. */
export function kindOf(v) {
  if (v === null || v === undefined) return t('「—」', '「—」')
  if (typeof v === 'number') return t('一个数', 'a number')
  if (isVector(v)) return t(`${v.h} 维向量`, `a vector of ${v.h} entries`)
  if (isGrid(v)) return t(`${v.h} × ${v.w} 矩阵`, `a ${v.h} × ${v.w} matrix`)
  return t('别的东西', 'something else')
}

/** A grid's shape, rows × columns. */
export const shapeText = (g) => `${g.h} × ${g.w}`

/** Whether two values are the same, entries within `tolerance` (a board's arithmetic leaves binary noise). */
export function same(a, b, tolerance = 1e-9) {
  if (a === null || a === undefined || b === null || b === undefined) return a === b || (a ?? null) === (b ?? null)
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tolerance
  if (isGrid(a) && isGrid(b)) return a.w === b.w && a.h === b.h && a.data.every((x, k) => Math.abs(x - b.data[k]) <= tolerance)
  return false
}

/** A value in words, as a card and the results write it: a number; a vector as a column (x, y); a matrix by rows. */
export function show(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return numberText(v)
  if (isVector(v)) return `(${v.data.map((x) => numberText(x)).join(', ')})`
  if (isGrid(v)) return `[${Array.from({ length: v.h }, (_, r) => v.data.slice(r * v.w, r * v.w + v.w).map((x) => numberText(x)).join(' ')).join('; ')}]`
  return String(v)
}
