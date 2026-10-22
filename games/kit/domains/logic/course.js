// A course of logic levels, from a game's spec (《证明完毕》): the play order and the tree from its eras
// (../../course.js layout), each level's number and the parts it can really offer, and the lemmas its levels build
// (proof.js lemma): a level with `builds: '<type>'` makes the lemma spec.lemmas[type] a part once solved.
import { defineCourse, eraLevels, layout, numbered, offer, usable } from '../../course.js'
import { parse, replaceAtoms, show } from './formula.js'
import { say } from './notation.js'

// Every rule a proof uses, in the boxes too.
const rulesIn = (circuit) => circuit.nodes.map((n) => n.type)
// How hard a level is, for its number: the steps (or gates) of its reference answer; a truth table counts as a short
// proof.
const ease = (level) => (level.solution ? level.solution.nodes.filter((n) => !['premise', 'goal', 'letter', 'out'].includes(n.type)).length : 2)

/**
 * spec: {
 *   eras        the course's eras, one proof machine each (games/DESIGN.md 2), each with its map chapter
 *               { title, desc }; a topic has a `code` for its numbers
 *   levels      every level, in any order; a level may introduce connective symbols (`symbols`), see notation.js
 *   words       { letter: { zh, en } } the everyday sentence each letter reads as, in every level
 *
 * A proof level is a schema: its test (`tests: [{ premises, goal }]`) is written in letters, and each test case
 * (`cases`, and `hiddenCases` for its hidden tests) fills the letters in with sentences ({ A: 'Rain', B: 'Wet' }, a
 * compound sentence too: { A: 'Rain ∧ Wind' }). Every case becomes a test of its own, with the case as `subst` and its
 * sentences as its label, so one proof is checked on all of them and the player never meets a bare letter.
 *   lemmas      { type: { name, desc, statement, premises?, metas } } the parts the player proves
 *   gates       { type: { name, desc, ports, f } } the gates the player builds on a truth circuit (gates.js)
 *   replaces    { part: [part] } a part that takes the place of others: from its level on, those leave the tray
 *   primitives  the rules the course starts from
 *   concept     { part: idea } parts that are one new idea together
 * }
 * A level may also hold back parts it would carry (`without: [part]`): a proof that must do without the box; and a
 * level that shows a new part's use by itself says why its use is abstract (`showcase: 'reason'`, ../../course.js).
 * A level names only the parts it brings in (`adds`): every part met or built before it in its era carries into it,
 * and across eras what each era keeps (../../course.js); and what it
 * folds away (`fold`); see ../../course.js reach and offer.
 * Returns { LEVELS, CHAPTERS, LABELS, course, usableIn(level, flags), offerIn(level, flags) }.
 */
// A proof level's tests from its schema and cases (see logicCourse), and the schema kept for the cards' choices.
function expand(level, notation) {
  const schema = level.tests[0]
  const test = (c) => {
    const subst = Object.fromEntries(Object.entries(c).map(([letter, text]) => [letter, parse(text)]))
    const fill = (text) => show(replaceAtoms(parse(text), subst))
    const parts = Object.values(subst).map((f) => say(f, notation))
    return { premises: Object.fromEntries(Object.entries(schema.premises ?? {}).map(([name, text]) => [name, fill(text)])), goal: fill(schema.goal), subst, label: { zh: parts.map((p) => p.zh).join(' · '), en: parts.map((p) => p.en).join(' · ') } }
  }
  return { schema, tests: level.cases.map(test), hidden: (level.hiddenCases ?? []).map(test) }
}

export function logicCourse({ eras, levels, words = null, lemmas = {}, gates = {}, primitives, concept = {}, replaces = {} }) {
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era, e) => eraLevels(era).map((id) => [id, e])))
  // A level writes formulas in its own words (notation.js) and with every symbol introduced by then: the symbols of
  // the levels before it in play order, and its own.
  let known = []
  const LEVELS = plan.order.map((id) => {
    const level = given.get(id)
    if (!level) throw new Error(`an era names a level that does not exist: ${id}`)
    known = [...known, ...(level.symbols ?? [])]
    const notation = { words: level.words ?? words, symbols: known }
    return { adds: [], ...level, ...(level.cases ? expand(level, notation) : {}), chapter: eraOf.get(id), requires: plan.requires.get(id) ?? [], unlocks: level.builds ? [`lemma:${level.builds}`] : [], lemmas, gates, notation }
  })
  for (const l of levels) if (!eraOf.has(l.id)) throw new Error(`level ${l.id} is in no era`)
  const byId = new Map(LEVELS.map((l) => [l.id, l]))
  // A level's number: on an era's main path the era and its place by difficulty ('1-4', numbered), in a topic its
  // code and place ('D2'), C1 …
  // for the era's challenges.
  const LABELS = new Map(eras.flatMap((era, e) => [
    ...numbered([...era.foundation, ...(era.practice ?? [])], plan.requires, (id) => ease(given.get(id))).map((id, k) => [id, `${e}-${k + 1}`]),
    ...(era.topics ?? []).flatMap((t) => t.levels.map((id, k) => [id, `${t.code}${k + 1}`])),
    ...(era.challenges ?? []).map((c, k) => [c.level, `C${e}.${k + 1}`]),
  ]))
  const CHAPTERS = eras.map((era) => ({ ...era.chapter, track: plan.tracks.get(era.id) }))
  const course = defineCourse({
    levels: LEVELS.map((l) => ({ id: l.id, unlocks: l.unlocks })),
    eras,
    primitives,
    concept: (p) => concept[p] ?? p,
    adds: (l) => byId.get(l.id).adds,
    needs: (p) => (lemmas[p] || gates[p] ? `lemma:${p}` : null),
    replaces: (p) => replaces[p] ?? [],
    builds: (l) => (byId.get(l.id).builds ? [byId.get(l.id).builds] : []),
    machine: (l) => eras[eraOf.get(l.id)].machine ?? null,
    naive: (l) => Boolean(byId.get(l.id).naive),
    needed: (l) => (byId.get(l.id).solution ? rulesIn(byId.get(l.id).solution) : null),
    folds: (l) => byId.get(l.id).fold ?? [],
    showcase: (l) => byId.get(l.id).showcase ?? null,
    abstraction: true,
  })
  // A level may hold parts back (`without`): what the course carries into it, less those (a proof without boxes).
  const held = (level) => byId.get(level.id)?.without ?? []
  const usableIn = (level, flags) => usable(course, { id: level.id }, flags).filter((p) => !held(level).includes(p))
  const offerIn = (level, flags) => {
    const { shown, folded, ...rest } = offer(course, { id: level.id }, flags)
    return { ...rest, shown: shown.filter((p) => !held(level).includes(p)), folded: folded.filter((p) => !held(level).includes(p)) }
  }
  return { LEVELS, CHAPTERS, LABELS, course, usableIn, offerIn }
}
