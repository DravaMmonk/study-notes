// A game's course on the net domain, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says
// what may be in it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read with its tests — what arrives on each wire in (wire.js: the sender's segments,
// the wire's delay, the flips), the inputs, the queue — and what its outputs and wires out must be (wants.js), its
// hidden tests likewise, its reference board and naive board; the parts the levels build (each running the board the
// player passed its level's last task with: a packed part that keeps its own registers, its ports that task's wires,
// inputs and outputs), and the course the shared audit checks.
//
// A test runs for `ticks` ticks, by default until two ticks after the last thing it gives arrives.
// Returns the course read (../../engine/circuit-domain.js circuitCourse): LEVELS, played (level id → its tasks read),
// CHAPTERS, course, partOf, BUILT, offerIn, opening, carried, syncOwn, blueprints, and `wrong`, what reading the content
// found that its schema cannot say.
import { circuitCourse } from '../../engine/circuit-domain.js'
import { arrived, said } from './wire.js'
import { board, portsIn, portsOut } from './board.js'
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

export function netCourse(content) {
  // A task read: what reading it finds that its schema cannot say, then its tests run out and its wants.
  const read = (task, say) => {
    const names = portsOut(task).map((o) => o.name)
    const pulled = task.pulls ? [task.pulls.input, task.pulls.last].filter(Boolean) : []
    if (task.pulls) {
      for (const name of pulled) if (!(task.inputs ?? []).some((i) => i.name === name)) say(`it pulls into ${name}, which is no input`)
      if (!(task.outputs ?? []).some((o) => o.name === task.pulls.next)) say(`it asks for the next byte on ${task.pulls.next}, which is no output`)
    }
    for (const name of names) if (!task.want[name] && name !== task.pulls?.next) say(`nothing is wanted of ${name}`)
    for (const name of Object.keys(task.want)) if (!names.includes(name)) say(`wants ${name}, which is no output and no wire out`)
    for (const t of [...task.tests, ...(task.hidden ?? [])]) {
      for (const i of task.inputs ?? []) if (!pulled.includes(i.name) && !t.inputs?.[i.name]) say(`a test gives nothing on the input ${i.name}`)
      for (const name of Object.keys(t.wires ?? {})) if (!(task.wires?.in ?? []).some((w) => w.name === name)) say(`a test sends on ${name}, which is no wire in`)
      if (task.pulls && !t.queue) say('a test gives the board no queue to pull from')
    }
    return { ...task, tests: task.tests.map((t) => testOf(task, t)), hidden: (task.hidden ?? []).map((t) => testOf(task, t)), want: wantOf(task.want) }
  }
  // A built part keeps its own registers; a part may replace the ones its level makes redundant.
  const builders = new Map(content.levels.filter((L) => L.builds).map((L) => [L.builds.type, L]))
  return circuitCourse(content, { board, parts: PARTS, read, holds: true, replaces: (part) => builders.get(part)?.builds.replaces ?? [] })
}
