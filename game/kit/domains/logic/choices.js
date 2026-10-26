// What a proof card's settings offer (《证明完毕》): the level's own sentences and every part of them, any one starting
// with ∃ for what Example concludes, the level's names, the names of particular things its proof needs (a, then b,
// then c: only as many as it uses) and the compound
// terms they use. x, y, z are only ever bound by a quantifier: a particular thing (the one For any takes, the one
// Take the one there is takes out) is named a, b or c, so a part of a sentence that has a bound variable free is
// offered with each such name in its place. A level may offer sentences its premises and goal do not hold
// (`sentences`: an assumption a proof needs, such as ¬A for a proof by contradiction), in its schema's letters. The
// board shows them (ui/boards.jsx) and validate.js checks that the reference proof picks only from them.
import { freeVars, parse, show, showTerm, subst, tvar } from './formula.js'
import { compoundTerms, subformulas } from './notation.js'

/** The names of particular things a card may give or take. */
export const NAMES = ['a', 'b', 'c']

/** What each card's settings pick, when not any sentence (the default, 'formula'). */
export const SETTING_KINDS = { allI: { x: 'name' }, exE: { x: 'name' }, allE: { t: 'term' }, exI: { target: 'exists' }, refl: { t: 'term' } }

// A formula with each of its free variables replaced by a name, every way.
function named(f, names) {
  const free = [...freeVars(f)]
  return free.reduce((list, v) => list.flatMap((g) => names.map((n) => subst(g, v, tvar(n)))), [f])
}
const unique = (list) => [...new Map(list.map((f) => [show(f), f])).values()]

// The names a level's own proof gives particular things: only as many as it needs (most need just a).
function namesOf(level) {
  const texts = (level.solution?.nodes ?? []).flatMap((node) => Object.values(node.params ?? {}).filter((v) => typeof v === 'string'))
  return NAMES.filter((n) => texts.some((t) => new RegExp(`(^|[^A-Za-z])${n}($|[^A-Za-z])`).test(t)))
}

/** { formula: [formula], exists: [formula], term: [text], name: [text] } for a proof level. */
export function choicesOf(level) {
  const names = namesOf(level)
  const consts = level.consts ?? []
  // The schema is the course's (its last test, in letters); a bare level stands on its last test.
  const { premises = {}, goal } = level.schema ?? level.tests.at(-1)
  const schema = [...Object.values(premises), goal].map((t) => parse(t, { consts }))
  const extra = (level.sentences ?? []).map((t) => parse(t, { consts }))
  const sentences = unique(subformulas([...schema, ...extra]).flatMap((f) => named(f, names)))
  // A compound term (s(x)) is offered with names in its places too.
  const terms = schema.flatMap(compoundTerms).flatMap((t) => named(parse(`T(${t})`, { consts }), names).map((g) => showTerm(g.args[0])))
  return {
    formula: sentences,
    exists: sentences.filter((f) => f.op === '∃'),
    term: [...new Set([...consts, ...names, ...terms])],
    name: names,
  }
}

/** The choice a setting holds, written the way choicesOf's are, to compare. */
export const choiceKey = (kind, text, level) => (kind === 'formula' || kind === 'exists' ? show(parse(text, { consts: level.consts ?? [] })) : text)
