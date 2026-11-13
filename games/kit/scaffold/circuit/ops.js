// The __name__ domain's engine resources (games/DESIGN.md 6.8): the computations a game's parts.json may call, each
// with what it is, its arguments (positional) and its named parameters, if any (a schema). A part's expression calls
// them on its inputs and settings; a resource handed what it cannot work on stops with why (a PartError). The kernel's
// builtins (../../engine/parts/builtins.js) come with every domain.
import { PartError } from '../../engine/circuit.js'
import { T as t } from '../../shell/i18n.js'

const args = (...names) => names.map((name) => ({ name }))
const number = (v) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new PartError(t(`${v} 不是数`, `${v} is not a number`))
  return v
}

export const OPS = {
  add: { about: t('a + b'), args: args('a', 'b'), symmetric: true, run: ([a, b]) => number(a) + number(b) },
  sub: { about: t('a − b'), args: args('a', 'b'), run: ([a, b]) => number(a) - number(b) },
}

/** The resources as the vocabulary lists them (data). */
export const OP_ITEMS = Object.fromEntries(Object.entries(OPS).map(([k, { run: _, ...item }]) => [k, item]))
