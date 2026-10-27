// A course of syntax levels, from a game's spec (《句法之图》): its lexicon read for the grammar, the play order and
// level tree from its eras (../../../course.js layout), each level with its palette as word types, its era and what
// it requires, and the course the shared audit checks (npm run check).
//
// syntaxCourse({ lexicon, eras, levels })
//   lexicon  { nouns, verbs } (lexicon.js; the times are the grammar's)
//   eras     [{ id, machine, title, kicker?, question?, foundation, practice?, topics?, challenges? }]
//   levels   in any order, each a sentence level or a drill:
//            sentence  { id, title, brief, hint?, intro?, context, meaning, palette: { np?, verb?, time? }, preset?,
//                        refer?, why?, answer, traps?, target?, debrief: { title, body, note } }
//            drill     { id, kind: 'drill', title, brief, hint?, intro?, move: { zh, en }, items: [item], debrief }
//                        (engine/drill.js says what an item is; `move` names the writing situation its items share)
//            run       { id, kind: 'run', title, brief, hint?, intro?, run, debrief } (engine/run.js says what `run`
//                        holds: credibility, phrasings to start with and to win, the route's stops, the templates)
//     context  [{ zh, en }]: the situation the sentence is said in, which the player reads to decide (the time and the
//              viewpoint are never written on the meaning graph; they follow from here)
//     meaning  { pred, tense, aspect, roles: { ROLE: { ent, number, label, note? } } }: what the sentence must say.
//              `label` and `note` are what the player reads; `ent` and `number` are what the check compares.
//     preset   part of the answer already in its slots, fixed (same shape as the answer)
//     refer    what each pronoun names here ({ she: 'reviewer' }): the context the sentence is said in
//     palette.time  the times the level weighs (grammar.js TIMES keys, 'present.perfect'): the time questions offer
//              the answers these use, and the level introduces them in the course audit
//     why      { time key: { zh, en } }: for each wrong time the level offers, why a native speaker would not say it
//              here (validate.js asks for one per wrong time); any other wrong time gets a plain reason from the
//              question it answers differently
//     answer   the reference sentence as a clause of lexicon keys ({ SUBJ, TIME, V, OBJ?, IOBJ?, TO? })
//     traps    [{ answer, fails: 'grammar' | 'pred' | 'time' | 'role' | 'star' }]: sentences a player is likely to
//              try, which the level must turn down where it says (validate.js runs them and the answer)
// Returns { lex, LEVELS, CHAPTERS, course, concept }.

import { defineCourse, eraLevels, layout } from '../../../course.js'
import { optionsOf } from './drill.js'
import { defineLexicon } from './lexicon.js'

const KINDS = ['np', 'verb', 'time']

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
      // A drill's palette is the times its items weigh, a run's the phrasings it can hand out: what they practise.
      palette: level.kind === 'drill'
        ? [...new Set(level.items.flatMap(optionsOf))].map((key) => lex.type('time', key))
        : level.kind === 'run'
          ? [...new Set([...level.run.start, ...level.run.rewards])].map((key) => lex.type('time', key))
          : KINDS.flatMap((kind) => (level.palette?.[kind] ?? []).map((key) => lex.type(kind, key))),
    }
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, kicker: era.kicker, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  // One idea a level (games/DESIGN.md). What is taught is how a native speaker decides, not the grammar the machine
  // works out: the words are one idea (putting them in places), and each viewpoint is one (its tenses are that
  // viewpoint's models).
  const concept = (type) => {
    const p = lex.part(type)
    if (!p) return type
    return p.kind === 'time' ? `viewpoint:${p.aspect}` : 'words'
  }
  const palettes = new Map(LEVELS.map((L) => [L.id, L.palette]))
  const course = defineCourse({
    levels: LEVELS.map((L) => ({ id: L.id, unlocks: [] })),
    eras,
    // Every word is a primitive: what a player builds in a syntax game is the sentence, not the words.
    primitives: lex.types(),
    adds: (level) => palettes.get(level.id) ?? [],
    // A level's words belong to its sentence and never carry into the next one.
    local: () => true,
    needs: () => null,
    builds: () => [],
    concept,
    machine: (level) => eraOf.get(level.id)?.machine ?? null,
  })
  return { lex, LEVELS, CHAPTERS, course, concept }
}
