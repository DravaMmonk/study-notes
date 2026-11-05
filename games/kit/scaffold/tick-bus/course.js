// A __name__ game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read with its tests on the line its world says and what its outputs must be
// (wants.js), its hidden tests likewise, its reference board and naive board; the parts the levels build (each running
// the board the player passed its level's last task with: a packed part that keeps its own registers), and the course
// the shared audit checks.
//
// A task's tests run as long as their line; its inputs give one value a tick.
// Returns { LEVELS, played, builtBy(type), CHAPTERS, course, partOf, BUILT, offerIn(level, flags), syncOwn(built),
// blueprints, wrong }: LEVELS, the levels as content writes them with their place in the course; played: level id →
// its tasks read, each the level with the task's fields (and `task`, its index); `wrong`, what reading the content
// found that its schema cannot say (a board that does not read, an output with nothing wanted).
import { circuitCourse } from '../../engine/circuit-domain.js'
import { bitsOf } from './line.js'
import { board, portsOut } from './board.js'
import { PARTS } from './parts.js'
import { wantOf } from './wants.js'

/** A test as content writes it, its line read into values. */
const testOf = (t) => ({ ...t, line: bitsOf(t.line) })

export function __name__Course(content) {
  // A task read: what reading it finds that its schema cannot say, then its line and wants.
  const read = (task, say) => {
    const names = portsOut(task).map((o) => o.name)
    for (const name of names) if (!task.want[name]) say(`nothing is wanted of ${name}`)
    for (const name of Object.keys(task.want)) if (!names.includes(name)) say(`wants ${name}, which is no output`)
    for (const t of [...task.tests, ...(task.hidden ?? [])]) for (const i of task.inputs ?? []) if (!t.inputs?.[i.name]) say(`a test gives nothing on the input ${i.name}`)
    return { ...task, tests: task.tests.map(testOf), hidden: (task.hidden ?? []).map(testOf), want: wantOf(task.want) }
  }
  // A built part keeps its own registers.
  return circuitCourse(content, { board, parts: PARTS, read, holds: true })
}
