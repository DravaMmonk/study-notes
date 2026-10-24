// A course of image levels, from a game's spec: the play order and the tree from its eras (../../course.js layout),
// each level with the image domain's defaults, its palette in the order the player meets parts, the ways of drawing
// a picture it has met so far, and the packed parts its solved circuits become (engine/own.js).
import { defineCourse, layout, offer, reach, usable } from '../../course.js'
import { NODE_TYPES } from './engine/nodes.js'
import { OWN, ownPart } from './engine/own.js'

// A palette lists the parts the level brings in first (marked 新), then the ones carried from earlier levels; each group
// puts the constant and the four kinds of arithmetic first, then the rest in the order they were met.
const ARITHMETIC = ['const', 'add', 'sub', 'mul', 'arith', 'merge']

/**
 * spec: {
 *   eras        the course's eras (games/DESIGN.md 2)
 *   chapters    [{ id, title, lecture, question }], one per era
 *   levels      every level, in any order (the eras give the order)
 *   views       { view: level id } the level each way of drawing a picture comes with (pixels is there from the start)
 *   primitives  the parts no circuit builds
 *   concept     { part: idea } parts that are one new idea together
 *   replaces    { part: [part] } the parts a part supersedes once met (the four kinds of arithmetic, merged into one)
 * }
 * A level names only the parts it brings in (`adds`): every part met or built before it carries into it, and what it
 * folds away (`fold`); see ../../course.js reach and offer.
 * Returns { CHAPTERS, LEVELS, levelById, course, usableIn(level, flags), offerIn(level, flags), syncOwn(progress) }.
 */
export function imageCourse({ eras, chapters, levels, views = {}, primitives, concept = {}, replaces = {} }) {
  const plan = layout(eras)
  const byIdAll = Object.fromEntries(levels.map((level) => [level.id, level]))
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
  const LEVELS = plan.order.map((id) => {
    const level = byIdAll[id]
    if (!level) throw new Error(`route names a level that does not exist: ${id}`)
    return { kind: 'graph', inputs: ['in'], outputs: ['out'], grants: [], adds: [], check: { tolerance: 0.02 }, ...level, ...viewsAt(id), unlocks: unlocksOf(level), requires: requires.get(id) ?? [], carry: carry.get(id) }
  })
  for (const level of levels) if (!LEVELS.some((l) => l.id === level.id)) throw new Error(`level ${level.id} is not on the route`)
  const levelById = Object.fromEntries(LEVELS.map((level) => [level.id, level]))
  const CHAPTERS = chapters.map((chapter) => ({ ...chapter, track: plan.tracks.get(chapter.id) }))

  // A level that packs its circuit offers it as a part once solved: the player's own passing circuit, from the board
  // played on that level or, when that one has not passed, from one of its other saved boards (shell/slots.js).
  for (const level of LEVELS) if (level.packs) NODE_TYPES[`own-${level.id}`] = ownPart(level)
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

  // A node that names an `unlock` flag is built by the first level whose `unlocks` set it; a level's `grants` hand
  // flags out without the player building anything (the course audit lists them).
  const partsFor = (flags) => Object.keys(NODE_TYPES).filter((t) => flags.includes(NODE_TYPES[t].unlock))
  const course = defineCourse({
    levels: LEVELS.map((l) => ({ id: l.id, unlocks: l.unlocks ?? [] })),
    eras,
    concept: (p) => concept[p] ?? p,
    naive: (l) => Boolean(levelById[l.id].naive),
    primitives,
    adds: (l) => levelById[l.id].adds,
    needs: (p) => NODE_TYPES[p]?.unlock ?? null,
    builds: (l) => partsFor(l.unlocks),
    granted: (l) => partsFor(levelById[l.id].grants ?? []),
    replaces: (p) => replaces[p] ?? [],
    // The probe level's black boxes stay in their level.
    carries: (p) => !p.startsWith('mystery'),
    needed: (l) => levelById[l.id].solution?.nodes.map((n) => n.type) ?? null,
    folds: (l) => levelById[l.id].fold ?? [],
  })
  // A circuit level's palette is everything it can hold (../../course.js reach): the parts it brings in, then the
  // carried ones; a board or probe level has only what it brings in.
  const arithmeticFirst = (list) => [...ARITHMETIC.filter((type) => list.includes(type)), ...list.filter((type) => !ARITHMETIC.includes(type))]
  for (const level of LEVELS) {
    const carried = level.kind === 'graph' ? reach(course, level).filter((type) => !level.adds.includes(type)) : []
    level.fresh = level.adds
    level.palette = [...arithmeticFirst(level.adds), ...arithmeticFirst(carried)]
  }
  /** The parts a level can really offer a player holding `flags` (the shell's: unlocks of solved levels, and grants). */
  const usableIn = (level, flags) => usable(course, { id: level.id }, flags)
  /** Everything the player has for a level: what it shows, and what it folds away ({ shown, folded }). */
  const offerIn = (level, flags) => offer(course, { id: level.id }, flags)

  return { CHAPTERS, LEVELS, levelById, course, usableIn, offerIn, syncOwn }
}
