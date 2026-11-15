// The net domain's engine resources (games/DESIGN.md 6.8): what a game's parts.json computes with, over bits, whole
// numbers and yes or no (a bit is the number 0 or 1, yes is 1 and no 0). A part handed 「—」 gives 「—」 before any of
// these runs (../../engine/parts/define.js `nulls`), but for select, which reads only the input it picks; a register is
// the kernel's (held, keeps).
import { T as t } from '../../shell/i18n.js'

const args = (...names) => names.map((name) => ({ name }))
const num = (v) => (typeof v === 'boolean' ? Number(v) : v)
const truth = (v) => (v === null || v === undefined ? null : v === true || v === 1)

export const OPS = {
  select: {
    about: t('条件为是或 1 时给出 yes，为否或 0 时给出 no，为「—」时给出「—」'),
    args: args('condition', 'yes', 'no'),
    run: ([c, yes, no]) => {
      const pick = truth(c)
      return pick === null ? null : pick ? yes ?? null : no ?? null
    },
  },
  add: { about: t('a + b'), args: args('a', 'b'), symmetric: true, run: ([a, b]) => num(a) + num(b) },
  equal: { about: t('a 和 b 是同一个数'), args: args('a', 'b'), symmetric: true, run: ([a, b]) => num(a) === num(b) },
  bit: {
    about: t('8 位数 n 从最高位数起的第 i 位；i 不在 0 到 7 之间时没有值'),
    args: args('n', 'i'),
    run: ([n, i]) => {
      const k = num(i)
      return Number.isInteger(k) && k >= 0 && k < 8 ? (num(n) >> (7 - k)) & 1 : null
    },
  },
}

/** The resources as vocabulary items (data). */
export const OP_ITEMS = Object.fromEntries(Object.entries(OPS).map(([k, { run: _, ...item }]) => [k, item]))
