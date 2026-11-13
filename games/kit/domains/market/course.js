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
  const kindOf = (t) => (t.shops ? 'street' : t.breaks ? 'break' : t.given ? 'asked' : 'row')
  const test = (t, task, say) => {
    const [ins, outs] = [task.inputs ?? [], task.outputs ?? []].map((list) => list.map((p) => p.name))
    if (kindOf(t) !== kindOf([...(task.tests ?? []), ...(task.hidden ?? [])][0])) say('a task’s tests are all of one kind')
    const cards = (what, sides) => { for (const [side, names] of sides) if (Object.keys(t[side]).sort().join() !== [...names].sort().join()) say(`${what}’s ${side} is not the task’s cards (${names.join(', ')})`) }
    // A row says every card's number and nothing else: what decides a pass is all on the board.
    if (kindOf(t) === 'row') cards('a row', [['in', ins], ['out', outs]])
    // A question holds every answer; what it gives is said in its brief and drawn in its scene, and the board reads
    // none of it. A board of constants answers one question, so a task asks one.
    if (kindOf(t) === 'asked') {
      cards('a question', [['answer', outs]])
      if (ins.length) say('a task that asks has no cards on its left: the player works the answer out')
      if ((task.tests ?? []).length + (task.hidden ?? []).length !== 1) say('a task that asks has the one question')
    }
    // To break a board the player's own gives a street: its three numbers, and nothing to read.
    if (kindOf(t) === 'break') {
      if ([...outs].sort().join() !== 'slope,stock,top' || ins.length) say('a task that breaks a board has the cards stock, top and slope on its right and none on its left')
      return { ...t, suspect: () => suspectOf(t.breaks) }
    }
    if (kindOf(t) !== 'street') return t
    const names = portsOf(t.shops.length)
    const shown = names.flatMap((n) => [n.was, n.left, n.short])
    for (const n of names) if (!outs.includes(n.price)) say(`a test’s street has a shop the task gives no price card (${n.price})`)
    for (const name of ins) if (!shown.includes(name)) say(`the task has a card ${name}, which a test’s street does not show`)
    return t
  }
  const course = circuitCourse(content, { board, parts: PARTS, test })
  /** The board a task breaks and the one it is held against: another task's naive answer and its answer. */
  function suspectOf(id) {
    const of = [...course.played.values()].flat().find((task) => task.taskId === id)
    return of?.naive ? { board: of.naive, honest: of.solution, parts: course.forTask(of).partOf } : null
  }
  for (const task of [...course.played.values()].flat()) for (const t of [...(task.tests ?? []), ...(task.hidden ?? [])]) if (t.breaks && !t.suspect()) course.wrong.push(`${task.taskId}: it breaks ${t.breaks}, which is no task with a naive answer`)
  return course
}
