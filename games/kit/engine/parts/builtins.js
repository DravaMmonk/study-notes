// The kernel's own engine resources (games/DESIGN.md 6.9): the logic every domain's part definitions share for
// interaction — when a setting shows, what a rule sets, whether a check holds — over plain numbers, words and true or
// false. A domain's own resources (its vocabulary's `op` kind) work on its values (images, frames…); no domain resource
// may take one of these names.
import { PartError } from '../circuit.js'
import { T as t } from '../../shell/i18n.js'

const args = (...names) => names.map((name) => ({ name }))
const num = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) throw new PartError(t(`${v} 不是数`, `${v} is not a number`))
  return n
}

export const BUILTINS = {
  eq: { about: t('两者相等', 'the two are equal'), args: args('a', 'b'), run: ([a, b]) => String(a) === String(b) },
  ne: { about: t('两者不等', 'the two differ'), args: args('a', 'b'), run: ([a, b]) => String(a) !== String(b) },
  lt: { about: t('a < b', 'a < b'), args: args('a', 'b'), run: ([a, b]) => num(a) < num(b) },
  le: { about: t('a ≤ b', 'a ≤ b'), args: args('a', 'b'), run: ([a, b]) => num(a) <= num(b) },
  gt: { about: t('a > b', 'a > b'), args: args('a', 'b'), run: ([a, b]) => num(a) > num(b) },
  ge: { about: t('a ≥ b', 'a ≥ b'), args: args('a', 'b'), run: ([a, b]) => num(a) >= num(b) },
  and: { about: t('两者都为真', 'both are true'), args: args('a', 'b'), run: ([a, b]) => Boolean(a) && Boolean(b) },
  or: { about: t('至少一个为真', 'at least one is true'), args: args('a', 'b'), run: ([a, b]) => Boolean(a) || Boolean(b) },
  not: { about: t('不为真', 'not true'), args: args('a'), run: ([a]) => !a },
  if: { about: t('条件为真取第二个，否则取第三个', 'the second where the condition is true, else the third'), args: args('condition', 'yes', 'no'), run: ([c, y, n]) => (c ? y : n) },
  plus: { about: t('两数之和', 'the sum of two numbers'), args: args('a', 'b'), run: ([a, b]) => num(a) + num(b) },
  minus: { about: t('两数之差', 'the difference of two numbers'), args: args('a', 'b'), run: ([a, b]) => num(a) - num(b) },
  times: { about: t('两数之积', 'the product of two numbers'), args: args('a', 'b'), run: ([a, b]) => num(a) * num(b) },
  over: { about: t('两数之商；除以 0 报错', 'the quotient of two numbers; dividing by 0 stops'), args: args('a', 'b'), run: ([a, b]) => (num(b) === 0 ? (() => { throw new PartError(t('除以 0', 'divided by 0')) })() : num(a) / num(b)) },
  round: { about: t('按 digits 位小数四舍五入', 'rounded to `digits` decimals'), args: args('a'), params: { type: 'obj', fields: { digits: { type: 'int', min: 0, max: 8, optional: true } } }, run: ([a], { digits = 0 }) => Number(num(a).toFixed(digits)) },
  clamp: { about: t('限制在 lo 到 hi 之间', 'kept between lo and hi'), args: args('a', 'lo', 'hi'), run: ([a, lo, hi]) => Math.min(num(hi), Math.max(num(lo), num(a))) },
}

/** The builtins as vocabulary items (data): what the studio lists beside a domain's own resources. */
export const BUILTIN_ITEMS = Object.fromEntries(Object.entries(BUILTINS).map(([k, { about, args: a, params }]) => [k, { about, args: a, ...(params ? { params } : {}) }]))
