// A course of image levels, from a game's spec: the play order and the tree from its eras (../../course.js layout),
// each level with the image domain's defaults, its palette in the order the player meets parts, the ways of drawing
// a picture it has met so far, and the packed parts its solved circuits become (engine/own.js).
import { defineCourse, layout, offer, usable } from '../../course.js'
import { NODE_TYPES } from './engine/nodes.js'
import { OWN, ownPart } from './engine/own.js'

// A palette lists the parts new to the player first (offered by no level this one comes after, marked 新), then the
// constant and the four kinds of arithmetic, then the rest as the level gives them.
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
 * A level may fold away parts of its palette (`fold`); see ../../course.js offer.
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
  const ordered = (id, palette = []) => {
    const seen = new Set([...before(id)].flatMap((a) => byIdAll[a]?.palette ?? []))
    const fresh = palette.filter((type) => !seen.has(type))
    const rest = palette.filter((type) => seen.has(type))
    const arithmeticFirst = (list) => [...ARITHMETIC.filter((type) => list.includes(type)), ...list.filter((type) => !ARITHMETIC.includes(type))]
    return { palette: [...arithmeticFirst(fresh), ...arithmeticFirst(rest)], fresh }
  }
  // A topic level after the first starts from the player's own circuit for the level before it, when that level is a
  // circuit too.
  const carry = new Map(eras.flatMap((era) => (era.topics ?? []).flatMap((t) => t.levels.slice(1).map((id, i) => [id, t.levels[i]]))).filter(([, from]) => byIdAll[from]?.kind !== 'board'))
  // Pictures start out drawn as pixels; every other way of drawing them comes in with a level, as parts do.
  const viewsAt = (id) => ({
    shows: ['pixels', ...Object.keys(views).filter((view) => views[view] === id || before(id).has(views[view]))],
    freshViews: Object.keys(views).filter((view) => views[view] === id),
  })

  const LEVELS = plan.order.map((id) => {
    const level = byIdAll[id]
    if (!level) throw new Error(`route names a level that does not exist: ${id}`)
    return { kind: 'graph', inputs: ['in'], outputs: ['out'], grants: [], check: { tolerance: 0.02 }, ...level, ...ordered(id, level.palette), ...viewsAt(id), unlocks: [...(level.unlocks ?? []), ...(level.packs ? [`own-${id}`] : [])], requires: requires.get(id) ?? [], carry: carry.get(id) }
  })
  for (const level of levels) if (!LEVELS.some((l) => l.id === level.id)) throw new Error(`level ${level.id} is not on the route`)
  const levelById = Object.fromEntries(LEVELS.map((level) => [level.id, level]))
  const CHAPTERS = chapters.map((chapter) => ({ ...chapter, track: plan.tracks.get(chapter.id) }))

  // A level that packs its circuit offers it as a part once solved: the player's own passing circuit.
  for (const level of LEVELS) if (level.packs) NODE_TYPES[`own-${level.id}`] = ownPart(level)
  const syncOwn = (progress) => {
    for (const level of LEVELS) {
      if (!level.packs) continue
      const data = progress.solved.includes(level.id) ? progress.data[level.id] : null
      const circuit = data?.passed ?? data
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
    palette: (l) => levelById[l.id].palette ?? [],
    needs: (p) => NODE_TYPES[p]?.unlock ?? null,
    builds: (l) => partsFor(l.unlocks),
    granted: (l) => partsFor(levelById[l.id].grants ?? []),
    replaces: (p) => replaces[p] ?? [],
    // The probe level's black boxes stay in their level.
    carries: (p) => !p.startsWith('mystery'),
    needed: (l) => levelById[l.id].solution?.nodes.map((n) => n.type) ?? null,
    folds: (l) => levelById[l.id].fold ?? [],
  })
  /** The parts a level can really offer a player holding `flags` (the shell's: unlocks of solved levels, and grants). */
  const usableIn = (level, flags) => usable(course, { id: level.id }, flags)
  /** Everything the player has for a level: what it shows, and what it folds away ({ shown, folded }). */
  const offerIn = (level, flags) => offer(course, { id: level.id }, flags)

  return { CHAPTERS, LEVELS, levelById, course, usableIn, offerIn, syncOwn }
}
