// A calculus game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read with its tests; the parts the levels build (each running the board the player
// passed its level's last task with: a packed part that keeps its own registers), and the course the shared audit
// checks.
//
// A test runs as many ticks as its wanted terms are long; every input gives a term for each of those ticks.
// Returns the circuit base's course (../../engine/board-course.js circuitCourse) with the parts parts.json defines (`defs`,
// `defaultsOf`); `wrong` is what reading the
// content found that its schema cannot say (an input with too few terms, outputs of different lengths).
import { circuitCourse } from '../../engine/board-course.js'
import { board } from './board.js'
import { defineParts } from '../../engine/parts/define.js'
import { OPS } from './ops.js'

export function calculusCourse(content) {
  const test = (t, task, say) => {
    const lengths = new Set(Object.values(t.want).map((terms) => terms.length))
    if (lengths.size > 1) say('a test wants outputs of different lengths')
    const ticks = Math.max(0, ...lengths)
    for (const i of task.inputs ?? []) if ((t.inputs?.[i.name]?.length ?? 0) < ticks) say(`a test gives fewer than ${ticks} terms on the input ${i.name}`)
    for (const o of task.outputs ?? []) if (!t.want[o.name]) say(`a test wants nothing of the output ${o.name}`)
    return { inputs: {}, ...t, ticks }
  }
  // The parts are the game's parts.json over the domain's resources.
  const { PARTS, defs, defaultsOf } = defineParts(content.partDefs, OPS)
  return { ...circuitCourse(content, { board, parts: PARTS, test, holds: true }), defs, defaultsOf }
}
