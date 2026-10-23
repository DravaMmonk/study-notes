// What a proof card's settings offer (《证明完毕》): the level's own sentences and every part of them, any one starting
// with ∃ for what Example concludes, the level's names, the variables its sentences use (and x, y, z) and the compound
// terms they use. A level may offer sentences its premises and goal do not hold (`sentences`: an assumption a proof
// needs, such as ¬A for a proof by contradiction), in its schema's letters. The board shows them (ui/boards.jsx) and
// validate.js checks that the reference proof picks only from them.
import { allVars, parse, show } from './formula.js'
import { compoundTerms, subformulas } from './notation.js'

/** What each card's settings pick, when not any sentence (the default, 'formula'). */
export const SETTING_KINDS = { allI: { x: 'var' }, exE: { x: 'var' }, allE: { t: 'term' }, exI: { t: 'term', target: 'exists' }, refl: { t: 'term' } }

/** { formula: [formula], exists: [formula], term: [text], var: [text] } for a proof level. */
export function choicesOf(level) {
  const consts = level.consts ?? []
  // The schema is the course's (its last test, in letters); a bare level stands on its last test.
  const { premises = {}, goal } = level.schema ?? level.tests.at(-1)
  const schema = [...Object.values(premises), goal].map((t) => parse(t, { consts }))
  const extra = (level.sentences ?? []).map((t) => parse(t, { consts }))
  const vars = [...new Set([...schema.flatMap((f) => [...allVars(f)]), 'x', 'y', 'z'])]
  const sentences = subformulas([...schema, ...extra])
  return {
    formula: sentences,
    exists: sentences.filter((f) => f.op === '∃'),
    term: [...consts, ...vars, ...new Set(schema.flatMap((f) => compoundTerms(f)))],
    var: vars,
  }
}

/** The choice a setting holds, written the way choicesOf's are, to compare. */
export const choiceKey = (kind, text, level) => (kind === 'formula' || kind === 'exists' ? show(parse(text, { consts: level.consts ?? [] })) : text)
