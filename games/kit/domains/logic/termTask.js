// A term task (《证明完毕》 chapters 13 and 14): its premises and goal read in its names of things,
// and the kernel's check of a term for it (pterm.js), sentences compared once the level's definitions work them out.
import { parse } from './formula.js'
import { checkTerm, parseTerm } from './pterm.js'
import { inOrder, property } from '../../engine/judge.js'
import { T } from '../../shell/i18n.js'
import { say } from './notation.js'
import { chipsOf, complete, languageOf } from './termTree.js'
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

/** Check the shape of the tree before giving it to the proof kernel. */
export function termJudge(level) {
  const { check } = termTaskOf(level)
  return inOrder(
    property(complete, () => ({ why: T('证明项还有空位：每个位置都须填写。') })),
    (term) => {
      const why = check(term)
      return why ? { why } : null
    },
  )
}

export function proofTerm(level) {
  const { hyps, goal } = termTaskOf(level)
  const text = (formula) => say(formula, level.notation)
  const scope = [...Object.keys(hyps), ...(level.uses ?? []), ...(level.consts ?? [])]
  return {
    initial: level.given ? parseTerm(level.given) : null,
    judge: termJudge(level),
    premises: Object.entries(hyps).map(([name, formula]) => ({ name, text: text(formula) })),
    goal: text(goal),
    chips: (tree) => chipsOf(scope, tree, level.forms),
    language: languageOf(scope),
    passed: T('类型相符：这个证明项证明的正是这句话。'),
  }
}
