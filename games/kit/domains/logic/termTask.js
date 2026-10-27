// A term task (《证明完毕》 chapters 12 and 13, ui/TermScreen.jsx): its premises and goal read in its names of things,
// and the kernel's check of a term for it (pterm.js), sentences compared once the level's definitions work them out.
import { parse } from './formula.js'
import { checkTerm } from './pterm.js'
import { lemmaUse } from './proof.js'
import { defNormal } from './rewrite.js'

/** { hyps, goal, check(term) → '' or why not } */
export function termTaskOf(level) {
  const consts = level.consts ?? []
  const hyps = Object.fromEntries(Object.entries(level.premises ?? {}).map(([name, f]) => [name, parse(f, { consts })]))
  const goal = parse(level.goal, { consts })
  const options = { hyps, consts, notation: level.notation, lemma: lemmaUse(level.lemmas), norm: defNormal(level.defs) }
  return { hyps, goal, check: (term) => checkTerm(term, goal, options) }
}
