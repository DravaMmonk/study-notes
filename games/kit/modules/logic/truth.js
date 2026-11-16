// Truth tables (《证明完毕》 era 0): the letters of a propositional formula, its rows in a fixed order (every letter
// true first, as textbooks list them), and its value on each.
import { holds } from './models.js'
import { signature } from './formula.js'

/** The proposition letters of some formulas, in alphabetical order. */
export const lettersOf = (formulas) => [...signature(formulas).preds.keys()].sort()

/** Every row for these letters: [{ A: true, B: false }, …], true before false, the first letter changing slowest. */
export const rowsOf = (letters) => Array.from({ length: 2 ** letters.length }, (_, n) => Object.fromEntries(letters.map((l, k) => [l, !((n >> (letters.length - 1 - k)) & 1)])))

/** A formula's value on a row. */
export const valueOn = (f, row) => holds(f, { domain: [0], preds: row, fns: {} })

/** Is a formula true on every row? */
export const tautology = (f) => rowsOf(lettersOf([f])).every((row) => valueOn(f, row))
