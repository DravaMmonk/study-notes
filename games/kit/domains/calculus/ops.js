// The calculus domain's engine resources (games/DESIGN.md 6.8): what a game's parts.json computes with, over numbers.
// A part handed 「—」 gives 「—」 before any of these runs (../../engine/parts/define.js `nulls`); a register is the
// kernel's (held, keeps).
import { T as t } from '../../shell/i18n.js'

const args = (...names) => names.map((name) => ({ name }))

export const OPS = {
  add: { about: t('a + b'), args: args('a', 'b'), symmetric: true, run: ([a, b]) => a + b },
  mul: { about: t('a × b'), args: args('a', 'b'), symmetric: true, run: ([a, b]) => a * b },
  recip: { about: t('1/a；a 为 0 时没有值'), args: args('a'), run: ([a]) => (a === 0 ? null : 1 / a) },
  less: { about: t('a < b 时为 1，否则为 0'), args: args('a', 'b'), run: ([a, b]) => (a < b ? 1 : 0) },
}

/** The resources as vocabulary items (data). */
export const OP_ITEMS = Object.fromEntries(Object.entries(OPS).map(([k, { run: _, ...item }]) => [k, item]))
