// The market domain's engine resources (games/DESIGN.md 6.8): what a game's pieces.json computes with, over numbers.
// A part handed 「—」 gives 「—」 before any of these runs (../../engine/parts/define.js `nulls`).
import { T as t } from '../../shell/i18n.js'

const args = (...names) => names.map((name) => ({ name }))

export const OPS = {
  add: { about: t('a + b'), args: args('a', 'b'), symmetric: true, run: ([a, b]) => a + b },
  sub: { about: t('a − b'), args: args('a', 'b'), run: ([a, b]) => a - b },
  mul: { about: t('a × b'), args: args('a', 'b'), symmetric: true, run: ([a, b]) => a * b },
  div: { about: t('a ÷ b；b 为 0 时没有值'), args: args('a', 'b'), run: ([a, b]) => (b === 0 ? null : a / b) },
  min: { about: t('a 和 b 里小的那个'), args: args('a', 'b'), symmetric: true, run: ([a, b]) => Math.min(a, b) },
}

/** The resources as vocabulary items (data). */
export const OP_ITEMS = Object.fromEntries(Object.entries(OPS).map(([k, { run: _, ...item }]) => [k, item]))
