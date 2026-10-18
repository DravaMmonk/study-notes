// 视觉完备 as a course (games/kit/course.js): where it starts, and which part each level builds. A node that names an
// `unlock` flag (engine/nodes.js) is built by the first level whose `unlocks` set it; a level's `grants` hand flags out
// without the player building anything (the course audit lists them, and every other broken rule).
import { defineCourse, usable } from '../../../../games/kit/course.js'
import { NODE_TYPES } from '../engine/nodes.js'
import { LEVELS } from './index.js'

/** The parts the course starts from: the first circuit level's arithmetic. */
export const PRIMITIVES = ['scale', 'offset', 'add', 'sub']

const byId = new Map(LEVELS.map((l) => [l.id, l]))
/** The parts that need one of these flags. */
const partsFor = (flags) => Object.keys(NODE_TYPES).filter((t) => flags.includes(NODE_TYPES[t].unlock))

export const course = defineCourse({
  levels: LEVELS.map((l) => ({ id: l.id, unlocks: l.unlocks ?? [] })),
  primitives: PRIMITIVES,
  palette: (l) => byId.get(l.id).palette ?? [],
  needs: (p) => NODE_TYPES[p]?.unlock ?? null,
  builds: (l) => partsFor(l.unlocks),
  granted: (l) => partsFor(byId.get(l.id).grants ?? []),
})

/** The parts a level can really offer a player holding `flags` (the shell's: unlocks of solved levels, and grants). */
export const usableIn = (level, flags) => usable(course, { id: level.id }, flags)
