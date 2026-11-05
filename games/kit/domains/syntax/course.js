// A syntax game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and level tree from its eras (../../course.js layout), each level with its tasks' sentences
// and answers read into indices (model/sentence.js resolve), its era and what it requires, what it can mark (the roles
// and constructions it has reached), and the course the shared audit checks (npm run check).
//
// syntaxCourse({ eras, levels, concept })
//   eras     game.json's eras: [{ id, machine, title, kicker, question, keeps?, foundation }]
//   levels   [{ id, title, adds?, showcase?, intro?, debrief, tasks }] in any order, its tasks
//            [{ id, step?, brief, hint?, intro?, after?, …sentence }] done in turn (../../engine/tasks.js), where
//            …sentence is one sentence and its answer (model/sentence.js says how they are written)
//   adds     the parts the level brings in: roles ('role:subj') and constructions ('pp'); every part, once brought in,
//            stays for every level after it
//   concept  { part: idea } parts that are one new idea together (the roles of the skeleton, met as they are needed)
// Returns { LEVELS, CHAPTERS, course }: each of LEVELS a new object, the level's fields with its tasks read (each
// with its answer in indices, `gold`); nothing of the content is written to.

import { defineCourse, eraLevels, layout, reach } from '../../course.js'
import { resolve } from './model/sentence.js'
import { PARTS, roleKey } from './model/parts.js'

export function syntaxCourse({ eras, levels, concept = {} }) {
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era])))
  for (const l of levels) if (!eraOf.has(l.id)) throw new Error(`level ${l.id} is in no era`)
  const ordered = plan.order.map((id) => {
    const level = given.get(id)
    if (!level) throw new Error(`an era names a level that does not exist: ${id}`)
    return level
  })
  const course = defineCourse({
    levels: ordered.map((l) => ({ id: l.id, unlocks: [] })),
    eras,
    primitives: PARTS,
    adds: (level) => given.get(level.id)?.adds ?? [],
    needs: () => null,
    builds: () => [],
    concept: (part) => concept[part] ?? part,
    machine: (level) => eraOf.get(level.id)?.machine ?? null,
    // What a level's answer uses: the roles it marks and the constructions it folds, every sentence.
    needed: (level) => given.get(level.id).tasks.flatMap((s) => [...Object.keys(s.roles).map(roleKey), ...(s.folds ?? []).map((f) => f.type)]),
    showcase: (level) => given.get(level.id)?.showcase ?? null,
    abstraction: true,
  })
  const LEVELS = ordered.map((level) => {
    const at = course.levels[course.index.get(level.id)]
    return {
      ...level,
      era: eraOf.get(level.id).id,
      requires: plan.requires.get(level.id) ?? [],
      palette: reach(course, at),
      tasks: level.tasks.map((task) => ({ ...task, gold: resolve(task) })),
    }
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, kicker: era.kicker, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  return { LEVELS, CHAPTERS, course }
}
