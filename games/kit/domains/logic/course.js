// A course of logic levels, from a game's spec (《证明完毕》): the play order and the tree from its eras
// (../../course.js layout), each level's number and the parts it can really offer, and the lemmas its levels build
// (proof.js lemma): a level with `builds: '<type>'` makes the lemma spec.lemmas[type] a part once solved.
import { defineCourse, eraLevels, layout, offer, pathLevels, usable } from '../../course.js'

// Every rule a proof uses, in the boxes too.
const rulesIn = (circuit) => circuit.nodes.flatMap((n) => [n.type, ...Object.values(n.boards ?? {}).flatMap(rulesIn)])

/**
 * spec: {
 *   eras        the course's eras, one proof machine each (games/DESIGN.md 2), each with its map chapter
 *               { title, desc }; a topic has a `code` for its numbers
 *   levels      every level, in any order; a level may give its letters everyday sentences (`words`) and introduce
 *               connective symbols (`symbols`), see notation.js
 *   lemmas      { type: { name, desc, statement, premises?, metas } } the parts the player proves
 *   primitives  the rules the course starts from
 *   concept     { part: idea } parts that are one new idea together
 * }
 * A level may fold away parts of its palette (`fold`); see ../../course.js offer.
 * Returns { LEVELS, CHAPTERS, LABELS, course, usableIn(level, flags), offerIn(level, flags) }.
 */
export function logicCourse({ eras, levels, lemmas = {}, primitives, concept = {} }) {
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
    return { palette: [], ...level, chapter: eraOf.get(id), requires: plan.requires.get(id) ?? [], unlocks: level.builds ? [`lemma:${level.builds}`] : [], lemmas, notation: { words: level.words ?? null, symbols: known } }
  })
  for (const l of levels) if (!eraOf.has(l.id)) throw new Error(`level ${l.id} is in no era`)
  const byId = new Map(LEVELS.map((l) => [l.id, l]))
  // A level's number: on an era's main path the era and its place ('1-4'), in a topic its code and place ('D2'), C1 …
  // for the era's challenges.
  const LABELS = new Map(eras.flatMap((era, e) => [
    ...pathLevels([...era.foundation, ...(era.practice ?? [])]).map((id, k) => [id, `${e}-${k + 1}`]),
    ...(era.topics ?? []).flatMap((t) => t.levels.map((id, k) => [id, `${t.code}${k + 1}`])),
    ...(era.challenges ?? []).map((c, k) => [c.level, `C${e}.${k + 1}`]),
  ]))
  const CHAPTERS = eras.map((era) => ({ ...era.chapter, track: plan.tracks.get(era.id) }))
  const course = defineCourse({
    levels: LEVELS.map((l) => ({ id: l.id, unlocks: l.unlocks })),
    eras,
    primitives,
    concept: (p) => concept[p] ?? p,
    palette: (l) => byId.get(l.id).palette,
    needs: (p) => (lemmas[p] ? `lemma:${p}` : null),
    builds: (l) => (byId.get(l.id).builds ? [byId.get(l.id).builds] : []),
    machine: (l) => eras[eraOf.get(l.id)].machine ?? null,
    naive: (l) => Boolean(byId.get(l.id).naive),
    needed: (l) => (byId.get(l.id).solution ? rulesIn(byId.get(l.id).solution) : null),
    folds: (l) => byId.get(l.id).fold ?? [],
  })
  const usableIn = (level, flags) => usable(course, { id: level.id }, flags)
  const offerIn = (level, flags) => offer(course, { id: level.id }, flags)
  return { LEVELS, CHAPTERS, LABELS, course, usableIn, offerIn }
}
