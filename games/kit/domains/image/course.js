// An image game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): every task of every level made playable from its data (tests from its scene, boards from their blueprints, a
// bench's model, a budget's check), the play order and the tree from its eras (../../course.js layout), each task with
// the image domain's defaults, its level's palette in the order the player meets parts, the ways of drawing a picture
// it has met so far, and the packed parts its solved circuits become (engine/own.js).
import { defineCourse, eraLevels, layout, offer, reach, usable } from '../../course.js'
import { taskLevels } from '../../engine/tasks.js'
import { trayIn } from '../../engine/trays.js'
import { NODE_TYPES } from './engine/nodes.js'
import { ownPart } from './engine/own.js'
import { imageKit } from './engine/kit.js'
import { picture } from './items/pictures.js'
import { testsOf } from './items/scenes/index.js'
import { constraintOf } from './items/constraints.js'
import { benchOf } from './items/benches.js'

// A palette lists the parts the level brings in first (marked 新), then the ones carried from earlier levels; each group
// puts the constant and the four kinds of arithmetic first, then the rest in the order they were met.

/**
 * A circuit task as the level runs take it: its tests, boards and budget made from their data.
 * kit: the course's (engine/kit.js); keep({ board, write, read, naive? }) hears of every board read from blueprint text
 * (domain.js blueprints).
 */
function circuit({ scene, setup, tests, hidden, solution, naive, alsoFails, constraint, ...rest }, kit, keep) {
  const io = { inputs: rest.inputs ?? ['in'], outputs: rest.outputs ?? ['out'] }
  const spec = { ...io, scene, setup }
  const read = (lines) => kit.fromText(lines, io)
  const board = (lines, wrong = false) => {
    const b = read(lines)
    keep({ board: b, write: kit.toText, read, ...(wrong ? { naive: true } : {}) })
    return b
  }
  return {
    ...rest,
    tests: testsOf(spec, tests),
    ...(hidden && { hidden: testsOf(spec, hidden) }),
    ...(solution && { solution: board(solution) }),
    ...(naive && { naive: board(naive, true) }),
    ...(alsoFails && { alsoFails: alsoFails.map((lines) => board(lines, true)) }),
    ...(constraint && { constraint: constraintOf(constraint) }),
  }
}

/** A task as its screen and the checks take it, its level's fields under its own (`intro` stays with the content);
 *  keep as for circuit. */
function playable({ intro: _, ...task }, kit, keep) {
  if (task.kind === 'probe') return { ...task, probes: task.probes.map((p) => [p.label, picture(p.picture)]) }
  if (task.kind === 'board') return { ...task, board: task.bench.model, ...benchOf(task.bench) }
  return circuit(task, kit, keep)
}

/**
 * content: { eras (games/DESIGN.md 2: each with its chapter { title, lecture, question }), levels (in any order: the
 * eras give the order), views: { view: level id } the level each way of drawing a picture comes with (pixels is there
 * from the start), primitives (the parts no circuit builds), trays: { tray: [part] } (../../course.js trays),
 * concept: { part: idea } parts that are one new idea together, replaces: { part: [part] } the parts a part supersedes
 * once met }.
 * A level is a list of tasks (../../engine/tasks.js), each read as the level with the task's fields over it. A level
 * names only the parts it brings in (`adds`) and the tray it plays with (`tray`): every part met or built before it
 * carries into it, as far as its tray lists it; see ../../course.js reach and offer. What a task unlocks, the tasks after it hold at once (`opens`); a
 * level that shows a new part alone says why (`showcase`).
 * Returns { CHAPTERS, LEVELS, levelById, course, kit, intros, usableIn(level, flags), offerIn(level, flags),
 * syncOwn(progress), blueprints }: each of LEVELS the fields its level says once, its place in the course and its
 * tasks as they play (`tasks`, each with its key); kit the image engine over the course's own part table
 * (engine/kit.js: NODE_TYPES and the parts its levels pack), so two courses read in one process never run each other's
 * packed parts. All of it is built anew: nothing that came from the content is written to.
 */
export function imageCourse({ eras, levels, views = {}, primitives, trays, concept = {}, replaces = {} }) {
  const plan = layout(eras)
  // Levels are read in play order: a level that packs its circuit is a part (engine/own.js) before the levels after
  // it, whose boards may hold it, are read.
  const content = Object.fromEntries(levels.map((level) => [level.id, level]))
  const types = { ...NODE_TYPES }
  const kit = imageKit(types)
  // The circuits the player passed the packing levels with, by level id (syncOwn).
  const own = new Map()
  // Every level's tasks made playable, by level id.
  const played = new Map()
  const blueprints = []
  for (const id of plan.order) {
    if (!content[id]) throw new Error(`route names a level that does not exist: ${id}`)
    const tasks = taskLevels(content[id]).map((task) => playable(task, kit, (bp) => blueprints.push({ level: id, task: task.task, key: task.taskId, ...bp })))
    played.set(id, tasks)
    // The part a level packs runs its last task's board.
    const last = tasks.at(-1)
    if (content[id].packs && last.kind !== 'graph') throw new Error(`level ${id} packs its circuit, but its last task is a ${last.kind}, no circuit`)
    if (content[id].packs) types[`own-${id}`] = ownPart(last, () => own.get(id) ?? last.solution, types)
  }
  const intros = Object.fromEntries(levels.map((level) => [level.id, level.intro]))
  const chapterOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era.id])))
  const { requires } = plan

  // Everything a level comes after: what it requires, and what those require in turn.
  const ancestors = new Map()
  const before = (id) => {
    if (!ancestors.has(id)) ancestors.set(id, new Set((requires.get(id) ?? []).flatMap((r) => [r, ...before(r)])))
    return ancestors.get(id)
  }
  // A topic level after the first starts from the player's own circuit for the level before it, when that level is a
  // circuit too.
  const carry = new Map(eras.flatMap((era) => (era.topics ?? []).flatMap((t) => t.levels.slice(1).map((id, i) => [id, t.levels[i]]))).filter(([, from]) => played.get(from)?.at(-1).kind !== 'board'))
  // Pictures start out drawn as pixels; every other way of drawing them comes in with a level, as parts do.
  const viewsAt = (id) => ({
    shows: ['pixels', ...Object.keys(views).filter((view) => views[view] === id || before(id).has(views[view]))],
    freshViews: Object.keys(views).filter((view) => views[view] === id),
  })

  const unlocksOf = (level) => [...(level.unlocks ?? []), ...(level.packs ? [`own-${level.id}`] : [])]
  // A task as the shell plays it (../../shell/GameShell.jsx): the domain's defaults under it, its level's place in the
  // course, its key and name (`step`, from the content's task `given`), and what it opens for the tasks after it. A level
  // unlocks what any of its tasks does, and is of its last task's kind.
  const read = (id, task, given) => ({ inputs: ['in'], outputs: ['out'], adds: [], check: { tolerance: 0.02 }, ...task, chapter: chapterOf.get(id), ...viewsAt(id), unlocks: unlocksOf(task), requires: requires.get(id) ?? [], carry: carry.get(id), step: given.step, optional: given.optional ?? false, opens: given.unlocks ?? [], key: task.taskId })
  const placed = plan.order.map((id) => {
    const { tasks, intro: _, ...once } = content[id]
    const all = played.get(id).map((task, k) => read(id, task, tasks[k]))
    return { ...once, id, levelUnlocks: unlocksOf({ ...once, id }), kind: all.at(-1).kind, chapter: chapterOf.get(id), requires: requires.get(id) ?? [], adds: once.adds ?? [], unlocks: [...new Set([...unlocksOf({ ...once, id }), ...all.flatMap((t) => t.unlocks)])], tasks: all }
  })
  for (const level of levels) if (!placed.some((l) => l.id === level.id)) throw new Error(`level ${level.id} is not on the route`)
  const placedById = Object.fromEntries(placed.map((level) => [level.id, level]))
  const CHAPTERS = eras.map((era) => ({ id: era.id, ...era.chapter, track: plan.tracks.get(era.id) }))

  // A level that packs its circuit offers it as a part once solved: the player's own passing circuit, from the board
  // played on its last task or, when that one has not passed, from one of the task's other saved boards (shell/slots.js).
  const syncOwn = (progress) => {
    for (const level of placed) {
      if (!level.packs) continue
      const { key } = level.tasks.at(-1)
      const data = progress.solved.includes(level.id) ? progress.data[key] : null
      const waiting = progress.slots?.[key]?.list.find((slot) => slot.data?.passed)?.data
      const circuit = data?.passed ?? waiting?.passed ?? data
      if (circuit?.nodes) own.set(level.id, circuit)
      else own.delete(level.id)
    }
  }

  // A node that names an `unlock` flag is built by the first level whose `unlocks` set it.
  const partsFor = (flags) => Object.keys(types).filter((t) => flags.includes(types[t].unlock))
  // Every task's answer counts: a part only the first task of a level uses is used.
  const answers = (l) => placedById[l.id].tasks.map((t) => t.solution).filter((s) => s?.nodes)
  const course = defineCourse({
    levels: placed.map((l) => ({ id: l.id, unlocks: l.unlocks })),
    eras,
    trays,
    tray: (l) => trayIn(trays, placedById[l.id].tray),
    concept: (p) => concept[p] ?? p,
    naive: (l) => placedById[l.id].tasks.some((t) => t.naive),
    primitives,
    adds: (l) => placedById[l.id].adds,
    needs: (p) => types[p]?.unlock ?? null,
    builds: (l) => partsFor(l.unlocks),
    granted: (l) => partsFor(placedById[l.id].grants ?? []),
    replaces: (p) => replaces[p] ?? [],
    needed: (l) => (answers(l).length ? answers(l).flatMap((s) => s.nodes.map((n) => n.type)) : null),
    boards: answers,
    showcase: (l) => placedById[l.id].showcase ?? null,
    abstraction: true,
  })
  // A circuit level's palette is everything it can hold (../../course.js reach), in its tray's order; a board or probe
  // level has only what it brings in. Its tasks hold the same.
  const LEVELS = placed.map((level) => {
    const tray = { fresh: level.adds, palette: level.kind === 'graph' ? reach(course, level) : level.adds }
    return { ...level, ...tray, tasks: level.tasks.map((task) => ({ ...task, ...tray })) }
  })
  const levelById = Object.fromEntries(LEVELS.map((level) => [level.id, level]))
  /** The parts a level can really offer a player holding `flags` (the shell's: unlocks of solved levels, and grants). */
  const usableIn = (level, flags) => usable(course, { id: level.id }, flags)
  /** Everything the player has for a level: what it shows, and what it folds away ({ shown, folded }). */
  const offerIn = (level, flags) => offer(course, { id: level.id }, flags)

  return { CHAPTERS, LEVELS, levelById, course, kit, intros, usableIn, offerIn, syncOwn, blueprints }
}
