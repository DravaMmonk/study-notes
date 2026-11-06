// Small vision contents written for the unit tests (games/DESIGN.md: unit tests never read a real game's levels).
// Each builder returns a fresh object, so a test may change what it gets without cloning.
//
//   game({ levels, primitives?, eras?, concept? })  a content as content.js assembles one; one era by default, its
//                                                   levels in order; primitives default to every part a level adds
//   level(id, tasks, more?)                         a level of one task or several
//   circuit(id, fields?)                            a circuit task, ports written as names (or { name, type })
//   builds(type, more?)                             what a level builds
//   FIXTURE_PARTS, PARTS                            a parts.json defining a part on every engine resource (every
//                                                   fixture game has it), and those parts with the fixed cards
//   PRIMITIVES                                      those parts as a course read gives them to a board (no part
//                                                   built): what board.fromText reads on outside a course
import { readFileSync } from 'node:fs'
import { primitivesOnly } from '../../engine/circuit-domain.js'
import { defineParts } from '../../engine/parts/define.js'
import { OPS } from './ops.js'
import { board } from './board.js'

export const FIXTURE_PARTS = JSON.parse(readFileSync(new URL('./fixture-parts.json', import.meta.url), 'utf8'))
const defined = defineParts(FIXTURE_PARTS, OPS).PARTS
export const PARTS = { ...board.FIXED_PARTS, ...defined }
export const PRIMITIVES = primitivesOnly(board, defined)

/** One text in both languages. */
export const T = (en) => ({ zh: en, en })

const port = (p) => (typeof p === 'string' ? { name: p, label: T(p) } : { label: T(p.name), ...p })

export const circuit = (id, { inputs = ['a', 'b'], outputs = ['out'], tests = [], hidden = [], ...rest } = {}) => ({
  id, kind: 'circuit', brief: T(id), inputs: inputs.map(port), outputs: outputs.map(port), tests, hidden, ...rest,
})

export const level = (id, tasks, more = {}) => ({ id, title: T(id), tasks: Array.isArray(tasks) ? tasks : [tasks], ...more })

export const builds = (type, more = {}) => ({ type, name: T(type), desc: T(type), ...more })

const addsOf = (levels) => [...new Set(levels.flatMap((l) => [...(l.adds ?? []), ...l.tasks.flatMap((t) => t.adds ?? [])]))]

export function game({ levels, primitives = addsOf(levels), eras, concept = {} }) {
  return {
    id: 'fixture', domain: 'vision', vocabulary: 1, title: T('Fixture'), kicker: T('Test'), lede: T('Test'),
    primitives, concept,
    eras: eras ?? [{ id: 0, title: T('Era'), question: T('Question'), foundation: levels.map((l) => l.id) }],
    levels, glossary: { groups: [], entries: [] }, partDefs: FIXTURE_PARTS,
  }
}
