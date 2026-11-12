// The values on a signal board's wires: a number and a wave. A wave is the kit's grid of one row
// (../../engine/grid.js: { w, h: 1, c: 1, data }), a sample a column, so the kit draws it as a function of its column
// (the view `plot`) or as its numbers. Content writes a wave as the list of its samples.
import { isGrid } from '../../engine/grid.js'
import { numberText } from '../../engine/number.js'
import { T as t } from '../../shell/i18n.js'

/** A wave from its samples. */
export const wave = (data) => ({ w: data.length, h: 1, c: 1, data })

export const isWave = (v) => isGrid(v) && v.h === 1

/** A value as content writes it (a number, or a wave's samples) made a value on the wires. */
export const fromContent = (v) => (Array.isArray(v) ? wave([...v]) : v)

/** What a value is, in words: a number, a wave of n samples, nothing. */
export function kindOf(v) {
  if (v === null || v === undefined) return t('「—」')
  if (typeof v === 'number') return t('一个数')
  if (isWave(v)) return t(`${v.w} 格的波形`, `a wave of ${v.w} samples`)
  return t('别的东西')
}

/** Whether two values are the same, samples within `tolerance` (a board's arithmetic leaves binary noise). */
export function same(a, b, tolerance = 1e-9) {
  if (a === null || a === undefined || b === null || b === undefined) return (a ?? null) === (b ?? null)
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tolerance
  if (isWave(a) && isWave(b)) return a.w === b.w && a.data.every((x, k) => Math.abs(x - b.data[k]) <= tolerance)
  return false
}

/** A value in words, as a card and the results write it: a number, or a wave's samples in a row. */
export function show(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return numberText(v)
  if (isWave(v)) return `(${v.data.map((x) => numberText(x, 2)).join(', ')})`
  return String(v)
}
