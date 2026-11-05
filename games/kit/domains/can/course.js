// A bus game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be in
// it): the play order and level tree from its eras (../../course.js layout), each level's tests on a bus built from its
// frames and what its outputs must be (wants.js), its hidden tests likewise, its reference board and naive board, the
// parts the levels build (each running the board the player passed it with: a packed part that keeps its own
// registers), and the course the shared audit checks.
//
// A level's tests run as long as their bus; its inputs give one value a tick.
// Returns { LEVELS, CHAPTERS, course, partOf, BUILT, offerIn(level, flags), syncOwn(built), blueprints, wrong }: `wrong`, what
// reading the content found that its schema cannot say (a board that does not read, an output with nothing wanted).
import { packed } from '../../engine/boards.js'
import { defineCourse, eraLevels, layout, offer } from '../../course.js'
import { busOf } from './bus.js'
import { fits, fromText, toText } from './board.js'
import { PARTS } from './parts.js'
import { wantOf } from './wants.js'

// An identifier or a byte as content writes it: a number, or hexadecimal.
const num = (v) => (typeof v === 'string' ? parseInt(v, 16) : v)
const busFrom = ({ frames, ...rest }) => busOf({ ...rest, frames: frames.map((f) => ({ ...f, id: num(f.id), data: (f.data ?? []).map(num) })) })

export function busCourse(content) {
  // The boards the player passed the building levels with, by level id (the shell's progress.built): this content's.
  const OWN = new Map()
  const { eras, primitives, levels, concept = {} } = content
  const wrong = []
  const say = (level, text) => wrong.push(`${level}: ${text}`)
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era])))
  for (const l of levels) if (!eraOf.has(l.id)) say(l.id, 'the level is in no era')

  // Each built part runs the board its level was passed with (while it still fits the level), or the level's reference.
  const BUILT = {}
  const partOf = (type) => PARTS[type] ?? BUILT[type]
  // Every board the content writes as blueprint text, with how it reads back on its level (domain.js blueprints).
  const blueprints = []
  const LEVELS = plan.order.filter((id) => {
    if (!given.has(id)) say(id, 'an era names a level that does not exist')
    return given.has(id)
  }).map((id) => {
    const level = given.get(id)
    const names = level.outputs.map((o) => o.name)
    for (const name of names) if (!level.want[name]) say(id, `nothing is wanted of the output ${name}`)
    for (const name of Object.keys(level.want)) if (!names.includes(name)) say(id, `wants ${name}, which is no output`)
    for (const t of [...level.tests, ...(level.hidden ?? [])]) {
      for (const f of t.bus.frames) if ((f.data ?? []).length > 8) say(id, 'a frame carries at most 8 bytes')
      for (const i of level.inputs ?? []) if (!t.inputs?.[i.name]) say(id, `a test gives nothing on the input ${i.name}`)
    }
    const out = {
      ...level,
      era: eraOf.get(id).id,
      requires: plan.requires.get(id) ?? [],
      adds: level.adds ?? [],
      tests: level.tests.map((t) => ({ ...t, bus: busFrom(t.bus) })),
      hidden: (level.hidden ?? []).map((t) => ({ ...t, bus: busFrom(t.bus) })),
      want: wantOf(level.want),
    }
    const read = (lines, what, naive = false) => {
      try {
        const board = fromText(lines, out, partOf)
        blueprints.push({ level: id, board, write: (b) => toText(b, partOf), read: (text) => fromText(text, out, partOf), ...(naive ? { naive } : {}) })
        return board
      } catch (e) {
        say(id, `${what}: ${e.en ?? String(e)}`)
        return { nodes: [], wires: [] }
      }
    }
    out.solution = read(level.solution, 'the answer')
    if (level.naive) out.naive = read(level.naive, 'the naive answer', true)
    if (level.builds) {
      const fitting = new WeakMap()
      const own = () => {
        const b = OWN.get(id)
        if (!b) return out.solution
        if (!fitting.has(b)) fitting.set(b, fits(b, out, partOf))
        return fitting.get(b) ? b : out.solution
      }
      BUILT[level.builds.type] = packed({
        circuit: own,
        inputs: (level.inputs ?? []).map((i) => i.name),
        outputs: names,
        holds: true,
        built: level.builds,
        // What the part runs, opened on a board: the player's board (or the reference) and the level that builds it.
        opens: () => ({ circuit: own(), level: out }),
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
    primitives,
    adds: (level) => byId.get(level.id)?.adds ?? [],
    needs: (part) => (builderOf.has(part) ? part : null),
    builds: (level) => (byId.get(level.id)?.builds ? [byId.get(level.id).builds.type] : []),
    concept: (part) => concept[part] ?? part,
    naive: (level) => Boolean(byId.get(level.id)?.naive),
    needed: (level) => [...new Set(byId.get(level.id).solution.nodes.map((n) => n.type).filter((t) => !PARTS[t] || primitives.includes(t)))],
    boards: (level) => [byId.get(level.id).solution],
    showcase: (level) => byId.get(level.id)?.showcase ?? null,
    abstraction: true,
  })
  return {
    LEVELS,
    CHAPTERS,
    course,
    partOf,
    BUILT,
    wrong,
    blueprints,
    offerIn: (level, flags) => offer(course, { id: level.id }, new Set(flags)),
    syncOwn: (built = {}) => {
      OWN.clear()
      for (const [id, circuit] of Object.entries(built)) if (circuit?.nodes) OWN.set(id, circuit)
    },
  }
}
