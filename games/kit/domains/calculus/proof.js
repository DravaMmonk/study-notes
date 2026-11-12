// Analytical interval criteria for the function families used by the calculus continuity tasks. A test supplies input
// numbers each tick, and the board proposes a radius or a witness. The condition covers the whole open interval,
// rather than a finite list of sampled x values. The lower bounds on radii are game requirements, not part of the
// mathematical definition of continuity.
import { T } from '../../shell/i18n.js'

const positive = (x) => typeof x === 'number' && Number.isFinite(x) && x > 0
const number = (x) => typeof x === 'number' && Number.isFinite(x)
const radius = (d) => positive(d) ? null : T('δ 必须是正的有限数。', 'δ must be a positive finite number.')

export const claimName = (call) => typeof call === 'string' ? call : Object.keys(call)[0]

export const CLAIMS = {
  lineDelta: {
    inputs: ['m', 'e'], outputs: ['d'],
    valid: ({ m, e }) => number(m) && positive(e),
    judge: ({ m, e }, { d }) => radius(d)
      ?? (Math.abs(m) * d > e ? T('|m|δ 超过 ε：区间里有函数值偏离太远的点。', '|m|δ exceeds ε: some point in the interval is too far away.') : null)
      ?? (d < e / (4 * (Math.abs(m) + 1)) ? T('δ 太小：本关要求至少 ε/[4(|m|+1)]。', 'δ is too small: this task requires at least ε/[4(|m|+1)].') : null),
  },
  squareDelta: {
    inputs: ['a', 'e'], outputs: ['d'],
    valid: ({ a, e }) => number(a) && positive(e) && e <= 1,
    judge: ({ a, e }, { d }) => radius(d)
      ?? (d * (2 * Math.abs(a) + d) > e ? T('δ(2|a|+δ) 超过 ε：平方函数在区间内偏离太远。', 'δ(2|a|+δ) exceeds ε: the square function strays too far within the interval.') : null)
      ?? (d < e / (4 * (2 * Math.abs(a) + 1)) ? T('δ 太小：本关要求至少 ε/[4(2|a|+1)]。', 'δ is too small: this task requires at least ε/[4(2|a|+1)].') : null),
  },
  stepDelta: {
    inputs: ['a', 'e'], outputs: ['d'],
    valid: ({ a, e }) => number(a) && a !== 0 && positive(e) && e <= 1,
    judge: ({ a }, { d }) => radius(d)
      ?? (d > Math.abs(a) ? T('δ 跨过了台阶的跳点 0。', 'δ reaches across the step function’s jump at zero.') : null)
      ?? (d < Math.abs(a) / 4 ? T('δ 太小：本关要求至少 |a|/4。', 'δ is too small: this task requires at least |a|/4.') : null),
  },
  stepWitness: {
    inputs: ['d', 'e'], outputs: ['x', 'y'],
    valid: ({ d, e }) => positive(d) && positive(e) && e <= 1,
    judge: ({ d, e }, { x, y }) => !number(x) || !(x < 0 && -x < d)
      ? T('反例 x 必须在 −δ 与 0 之间。', 'The witness x must lie strictly between −δ and zero.')
      : y !== 0 || 1 - y < e
        ? T('交出的函数值必须是台阶函数在 x 的值，并与 f(0) 至少相差 ε。', 'The output must be the step function’s value at x and differ from f(0) by at least ε.')
        : null,
  },
}
