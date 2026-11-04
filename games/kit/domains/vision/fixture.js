// Small vision contents written for the unit tests (games/DESIGN.md: unit tests never read a real game's levels).
// Each builder returns a fresh object, so a test may change what it gets without cloning.
//
//   game({ levels, primitives?, eras?, concept? })  a content as content.js assembles one; one era by default, its
//                                                   levels in order; primitives default to every part a level adds
//   level(id, tasks, more?)                         a level of one task or several
//   circuit(id, fields?)                            a circuit task, ports written as names (or { name, type })
//   builds(type, more?)                             what a level builds

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
    saves: [], levels, glossary: { groups: [], entries: [] },
  }
}
