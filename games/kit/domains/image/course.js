// An image game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): every task of every level made playable from its data (tests from its scene, boards from their blueprints, a
// bench's model, a budget's check), the play order and the tree from its eras (../../course.js layout), each task with
// the image domain's defaults, its level's palette in the order the player meets parts, the ways of drawing a picture
// it has met so far, and the packed parts its solved circuits become (engine/own.js).
import { defineCourse, eraLevels, holds, itemOf, layout, offer, reach, readItem } from '../../course.js'
import { taskLevels } from '../../engine/tasks.js'
import { builtPieces, publications } from '../../engine/pieces.js'
import { trayIn } from '../../engine/trays.js'
import { imageDefinitions } from './engine/definitions.js'
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
 * once met }, mode: 'notes' for a notes edition (every level open, no audit).
 * A level is a list of tasks (../../engine/tasks.js), each read as the level with the task's fields over it. A level
 * names only the parts it brings in (`adds`) and the tray it plays with (`tray`): every part met or built before it
 * carries into it, as far as its tray lists it; see ../../course.js reach and offer. What a task unlocks, the tasks after it hold at once (`opens`); a
 * level that shows a new part alone says why (`showcase`). A flag a level unlocks, gives for itself (`grants`) or
 * keeps from a task (`withhold`) stands for every item that needs it (engine/nodes.js `unlock`: a part, one of its
 * settings, one option of a choice); what a task holds of them is the kernel's rule (../../course.js holds).
 * Returns { CHAPTERS, LEVELS, levelById, course, kit, intros, offerIn(level, flags), holdsIn(level, flags),
 * syncOwn(progress), blueprints }: each of LEVELS the fields its level says once, its place in the course and its
 * tasks as they play (`tasks`, each with its key); kit the image engine over the course's own part table
 * (engine/kit.js: NODE_TYPES and the parts its levels pack), so two courses read in one process never run each other's
 * packed parts. All of it is built anew: nothing that came from the content is written to.
 */
export function imageCourse({ eras, levels, views = {}, primitives, trays, concept = {}, replaces = {}, mode, partDefs }) {
  // A notes edition (games/DESIGN.md 12.1) opens every level.
  const notes = mode === 'notes'
  const plan = layout(eras, { notes })
  // Levels are read in play order: a task a built piece of parts.json refers to makes that piece a part
  // (engine/own.js) before the levels after it, whose boards may hold it, are read.
  const content = Object.fromEntries(levels.map((level) => [level.id, level]))
  const definitions = imageDefinitions(partDefs)
  const { types } = definitions
  const kit = { ...imageKit(types), ...definitions }
  const pieces = builtPieces(partDefs)
  const published = new Map()
  for (const p of publications(pieces)) published.set(p.task, [...(published.get(p.task) ?? []), p.type])
  // The circuits the player passed the publishing tasks with, by task id (syncOwn).
  const own = new Map()
  // The task that publishes each built piece, as played.
  const builders = new Map()
  // Every level's tasks made playable, by level id.
  const played = new Map()
  const blueprints = []
  for (const id of plan.order) {
    if (!content[id]) throw new Error(`route names a level that does not exist: ${id}`)
    const tasks = taskLevels(content[id]).map((task) => playable(task, kit, (bp) => blueprints.push({ level: id, task: task.task, key: task.taskId, ...bp })))
    played.set(id, tasks)
    // A built piece runs the board of the task it refers to.
    for (const task of tasks) for (const type of published.get(task.taskId) ?? []) {
      if (task.kind !== 'graph') throw new Error(`parts.json's ${type} runs task ${task.taskId}, a ${task.kind}, no circuit`)
      types[type] = ownPart(task, type, pieces[type], () => own.get(task.taskId) ?? task.solution, types)
      builders.set(type, task)
    }
  }
  for (const p of publications(pieces)) if (!builders.has(p.type)) throw new Error(`parts.json's ${p.type} runs task ${p.task}, which no level has`)
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

  // What a task unlocks: the flags its level names, and the pieces it publishes.
  const unlocksOf = (task) => [...(task.unlocks ?? []), ...(published.get(task.taskId) ?? [])]
  // A task as the shell plays it (../../shell/GameShell.jsx): the domain's defaults under it, its level's place in the
  // course, its key and name (`step`, from the content's task `given`), and what it opens for the tasks after it. A level
  // unlocks what any of its tasks does, and is of its last task's kind.
  const read = (id, task, given) => ({ inputs: ['in'], outputs: ['out'], adds: [], check: { tolerance: 0.02 }, ...task, chapter: chapterOf.get(id), ...viewsAt(id), unlocks: unlocksOf(task), requires: requires.get(id) ?? [], carry: carry.get(id), step: given.step, optional: given.optional ?? false, opens: given.unlocks ?? [], key: task.taskId })
  const placed = plan.order.map((id) => {
    const { tasks, intro: _, ...once } = content[id]
    const all = played.get(id).map((task, k) => read(id, task, tasks[k]))
    return { ...once, id, levelUnlocks: once.unlocks ?? [], kind: all.at(-1).kind, chapter: chapterOf.get(id), requires: requires.get(id) ?? [], adds: once.adds ?? [], unlocks: [...new Set([...(once.unlocks ?? []), ...all.flatMap((t) => t.unlocks)])], tasks: all }
  })
  for (const level of levels) if (!placed.some((l) => l.id === level.id)) throw new Error(`level ${level.id} is not on the route`)
  const placedById = Object.fromEntries(placed.map((level) => [level.id, level]))
  const CHAPTERS = eras.map((era) => ({ id: era.id, ...era.chapter, track: plan.tracks.get(era.id) }))

  // A built piece runs the player's own passing circuit once solved, from the board played on the task it refers to
  // or, when that one has not passed, from one of the task's other saved boards (shell/slots.js).
  const syncOwn = (progress) => {
    for (const { id, taskId: key } of builders.values()) {
      const data = progress.solved.includes(id) ? progress.data[key] : null
      const waiting = progress.slots?.[key]?.list.find((slot) => slot.data?.passed)?.data
      const circuit = progress.built?.[key] ?? data?.passed ?? waiting?.passed ?? data
      if (circuit?.nodes) own.set(key, circuit)
      else own.delete(key)
    }
  }

  // A node that names an `unlock` flag is built by the first level whose `unlocks` set it.
  const partsFor = (flags) => Object.keys(types).filter((t) => flags.includes(types[t].unlock))
  // The flag an item needs (../../course.js items): a part's, a setting's, or an option's of a choice.
  const flagOf = (item) => {
    const { part, key, value } = readItem(item)
    if (key === undefined) return types[part]?.unlock ?? null
    const param = types[part]?.params?.find((p) => p.key === key)
    return (value === undefined ? param?.unlock : param?.options?.find((o) => String(o[0]) === value)?.[2]) ?? null
  }
  // Every item that needs one of some flags.
  const needing = new Map()
  for (const [type, spec] of Object.entries(types)) {
    const items = [type, ...(spec.params ?? []).flatMap((p) => [itemOf(type, p.key), ...(p.options ?? []).map((o) => itemOf(type, p.key, String(o[0])))])]
    for (const item of items) if (flagOf(item)) needing.set(flagOf(item), [...(needing.get(flagOf(item)) ?? []), item])
  }
  const itemsFor = (flags = []) => flags.flatMap((flag) => needing.get(flag) ?? [])
  // The flags a level's tasks up to task k have unlocked by then; its last task's passing unlocks the level's own.
  const unlockedBy = (level, k) => [...level.tasks.slice(0, k + 1).flatMap((task) => [...task.opens, ...(published.get(task.key) ?? [])]), ...(k === level.tasks.length - 1 ? level.levelUnlocks : [])]
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
    needs: flagOf,
    builds: (l) => partsFor(l.task === undefined ? placedById[l.id].unlocks : unlockedBy(placedById[l.id], l.task)),
    gives: (l) => itemsFor(placedById[l.id].grants),
    withholds: (l) => itemsFor(placedById[l.id].tasks[l.task]?.withhold),
    replaces: (p) => replaces[p] ?? [],
    needed: (l) => (answers(l).length ? answers(l).flatMap((s) => s.nodes.map((n) => n.type)) : null),
    boards: answers,
    showcase: (l) => placedById[l.id].showcase ?? null,
    abstraction: true,
    notes,
  })
  // A circuit level's palette is everything it can hold (../../course.js reach), in its tray's order; a board or probe
  // level has only what it brings in. Its tasks hold the same.
  const LEVELS = placed.map((level) => {
    const tray = { fresh: level.adds, palette: level.kind === 'graph' ? reach(course, level) : level.adds }
    return { ...level, ...tray, tasks: level.tasks.map((task) => ({ ...task, ...tray })) }
  })
  const levelById = Object.fromEntries(LEVELS.map((level) => [level.id, level]))
  // A level as the screens play it is one of its tasks (`task`, its index).
  const at = (level) => ({ id: level.id, task: level.task })
  /** Everything a player holding `flags` (the shell's: the unlocks of solved levels and of the tasks before it) has for a task: what it shows, and what it folds away ({ shown, folded }). */
  const offerIn = (level, flags) => offer(course, at(level), flags)
  /** Whether a task holds a part, one of its settings or one option of a choice: has(part), has(part, key), has(part, key, value). */
  const holdsIn = (level, flags) => holds(course, at(level), flags)

  /** The task a built piece runs, as the screens play it; the pieces a task (by its key) publishes. */
  const builtBy = (type) => (builders.has(type) ? levelById[builders.get(type).id].tasks[builders.get(type).task] : null)
  const publishedBy = (key) => published.get(key) ?? []

  return { CHAPTERS, LEVELS, levelById, course, kit, intros, offerIn, holdsIn, syncOwn, builtBy, publishedBy, pieces, blueprints }
}
