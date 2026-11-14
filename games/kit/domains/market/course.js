// A market game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read with its tests; the parts the levels build (each running the board the player
// passed its level's last task with), and the course the shared audit
// checks.
//
// Returns the circuit base's course (../../engine/board-course.js circuitCourse); `wrong` is what reading the
// content found that its schema cannot say (a street whose shops are not the task's cards).
import { circuitCourse } from '../../engine/board-course.js'
import { board } from './board.js'
import { PARTS } from './parts.js'
import { portsOf } from './world.js'

export function marketCourse(content) {
  const test = (t, task, say) => {
    const [ins, outs] = [task.inputs ?? [], task.outputs ?? []].map((list) => list.map((p) => p.name))
    if (Boolean(t.shops) !== Boolean([...(task.tests ?? []), ...(task.hidden ?? [])][0]?.shops)) say('a task’s tests are rows or streets, not both')
    if (!t.shops) {
      // A row says every card's number and nothing else: what decides a pass is all on the board.
      for (const [side, names] of [['in', ins], ['out', outs]]) if (Object.keys(t[side]).sort().join() !== [...names].sort().join()) say(`a row’s ${side} is not the task’s cards (${names.join(', ')})`)
      return t
    }
    const names = portsOf(t.shops.length)
    const shown = names.flatMap((n) => [n.was, n.left, n.short])
    for (const n of names) if (!outs.includes(n.price)) say(`a test’s street has a shop the task gives no price card (${n.price})`)
    for (const name of ins) if (!shown.includes(name)) say(`the task has a card ${name}, which a test’s street does not show`)
    return t
  }
  return circuitCourse(content, { board, parts: PARTS, test })
}
