// A course of 《车在说话》 levels from a game's spec: the play order and level tree from its eras (../../course.js layout),
// each level's tests on a bus built from its frames, the parts the levels build (each running the board the player
// passed it with: a packed part that keeps its own registers), and the course the shared audit checks.
//
// busCourse({ eras, levels })
//   levels  in any order: { id, title, brief, hint?, intro?, after?, note?, adds?: [part], listens?: true (the bus
//           card), inputs?: [{ name, label }], outputs: [{ name, label }], tests: [{ bus: { idle?, frames, tail? },
//           inputs? }], want(test) → { output name: [value per tick] }, solution(board, partOf) → circuit,
//           builds?: { type, name, desc } }
//           A level's tests run as long as their bus; its inputs give one value a tick.
// Returns { LEVELS, CHAPTERS, course, partOf, BUILT, offerIn(level, flags), syncOwn(built) }.
import { packed } from '../../engine/boards.js'
import { defineCourse, eraLevels, layout, offer } from '../../course.js'
import { busOf } from './bus.js'
import { board } from './build.js'
import { PARTS, PRIMITIVES } from './parts.js'

/** The boards the player passed the building levels with, by level id (the shell's progress.built). */
const OWN = new Map()

export function busCourse({ eras, levels }) {
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era])))
  for (const l of levels) if (!eraOf.has(l.id)) throw new Error(`level ${l.id} is in no era`)

  // Each built part runs the board its level was passed with, or the level's reference board.
  const BUILT = {}
  const partOf = (type) => PARTS[type] ?? BUILT[type]
  const LEVELS = plan.order.map((id) => {
    const level = given.get(id)
    if (!level) throw new Error(`an era names a level that does not exist: ${id}`)
    const out = {
      ...level,
      era: eraOf.get(id).id,
      requires: plan.requires.get(id) ?? [],
      adds: level.adds ?? [],
      tests: level.tests.map((t) => ({ ...t, bus: busOf(t.bus) })),
    }
    out.solution = level.solution((nodes, wires) => board(out, nodes, wires, partOf))
    if (level.builds) {
      BUILT[level.builds.type] = packed({
        circuit: () => OWN.get(id) ?? out.solution,
        inputs: (level.inputs ?? []).map((i) => i.name),
        outputs: level.outputs.map((o) => o.name),
        holds: true,
        built: level.builds,
      })
    }
    return out
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  const byId = new Map(LEVELS.map((L) => [L.id, L]))
  const builderOf = new Map(LEVELS.filter((L) => L.builds).map((L) => [L.builds.type, L]))
  const course = defineCourse({
    levels: LEVELS.map((L) => ({ id: L.id, unlocks: L.builds ? [L.builds.type] : [] })),
    eras,
    primitives: PRIMITIVES,
    adds: (level) => byId.get(level.id)?.adds ?? [],
    needs: (part) => (builderOf.has(part) ? part : null),
    builds: (level) => (byId.get(level.id)?.builds ? [byId.get(level.id).builds.type] : []),
    // A register is read and kept by two cards: one idea.
    concept: (part) => (part === 'keep' ? 'reg' : part),
    needed: (level) => [...new Set(byId.get(level.id).solution.nodes.map((n) => n.type).filter((t) => !PARTS[t] || PRIMITIVES.includes(t)))],
    abstraction: true,
  })
  return {
    LEVELS,
    CHAPTERS,
    course,
    partOf,
    BUILT,
    offerIn: (level, flags) => offer(course, { id: level.id }, new Set(flags)),
    syncOwn: (built = {}) => {
      OWN.clear()
      for (const [id, circuit] of Object.entries(built)) if (circuit?.nodes) OWN.set(id, circuit)
    },
  }
}
