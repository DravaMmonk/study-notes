import { judgeSums, readSum } from './sums.js'
import { failureText } from '../../engine/failure-text.js'

const sourceOf = ({ level }) => level.source ?? level

/** The same addition rows and judge used by the tree editor, exposed as a textual work. */
export const play = {
  open(ctx) {
    const source = sourceOf(ctx)
    return { given: source.rows.map(({ total, chips }) => `${total} = … (${chips.join(', ')})`).join('\n'), write: 'One addition expression per row; use the offered numbers separated by +.' }
  },
  attempt(ctx, text) {
    try {
      const work = text.trim().split('\n').map((line) => readSum(line.trim()))
      const source = sourceOf(ctx)
      if (work.length !== source.rows.length) return { pass: false, says: ['Give one expression for each row.'] }
      if (work.some((_, index) => text.trim().split('\n')[index].split('+').some((number) => !source.rows[index].chips.includes(Number(number.trim()))))) return { pass: false, says: ['Use only the numbers offered for this row.'] }
      const fail = judgeSums(source.rows)(work)
      return { pass: !fail, says: fail ? [failureText(fail)] : [], work }
    } catch (error) {
      return { pass: false, says: [error.message] }
    }
  },
}
