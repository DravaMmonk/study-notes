// A linear game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read with its tests, its reference board and naive board; the parts the levels build
// (each running the board the player passed its level's last task with, a packed part) and the course the shared audit
// checks.
//
// Returns { LEVELS, played, builtBy(type), CHAPTERS, course, partOf, BUILT, defs, defaultsOf, offerIn(level, flags),
// syncOwn(built), blueprints, wrong }: defs, the game's parts as parts.json defines them (../../engine/parts/define.js); LEVELS, the levels as content writes them with their place in the course; played: level id →
// its tasks read, each the level with the task's fields (and `task`, its index); `wrong`, what reading the content
// found that its schema cannot say (a board that does not read, an output no test expects).
import { circuitCourse } from '../../engine/circuit-domain.js'
import { board } from './board.js'
import { defineParts } from '../../engine/parts/define.js'
import { OPS } from './ops.js'
import { fromContent } from './values.js'

export function linearCourse(content) {
  // The game's parts, as its parts.json defines them over the domain's engine resources.
  const { PARTS, defs, defaultsOf } = defineParts(content.partDefs, OPS)
  // A test read: what it gives and expects of every input and output, each made a value on the wires (values.js).
  const test = (t, task, say) => {
    for (const o of task.outputs) if (t.expect[o.name] === undefined) say(`a test expects nothing of the output ${o.name}`)
    for (const i of task.inputs) if (t.inputs[i.name] === undefined) say(`a test gives nothing on the input ${i.name}`)
    const read = (values) => Object.fromEntries(Object.entries(values).map(([name, v]) => {
      if (Array.isArray(v) && Array.isArray(v[0]) && v.some((row) => row.length !== v[0].length)) say(`${name}: the rows of a matrix differ in length`)
      return [name, fromContent(v)]
    }))
    return { ...t, inputs: read(t.inputs), expect: read(t.expect) }
  }
  return { ...circuitCourse(content, { board, parts: PARTS, test }), defs, defaultsOf }
}
