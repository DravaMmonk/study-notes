// A game's course on the net domain, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says
// what may be in it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read with its tests — what arrives on each wire in (wire.js: the sender's segments,
// the wire's delay, the flips), the inputs, the queue — and what its outputs and wires out must be (wants.js), its
// hidden tests likewise, its reference board and naive board; the parts the levels build (each running the board the
// player passed its level's last task with: a packed part that keeps its own registers, its ports that task's wires,
// inputs and outputs), and the course the shared audit checks.
//
// A test runs for `ticks` ticks, by default until two ticks after the last thing it gives arrives.
// Returns the course read (../../engine/board-course.js circuitCourse): LEVELS, played (level id → its tasks read),
// CHAPTERS, course, partOf, BUILT, offerIn, opening, carried, syncOwn, blueprints, and `wrong`, what reading the content
// found that its schema cannot say.
import { circuitCourse } from '../../engine/board-course.js'
import { arrived, said } from './wire.js'
import { board } from './board.js'
import { PARTS } from './parts.js'
import { wantOf } from './wants.js'

/** A test as content writes it, run out: what arrives on each wire in, tick by tick, and how many ticks it runs. */
function testOf(level, t) {
  const sent = Object.fromEntries((level.wires?.in ?? []).map((w) => [w.name, said(t.wires?.[w.name]?.send ?? [])]))
  const delay = (name) => level.wires.in.find((w) => w.name === name).delay ?? 0
  const longest = Math.max(0, ...Object.entries(sent).map(([name, bits]) => bits.length + delay(name)), ...Object.values(t.inputs ?? {}).map((v) => v.length))
  const ticks = t.ticks ?? longest + 2
  const wires = Object.fromEntries(Object.entries(sent).map(([name, bits]) => [name, arrived(bits, { delay: delay(name), flips: t.wires?.[name]?.flips ?? [] }, ticks)]))
  return { ...t, ticks, wires, inputs: t.inputs ?? {}, queue: t.queue ?? [] }
}

/** The inputs a task's queue fills, which no test gives. */
const pulledOf = (task) => (task.pulls ? [task.pulls.input, task.pulls.last].filter(Boolean) : [])

export function netCourse(content) {
  // A task read: what reading it finds that its schema cannot say, then its wants.
  const read = (task, say) => {
    if (task.pulls) {
      for (const name of pulledOf(task)) if (!(task.inputs ?? []).some((i) => i.name === name)) say(`it pulls into ${name}, which is no input`)
      if (!(task.outputs ?? []).some((o) => o.name === task.pulls.next)) say(`it asks for the next byte on ${task.pulls.next}, which is no output`)
    }
    if (task.works && (!task.wires?.in?.length || task.inputs?.length || task.pulls)) say('a task that gives works reads wires in only: a check is the bits arriving on them')
    return { ...task, want: wantOf(task.want) }
  }
  // A test read: what reading it finds that its schema cannot say, then the test run out.
  const test = (t, task, say) => {
    for (const i of task.inputs ?? []) if (!pulledOf(task).includes(i.name) && !t.inputs?.[i.name]) say(`a test gives nothing on the input ${i.name}`)
    for (const name of Object.keys(t.wires ?? {})) if (!(task.wires?.in ?? []).some((w) => w.name === name)) say(`a test sends on ${name}, which is no wire in`)
    if (task.pulls && !t.queue) say('a test gives the board no queue to pull from')
    return testOf(task, t)
  }
  // A built part keeps its own registers; a part may replace the ones its level makes redundant. The output that asks
  // for the next byte of the queue is wanted of nothing.
  const builders = new Map(content.levels.filter((L) => L.builds).map((L) => [L.builds.type, L]))
  return circuitCourse(content, { board, parts: PARTS, read, test, holds: true, replaces: (part) => builders.get(part)?.builds.replaces ?? [], unwanted: (task) => (task.pulls ? [task.pulls.next] : []) })
}
