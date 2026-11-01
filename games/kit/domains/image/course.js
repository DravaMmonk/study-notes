// An image game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): every level made playable from its data (tests from its scene, boards from their blueprints, a bench's
// model, a budget's check), the play order and the tree from its eras (../../course.js layout), each level with the
// image domain's defaults, its palette in the order the player meets parts, the ways of drawing a picture it has met
// so far, and the packed parts its solved circuits become (engine/own.js).
import { defineCourse, eraLevels, layout, offer, reach, usable } from '../../course.js'
import { NODE_TYPES } from './engine/nodes.js'
import { OWN, ownPart } from './engine/own.js'
import { fromText } from './engine/board.js'
import { picture } from './items/pictures.js'
import { testsOf } from './items/scenes/index.js'
import { constraintOf } from './items/constraints.js'
import { benchOf } from './items/benches.js'

// A palette lists the parts the level brings in first (marked 新), then the ones carried from earlier levels; each group
// puts the constant and the four kinds of arithmetic first, then the rest in the order they were met.
const ARITHMETIC = ['const', 'add', 'sub', 'mul', 'arith', 'merge']

/** A circuit level (or one task of one) as the level runs take it: its tests, boards and budget made from their data. */
function circuit({ scene, setup, tests, hidden, solution, naive, alsoFails, constraint, ...rest }) {
  const io = { inputs: rest.inputs ?? ['in'], outputs: rest.outputs ?? ['out'] }
  const spec = { ...io, scene, setup }
  const board = (lines) => fromText(lines, io)
  return {
    ...rest,
    tests: testsOf(spec, tests),
    ...(hidden && { hidden: testsOf(spec, hidden) }),
    ...(solution && { solution: board(solution) }),
    ...(naive && { naive: board(naive) }),
    ...(alsoFails && { alsoFails: alsoFails.map(board) }),
    ...(constraint && { constraint: constraintOf(constraint) }),
  }
}

/** A level as its screen and the checks take it (`intro` stays with the content). */
export function playable({ intro, ...level }) {
  if (level.kind === 'probe') return { ...level, probes: level.probes.map((p) => [p.label, picture(p.picture)]) }
  if (level.kind === 'board') return { ...level, board: level.bench.model, ...benchOf(level.bench) }
  if (!level.tasks) return circuit(level)
  // A task's board has the level's inputs and outputs unless it says otherwise.
  const { tasks, ...base } = level
  const io = Object.fromEntries(['inputs', 'outputs'].filter((k) => base[k]).map((k) => [k, base[k]]))
  return { ...base, tasks: tasks.map((task) => circuit({ ...io, ...task })) }
}

/**
 * content: { eras (games/DESIGN.md 2: each with its chapter { title, lecture, question }), levels (in any order: the
 * eras give the order), views: { view: level id } the level each way of drawing a picture comes with (pixels is there
 * from the start), primitives (the parts no circuit builds), concept: { part: idea } parts that are one new idea
 * together, replaces: { part: [part] } the parts a part supersedes once met }.
 * A level names only the parts it brings in (`adds`): every part met or built before it carries into it, and what it
 * folds away (`fold`); see ../../course.js reach and offer.
 * A level may be several tasks in order (`tasks: [{ step, brief, tests, hidden, solution, unlocks?, withhold?, … }]`):
 * each task is the level with what it changes, and a level that shows a new part alone says why (`showcase`).
 * Returns { CHAPTERS, LEVELS, levelById, course, intros, usableIn(level, flags), offerIn(level, flags), syncOwn(progress) }.
 */
export function imageCourse({ eras, levels, views = {}, primitives, concept = {}, replaces = {} }) {
  const plan = layout(eras)
  // Levels are made playable in play order: a level that packs its circuit is a part (engine/own.js) before the levels
  // after it, whose boards may hold it, are read.
  const content = Object.fromEntries(levels.map((level) => [level.id, level]))
  const byIdAll = {}
  for (const id of plan.order) {
    if (!content[id]) throw new Error(`route names a level that does not exist: ${id}`)
    const level = playable(content[id])
    byIdAll[id] = level
    if (level.packs) NODE_TYPES[`own-${id}`] = ownPart(level)
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
  const carry = new Map(eras.flatMap((era) => (era.topics ?? []).flatMap((t) => t.levels.slice(1).map((id, i) => [id, t.levels[i]]))).filter(([, from]) => byIdAll[from]?.kind !== 'board'))
  // Pictures start out drawn as pixels; every other way of drawing them comes in with a level, as parts do.
  const viewsAt = (id) => ({
    shows: ['pixels', ...Object.keys(views).filter((view) => views[view] === id || before(id).has(views[view]))],
    freshViews: Object.keys(views).filter((view) => views[view] === id),
  })

  const unlocksOf = (level) => [...(level.unlocks ?? []), ...(level.packs ? [`own-${level.id}`] : [])]
  const read = (id, level) => ({ kind: 'graph', inputs: ['in'], outputs: ['out'], adds: [], check: { tolerance: 0.02 }, ...level, chapter: chapterOf.get(id), ...viewsAt(id), unlocks: unlocksOf(level), requires: requires.get(id) ?? [], carry: carry.get(id) })
  // A level of several tasks (`tasks`, ../../shell/GameShell.jsx) is read task by task, each the level with what the
  // task changes; the last is the level itself. What a task unlocks, the tasks after it hold at once (`opens`); the
  // level unlocks all of it, and brings in every part any task brings in.
  const LEVELS = plan.order.map((id) => {
    const level = byIdAll[id]
    if (!level.tasks) return read(id, level)
    const { tasks, ...base } = level
    const all = tasks.map((task, k) => ({ ...read(id, { ...base, ...task }), opens: task.unlocks ?? [], task: k }))
    return { ...all.at(-1), unlocks: [...new Set([...unlocksOf(base), ...all.flatMap((t) => t.unlocks)])], adds: [...new Set(all.flatMap((t) => t.adds))], tasks: all }
  })
  for (const level of levels) if (!LEVELS.some((l) => l.id === level.id)) throw new Error(`level ${level.id} is not on the route`)
  const levelById = Object.fromEntries(LEVELS.map((level) => [level.id, level]))
  const CHAPTERS = eras.map((era) => ({ id: era.id, ...era.chapter, track: plan.tracks.get(era.id) }))

  // A level that packs its circuit offers it as a part once solved: the player's own passing circuit, from the board
  // played on that level or, when that one has not passed, from one of its other saved boards (shell/slots.js).
  const syncOwn = (progress) => {
    for (const level of LEVELS) {
      if (!level.packs) continue
      const data = progress.solved.includes(level.id) ? progress.data[level.id] : null
      const waiting = progress.slots?.[level.id]?.list.find((slot) => slot.data?.passed)?.data
      const circuit = data?.passed ?? waiting?.passed ?? data
      if (circuit?.nodes) OWN.set(level.id, circuit)
      else OWN.delete(level.id)
    }
  }

  // A node that names an `unlock` flag is built by the first level whose `unlocks` set it.
  const partsFor = (flags) => Object.keys(NODE_TYPES).filter((t) => flags.includes(NODE_TYPES[t].unlock))
  const course = defineCourse({
    levels: LEVELS.map((l) => ({ id: l.id, unlocks: l.unlocks ?? [] })),
    eras,
    concept: (p) => concept[p] ?? p,
    naive: (l) => (levelById[l.id].tasks ?? [levelById[l.id]]).some((t) => t.naive),
    primitives,
    adds: (l) => levelById[l.id].adds,
    needs: (p) => NODE_TYPES[p]?.unlock ?? null,
    builds: (l) => partsFor(l.unlocks),
    granted: (l) => partsFor(levelById[l.id].grants ?? []),
    replaces: (p) => replaces[p] ?? [],
    // Every task's answer counts: a part only the first task of a level uses is used.
    needed: (l) => {
      const answers = (levelById[l.id].tasks ?? [levelById[l.id]]).map((t) => t.solution).filter((s) => s?.nodes)
      return answers.length ? answers.flatMap((s) => s.nodes.map((n) => n.type)) : null
    },
    boards: (l) => (levelById[l.id].tasks ?? [levelById[l.id]]).map((t) => t.solution).filter((s) => s?.nodes),
    folds: (l) => levelById[l.id].fold ?? [],
    showcase: (l) => levelById[l.id].showcase ?? null,
    abstraction: true,
  })
  // A circuit level's palette is everything it can hold (../../course.js reach): the parts it brings in, then the
  // carried ones; a board or probe level has only what it brings in.
  const arithmeticFirst = (list) => [...ARITHMETIC.filter((type) => list.includes(type)), ...list.filter((type) => !ARITHMETIC.includes(type))]
  for (const level of LEVELS) {
    const carried = level.kind === 'graph' ? reach(course, level).filter((type) => !level.adds.includes(type)) : []
    level.fresh = level.adds
    level.palette = [...arithmeticFirst(level.adds), ...arithmeticFirst(carried)]
    for (const task of level.tasks ?? []) Object.assign(task, { fresh: level.fresh, palette: level.palette })
  }
  /** The parts a level can really offer a player holding `flags` (the shell's: unlocks of solved levels, and grants). */
  const usableIn = (level, flags) => usable(course, { id: level.id }, flags)
  /** Everything the player has for a level: what it shows, and what it folds away ({ shown, folded }). */
  const offerIn = (level, flags) => offer(course, { id: level.id }, flags)

  return { CHAPTERS, LEVELS, levelById, course, intros, usableIn, offerIn, syncOwn }
}
