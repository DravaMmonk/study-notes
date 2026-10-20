// A course of syntax levels, from a game's spec (《句法之图》): its lexicon read for the grammar, the play order and
// level tree from its eras (../../../course.js layout), each level with its palette as word types, its era and what
// it requires, and the course the shared audit checks (npm run check).
//
// syntaxCourse({ lexicon, eras, levels })
//   lexicon  { nouns, verbs, inflections } (lexicon.js)
//   eras     [{ id, machine, title, kicker?, question?, foundation, practice?, topics?, challenges? }]
//   levels   [{ id, title, brief, hint?, intro?, meaning, palette: { np?, verb?, infl? }, preset?, refer?, answer,
//              traps?, target?, debrief: { title, body, note } }], in any order
//     meaning  { pred, tense, aspect, gloss, roles: { ROLE: { ent, number, label, note? } } }: what the sentence must
//              say. `label` and `note` are what the player reads; `ent` and `number` are what the check compares.
//     preset   part of the answer already in its slots, fixed (same shape as the answer)
//     refer    what each pronoun names here ({ she: 'reviewer' }): the context the sentence is said in
//     answer   the reference sentence as a clause of lexicon keys ({ SUBJ, INFL, V, OBJ?, IOBJ?, TO? })
//     traps    [{ answer, fails: 'grammar' | 'pred' | 'time' | 'role' | 'star' }]: sentences a player is likely to
//              try, which the level must turn down where it says (validate.js runs them and the answer)
// Returns { lex, LEVELS, CHAPTERS, course, concept }.

import { defineCourse, eraLevels, layout } from '../../../course.js'
import { defineLexicon } from './lexicon.js'

const KINDS = ['np', 'verb', 'infl']

export function syntaxCourse({ lexicon, eras, levels }) {
  const lex = defineLexicon(lexicon)
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era])))
  for (const l of levels) if (!eraOf.has(l.id)) throw new Error(`level ${l.id} is in no era`)
  const LEVELS = plan.order.map((id) => {
    const level = given.get(id)
    if (!level) throw new Error(`an era names a level that does not exist: ${id}`)
    return {
      ...level,
      era: eraOf.get(id).id,
      requires: plan.requires.get(id) ?? [],
      palette: KINDS.flatMap((kind) => (level.palette?.[kind] ?? []).map((key) => lex.type(kind, key))),
    }
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, kicker: era.kicker, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  // One idea a level (games/DESIGN.md): a noun phrase is one idea, a pronoun with case another, a verb frame one,
  // and an aspect one (its tenses and agreement forms are that aspect's models).
  const concept = (type) => {
    const p = lex.part(type)
    if (!p) return type
    if (p.kind === 'np') return p.case ? 'pronoun' : 'noun-phrase'
    if (p.kind === 'verb') return `frame:${p.frame === 'dative' ? 'ditransitive' : p.frame}`
    return `aspect:${p.aspect}`
  }
  const palettes = new Map(LEVELS.map((L) => [L.id, L.palette]))
  const course = defineCourse({
    levels: LEVELS.map((L) => ({ id: L.id, unlocks: [] })),
    eras,
    // Every word is a primitive: what a player builds in a syntax game is the sentence, not the words.
    primitives: lex.types(),
    palette: (level) => palettes.get(level.id) ?? [],
    needs: () => null,
    builds: () => [],
    concept,
    machine: (level) => eraOf.get(level.id)?.machine ?? null,
  })
  return { lex, LEVELS, CHAPTERS, course, concept }
}
