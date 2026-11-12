// A calculus game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read with its tests; the parts the levels build (each running the board the player
// passed its level's last task with: a packed part that keeps its own registers), and the course the shared audit
// checks.
//
// A test runs as many ticks as its wanted terms are long; every input gives a term for each of those ticks.
// Returns the circuit base's course (../../engine/circuit-domain.js circuitCourse); `wrong` is what reading the
// content found that its schema cannot say (an input with too few terms, outputs of different lengths).
import { circuitCourse } from '../../engine/circuit-domain.js'
import { board } from './board.js'
import { PARTS } from './parts.js'
import { CLAIMS, claimName } from './proof.js'

export function calculusCourse(content) {
  const test = (t, task, say) => {
    if (Boolean(t.want) === Boolean(t.check)) say('a test needs either wanted terms or an interval claim')
    const name = t.check && claimName(t.check)
    const claim = name && CLAIMS[name]
    if (name && !claim) say(`unknown interval claim ${name}`)
    const lengths = new Set(Object.values(t.want ?? t.inputs ?? {}).map((terms) => terms.length))
    if (lengths.size > 1) say('a test gives sequences of different lengths')
    const ticks = Math.max(0, ...lengths)
    if (!ticks) say('a test needs at least one tick')
    for (const i of task.inputs ?? []) if ((t.inputs?.[i.name]?.length ?? 0) < ticks) say(`a test gives fewer than ${ticks} terms on the input ${i.name}`)
    if (t.want) for (const o of task.outputs ?? []) if (!t.want[o.name]) say(`a test wants nothing of the output ${o.name}`)
    if (claim) {
      const names = (ports) => ports.map((p) => p.name).sort().join(',')
      if (names(task.inputs ?? []) !== [...claim.inputs].sort().join(',') || names(task.outputs ?? []) !== [...claim.outputs].sort().join(',')) say(`${name} expects inputs ${claim.inputs.join(', ')} and outputs ${claim.outputs.join(', ')}`)
      for (let tick = 0; tick < ticks; tick += 1) {
        const input = Object.fromEntries(claim.inputs.map((name) => [name, t.inputs?.[name]?.[tick]]))
        if (!claim.valid(input)) say(`${name} has invalid input at tick ${tick}`)
      }
    }
    return { inputs: {}, ...t, ticks }
  }
  return circuitCourse(content, { board, parts: PARTS, test, holds: true })
}
