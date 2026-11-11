// A bus game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be in
// it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read with its tests on a bus built from their frames (bus.js) and what its outputs must
// be (wants.js), its hidden tests likewise, its reference board and naive board; the parts the levels build (each
// running the board the player passed its level's last task with: a packed part that keeps its own registers), and the
// course the shared audit checks.
//
// A task's tests run as long as their bus; its inputs give one value a tick.
// Returns the course read (../../engine/circuit-domain.js circuitCourse): LEVELS, played (level id → its tasks read),
// CHAPTERS, course, partOf, BUILT, offerIn, opening, carried, syncOwn, blueprints, and `wrong`, what reading the content
// found that its schema cannot say (an output with nothing wanted, a frame too long, a test without an input).
import { circuitCourse } from '../../engine/circuit-domain.js'
import { busOf } from './bus.js'
import { board } from './board.js'
import { PARTS } from './parts.js'
import { wantOf } from './wants.js'
import { callOf } from '../../engine/schema.js'

// An identifier or a byte as content writes it: a number, or hexadecimal.
const num = (v) => (typeof v === 'string' ? parseInt(v, 16) : v)

/** A test as content writes it, its bus laid out bit by bit; it runs as many ticks as its bus is long. */
const testOf = (t) => {
  const bus = busOf({ ...t.bus, frames: t.bus.frames.map((f) => ({ ...f, id: num(f.id), data: (f.data ?? []).map(num) })) })
  if (t.peerBits) bus.bits = bus.bits.map((bit, tick) => bit & t.peerBits[tick])
  const inputs = { ...(t.inputs ?? {}), ...Object.fromEntries((t.lineInputs ?? []).map((name) => [name, bus.bits])) }
  const tx = t.tx && { ...t.tx, id: num(t.tx.id), data: (t.tx.data ?? []).map(num) }
  return { ...t, bus, inputs, tx, queue: (t.queue ?? []).map(num), ticks: bus.bits.length }
}

export function canCourse(content) {
  // A test read: what reading it finds that its schema cannot say, then its bus.
  const test = (t, task, say) => {
    for (const f of t.bus.frames) if ((f.data ?? []).length > 8) say('a frame carries at most 8 bytes')
    if ((t.tx?.data ?? []).length > 8) say('a transmitted frame carries at most 8 bytes')
    if (task.expectsTx && !t.tx) say('a transmission test has no expected frame')
    if (task.pulls) {
      if (!task.inputs?.some((input) => input.name === task.pulls.input)) say(`queue input ${task.pulls.input} is not a task input`)
      if (!task.inputs?.some((input) => input.name === task.pulls.available)) say(`queue availability ${task.pulls.available} is not a task input`)
      if (task.pulls.last && !task.inputs?.some((input) => input.name === task.pulls.last)) say(`queue last flag ${task.pulls.last} is not a task input`)
      const queueInputs = [task.pulls.input, task.pulls.available, task.pulls.last].filter(Boolean)
      if (new Set(queueInputs).size !== queueInputs.length) say('queue value, availability and last flag must be different inputs')
      if (!task.outputs?.some((output) => output.name === task.pulls.next)) say(`queue advance ${task.pulls.next} is not a task output`)
      if (!t.queue) say('a test gives the board no queue to pull from')
      for (const name of queueInputs) if (t.inputs?.[name] || t.lineInputs?.includes(name)) say(`queue input ${name} cannot also have another source`)
    }
    for (const i of task.inputs ?? []) if (![task.pulls?.input, task.pulls?.available, task.pulls?.last].includes(i.name) && !t.inputs?.[i.name] && !t.lineInputs?.includes(i.name)) say(`a test gives nothing on the input ${i.name}`)
    for (const name of t.lineInputs ?? []) {
      if (task.drives) say('line inputs cannot bind a prerecorded bus while this board drives it')
      if (!task.inputs?.some((input) => input.name === name)) say(`line input ${name} is not a task input`)
      if (t.inputs?.[name]) say(`input ${name} has both explicit values and the line`)
    }
    const result = testOf(t)
    if (t.peerBits && t.peerBits.length !== result.bus.bits.length) say('other nodes must give one bit per tick')
    return result
  }
  // A task's wants read; a built part keeps its own registers.
  return circuitCourse(content, { board, parts: PARTS, read: (task) => ({ ...task, expectsTx: Object.values(task.want ?? {}).some((call) => ['frameDrive', 'frameLine', 'frameSent', 'frameQueueNext'].includes(callOf(call)[0])), want: wantOf(task.want) }), test, holds: true, unwanted: (task) => task.pulls ? [task.pulls.next] : [] })
}
