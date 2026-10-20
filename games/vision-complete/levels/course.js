// 视觉完备 as a course (games/kit/course.js): where it starts, and which part each level builds. A node that names an
// `unlock` flag (engine/nodes.js) is built by the first level whose `unlocks` set it; a level's `grants` hand flags out
// without the player building anything (the course audit lists them, and every other broken rule).
import { defineCourse, usable } from '../../kit/course.js'
import { NODE_TYPES } from '../../kit/domains/image/engine/nodes.js'
import { LEVELS } from './index.js'
import { ERAS } from './route.js'

/** The parts no circuit can build: arithmetic, a few functions, averaging, the trip to the frequency domain and the
 *  learnable numbers. Each is new where it is first offered. */
export const PRIMITIVES = ['const', 'add', 'sub', 'mul', 'arith', 'merge', 'sqrt', 'exp', 'globalMax', 'fqApply', 'lrnConst', 'learn3', 'lrnConv', 'warp', 'zeroUp', 'argmin4', 'dg_encode', 'dg_decode', 'dg_mu', 'dg_sigma', 'dg_sample']
// Parts that are one idea: the four kinds of arithmetic and the constant, and the learnable kernel with or without a
// random start.
const CONCEPT = { const: 'arithmetic', add: 'arithmetic', sub: 'arithmetic', mul: 'arithmetic', arith: 'arithmetic', lrnConv: 'learn3', dg_encode: 'autoencoder', dg_decode: 'autoencoder', dg_encoder: 'autoencoder', dg_decoder: 'autoencoder', dg_mu: 'latent', dg_sigma: 'latent', dg_sample: 'latent' }

const byId = new Map(LEVELS.map((l) => [l.id, l]))
/** The parts that need one of these flags. */
const partsFor = (flags) => Object.keys(NODE_TYPES).filter((t) => flags.includes(NODE_TYPES[t].unlock))

export const course = defineCourse({
  levels: LEVELS.map((l) => ({ id: l.id, unlocks: l.unlocks ?? [] })),
  eras: ERAS,
  concept: (p) => CONCEPT[p] ?? p,
  naive: (l) => Boolean(byId.get(l.id).naive),
  primitives: PRIMITIVES,
  palette: (l) => byId.get(l.id).palette ?? [],
  needs: (p) => NODE_TYPES[p]?.unlock ?? null,
  builds: (l) => partsFor(l.unlocks),
  granted: (l) => partsFor(byId.get(l.id).grants ?? []),
})

/** The parts a level can really offer a player holding `flags` (the shell's: unlocks of solved levels, and grants). */
export const usableIn = (level, flags) => usable(course, { id: level.id }, flags)
