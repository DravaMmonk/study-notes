// A course of sentence-analysis levels, from a game's spec (《句法之图》): the play order and level tree from its eras
// (../../../course.js layout), each level with its sentence and answer read into indices (sentence.js resolve), its era
// and what it requires, what it can mark (the roles and constructions it has reached), and the course the shared audit
// checks (npm run check).
//
// syntaxCourse({ eras, levels })
//   eras     [{ id, machine, title, kicker?, question?, keeps?, foundation, topics?, challenges? }]
//   levels   [{ id, title, brief, hint?, intro?, adds?, showcase?, debrief: { title, body, note }, …sentence }] in any
//            order, where …sentence is one sentence and its answer (sentence.js says how they are written), or
//            `tasks: [{ step, brief, hint?, intro?, after?, …sentence }]`, several sentences done in turn
//   adds     the parts the level brings in: roles ('role:subj') and constructions ('pp'); every part, once brought in,
//            stays for every level after it
// Returns { LEVELS, CHAPTERS, course, concept, PARTS }.

import { defineCourse, eraLevels, layout, reach } from '../../../course.js'
import { resolve } from './sentence.js'
import { ROLES, TYPES, roleKey } from './types.js'

/** Every part a level can bring in. */
export const PARTS = [...Object.keys(ROLES).map(roleKey), ...Object.keys(TYPES)]

export function syntaxCourse({ eras, levels }) {
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era])))
  for (const l of levels) if (!eraOf.has(l.id)) throw new Error(`level ${l.id} is in no era`)
  const ordered = plan.order.map((id) => {
    const level = given.get(id)
    if (!level) throw new Error(`an era names a level that does not exist: ${id}`)
    return level
  })
  // The roles of the skeleton are one idea, met as they are needed; each construction is one of its own.
  const concept = (part) => (part.startsWith('role:') ? 'skeleton' : part)
  const course = defineCourse({
    levels: ordered.map((l) => ({ id: l.id, unlocks: [] })),
    eras,
    primitives: PARTS,
    adds: (level) => given.get(level.id)?.adds ?? [],
    needs: () => null,
    builds: () => [],
    concept,
    machine: (level) => eraOf.get(level.id)?.machine ?? null,
    showcase: (level) => given.get(level.id)?.showcase ?? null,
  })
  const LEVELS = ordered.map((level) => {
    const at = course.levels[course.index.get(level.id)]
    const sentences = (level.tasks ?? [level]).map((t) => ({ ...t, gold: resolve(t) }))
    return {
      ...level,
      era: eraOf.get(level.id).id,
      requires: plan.requires.get(level.id) ?? [],
      palette: reach(course, at),
      ...(level.tasks ? { tasks: sentences } : { gold: sentences[0].gold }),
    }
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, kicker: era.kicker, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  return { LEVELS, CHAPTERS, course, concept, PARTS }
}
