// An image game's course, from its course configuration and content package ( vocabulary.js says what may be
// in it): every task of every level made playable from its data (tests from its scene, boards from their blueprints, a
// bench's model, a budget's check), the play order and the tree from its eras (../../course.js layout), each task with
// the image domain's defaults, its level's palette in the order the player meets parts, the ways of drawing a picture
// it has met so far, and the packed parts its solved circuits become (engine/own.js).
import { defineCourse, eraLevels, holds, offer, reach, readItem } from '../../course.js'
import { courseLayout } from '../../engine/course-dependencies.js'
import { taskLevels } from '../../engine/tasks.js'
import { keptBoards } from '../../engine/kept-boards.js'
import { fitsCircuit } from '../../engine/board-view.js'
import { workshopOf } from '../../circuit/workshop-view.js'
import { builtPieces, publications } from '../../engine/pieces.js'
import { trayIn } from '../../engine/trays.js'
import { gridProbe } from '../../engine/grid-probe.js'
import { imageDefinitions } from './engine/definitions.js'
import { ownPart } from './engine/own.js'
import { NODE_TYPES } from './engine/nodes.js'
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
  const examples = testsOf(spec, tests)
  const read = (lines) => kit.fromText(lines, { ...io, tests: examples })
  const board = (lines, wrong = false) => {
    const b = read(lines)
    keep({ board: b, write: kit.toText, read, ...(wrong ? { naive: true } : {}) })
    return b
  }
  return {
    ...rest,
    tests: examples,
    ...(hidden && { hidden: testsOf(spec, hidden) }),
    ...(solution && { solution: board(solution) }),
    ...(naive && { naive: board(naive, true) }),
    ...(alsoFails && { alsoFails: alsoFails.map((lines) => board(lines, true)) }),
    ...(constraint && { constraint: constraintOf(constraint, kit.types) }),
  }
}

/** A task as its screen and the checks take it, its level's fields under its own (`intro` stays with the content);
 *  keep as for circuit. */
function playable({ intro: _, ...task }, kit, keep) {
  if (task.kind === 'probe') {
    const { probes, part, question, answers, answer, wrong, ...rest } = task
    const examples = probes.map(({ label, picture: source }) => ({ label, input: picture(source) }))
    const run = (input) => (part.includes('/') ? kit.types[part] : NODE_TYPES[part]).eval({ in: input })
    const { verify, ...probe } = gridProbe({ examples, run, question, answers, answer, wrong })
    return { ...rest, probe, verify }
  }
  if (task.kind === 'board') return { ...task, board: task.bench.model, ...benchOf(task.bench) }
  return circuit(task, kit, keep)
}

/**
 * content: { eras (games/DESIGN.md 2: each with its chapter { title, label, question }), levels (in any order: the
 * eras give the order), views: { view: level id } the level each way of drawing a picture comes with (pixels is there
 * from the start), primitives (the parts no circuit builds), trays: { tray: { name, desc, items } } (../../course.js trays),
 * concept: { part: idea } parts that are one new idea together, replaces: { part: [part] } the parts a part supersedes
 * once met }, mode: 'notes' for a notes edition (every level open, no audit).
 * A level is a list of tasks (../../engine/tasks.js), each read as the level with the task's fields over it. A level
 * names only the parts it brings in (`adds`) and the tray it plays with (`tray`): every part met or built before it
 * carries into it, as far as its tray lists it; see ../../course.js reach and offer. What a task unlocks, the tasks after it hold at once (`opens`); a
 * level that shows a new part alone says why (`showcase`). A flag a level unlocks, gives for itself (`gives`) or
 * keeps from a task (`withholds`) stands for every item that needs it (engine/nodes.js `unlock`: a part, one of its
 * settings, one option of a choice); what a task holds of them is the kernel's rule (../../course.js holds).
 * Returns { CHAPTERS, LEVELS, levelById, course, kit, intros, offerIn(level, flags), holdsIn(level, flags),
 * syncOwn(built), blueprints }: each of LEVELS the fields its level says once, its place in the course and its
 * tasks as they play (`tasks`, each with its key); kit the image engine over the course's own part table
 * (engine/kit.js: NODE_TYPES and the parts its levels pack), so two courses read in one process never run each other's
 * packed parts. All of it is built anew: nothing that came from the content is written to.
 */
export function imageCourse(config) {
  const { eras, levels, views = {}, primitives, trays, concept = {}, replaces = {}, mode, partDefs } = config
  // A notes edition (games/DESIGN.md 12.1) opens every level.
  const notes = mode === 'notes'
  const plan = courseLayout(config)
  // Register every package implementation before reading tasks that can place it.
  const content = Object.fromEntries(levels.map((level) => [level.id, level]))
  const definitions = imageDefinitions(partDefs)
  const { types } = definitions
  const kit = { ...imageKit(types), ...definitions }
  const pieces = builtPieces(partDefs)
  const published = new Map()
  const implementations = publications(levels, pieces)
  for (const { task, type } of implementations) if (task) published.set(task, [...(published.get(task) ?? []), type])
  const publishingTasks = new Map()
  const own = keptBoards((key, board) => {
    const task = publishingTasks.get(key)
    const workshop = workshopOf(board)
    return task && (workshop ? fitsCircuit(board, task, workshop.view) : kit.fits(board, task))
  })
  // The task that publishes each built piece, as played.
  const builders = new Map()
  // Every level's tasks made playable, by level id.
  const played = new Map()
  const blueprints = []
  const references = new Map()
  for (const { type, task, reference } of implementations) {
    if (references.has(type)) throw new Error(`image piece ${type} must have one implementation`)
    const io = { inputs: reference.inputs ?? ['in'], outputs: reference.outputs ?? ['out'] }
    let circuit
    const board = () => (circuit ??= kit.fromText(reference.solution, io))
    references.set(type, { task: { ...reference, ...io }, board })
    types[type] = ownPart(io, type, pieces[type], () => own.board(task) ?? board(), types)
  }
  for (const id of plan.order) {
    if (!content[id]) throw new Error(`route names a level that does not exist: ${id}`)
    const tasks = taskLevels(content[id]).map((task) => playable(task, kit, (bp) => blueprints.push({ level: id, task: task.task, key: task.taskId, ...bp })))
    played.set(id, tasks)
    // A publishing task can supply the player's board over the reference implementation.
    for (const task of tasks) for (const type of published.get(task.taskId) ?? []) {
      if (task.kind !== 'graph') throw new Error(`pieces.json's ${type} runs task ${task.taskId}, a ${task.kind}, no circuit`)
      builders.set(type, task)
      publishingTasks.set(task.taskId, task)
    }
  }
  for (const { board } of references.values()) board()
  const chapterOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era.id])))
  // The intros of the levels the course places: the rest of the package is not in the game.
  const intros = Object.fromEntries(levels.filter((level) => chapterOf.has(level.id)).map((level) => [level.id, level.intro]))
  const { requires } = plan

  // Everything a level comes after: what it requires, and what those require in turn.
  const ancestors = new Map()
  const before = (id) => {
    if (!ancestors.has(id)) ancestors.set(id, new Set((requires.get(id) ?? []).flatMap((r) => [r, ...before(r)])))
    return ancestors.get(id)
  }
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
  const read = (id, task, given) => ({ inputs: ['in'], outputs: ['out'], adds: [], check: { tolerance: 0.02 }, ...task, chapter: chapterOf.get(id), ...viewsAt(id), unlocks: unlocksOf(task), requires: requires.get(id) ?? [], carry: content[id].carry, step: given.step, optional: given.optional ?? false, opens: given.unlocks ?? [], key: task.taskId })
  const placed = plan.order.map((id) => {
    const { tasks, intro: _, ...once } = content[id]
    const all = played.get(id).map((task, k) => read(id, task, tasks[k]))
    return { ...once, id, levelUnlocks: once.unlocks ?? [], kind: all.at(-1).kind, chapter: chapterOf.get(id), requires: requires.get(id) ?? [], adds: once.adds ?? [], unlocks: [...new Set([...(once.unlocks ?? []), ...all.flatMap((t) => t.unlocks)])], tasks: all }
  })
  const placedById = Object.fromEntries(placed.map((level) => [level.id, level]))
  const CHAPTERS = eras.map((era) => ({ id: era.id, ...era.chapter, track: plan.tracks.get(era.id), rows: plan.rows.get(era.id) }))

  // A node that names an `unlock` flag is built by the first level whose `unlocks` set it.
  const partsFor = (flags) => Object.keys(types).filter((t) => flags.includes(types[t].unlock))
  // The flag an item needs (../../course.js items): a part's, a setting's, or an option's of a choice.
  const flagOf = (item) => {
    const { part, key, value } = readItem(item)
    if (key === undefined) return types[part]?.unlock ?? null
    const param = types[part]?.params?.find((p) => p.key === key)
    return (value === undefined ? param?.unlock : param?.options?.find((o) => String(o[0]) === value)?.[2]) ?? null
  }
  // The flags a level's tasks up to task k have unlocked by then; its last task's passing unlocks the level's own.
  const unlockedBy = (level, k) => [...level.tasks.slice(0, k + 1).flatMap((task) => [...task.opens, ...(published.get(task.key) ?? [])]), ...(k === level.tasks.length - 1 ? level.levelUnlocks : [])]
  // Every task's answer counts: a part only the first task of a level uses is used.
  const answers = (l) => placedById[l.id].tasks.filter((task, k) => l.task === undefined || l.task === k).map((t) => t.solution).filter((s) => s?.nodes)
  const course = defineCourse({
    complete: config.levels.every((level) => plan.place.has(level.id)),
    levels: placed.map((l) => ({ id: l.id, unlocks: l.unlocks })),
    eras,
    plan,
    trays,
    tray: (l) => trayIn(trays, placedById[l.id].tray),
    concept: (p) => concept[p] ?? p,
    primitives,
    adds: (l) => placedById[l.id].adds,
    needs: flagOf,
    builds: (l) => partsFor(l.task === undefined ? placedById[l.id].unlocks : unlockedBy(placedById[l.id], l.task)),
    gives: (l) => [...(content[l.id].gives ?? []), ...(content[l.id].tasks[l.task]?.gives ?? [])],
    withholds: (l) => content[l.id].tasks[l.task]?.withholds ?? [],
    opens: (l) => content[l.id].tasks.flatMap((task, i) => l.task === undefined || i <= l.task ? task.opens ?? [] : []),
    replaces: (p) => replaces[p] ?? [],
    featured: (l) => [...(content[l.id].featuredParts ?? []), ...(content[l.id].tasks[l.task]?.featuredParts ?? [])],
    needed: (l) => (answers(l).length ? answers(l).flatMap((s) => s.nodes.map((n) => n.type)) : null),
    boards: answers,
    carries: (l) => content[l.id].carry ? [content[l.id].carry] : [],
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

  const referenceOf = (type) => references.get(type)?.task ?? null

  return { CHAPTERS, LEVELS, levelById, course, kit, intros, offerIn, holdsIn, syncOwn: own.sync, builtBy, referenceOf, publishedBy, pieces, blueprints }
}
