// A market game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read with its tests; the parts the levels build (each running the board the player
// passed its level's last task with), and the course the shared audit
// checks.
//
// Returns the circuit base's course (../../engine/circuit-domain.js circuitCourse); `wrong` is what reading the
// content found that its schema cannot say (a street whose shops are not the task's cards).
import { circuitCourse } from '../../engine/circuit-domain.js'
import { board } from './board.js'
import { PARTS } from './parts.js'
import { portsOf } from './world.js'

export function marketCourse(content) {
  const test = (t, task, say) => {
    const names = portsOf(t.shops.length)
    const shown = names.flatMap((n) => [n.was, n.left, n.short])
    for (const n of names) if (!(task.outputs ?? []).some((p) => p.name === n.price)) say(`a test’s street has a shop the task gives no price card (${n.price})`)
    for (const p of task.inputs ?? []) if (!shown.includes(p.name)) say(`the task has a card ${p.name}, which a test’s street does not show`)
    return t
  }
  return circuitCourse(content, { board, parts: PARTS, test })
}
