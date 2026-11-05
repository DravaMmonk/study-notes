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

// An identifier or a byte as content writes it: a number, or hexadecimal.
const num = (v) => (typeof v === 'string' ? parseInt(v, 16) : v)

/** A test as content writes it, its bus laid out bit by bit; it runs as many ticks as its bus is long. */
const testOf = (t) => {
  const bus = busOf({ ...t.bus, frames: t.bus.frames.map((f) => ({ ...f, id: num(f.id), data: (f.data ?? []).map(num) })) })
  return { ...t, bus, ticks: bus.bits.length }
}

export function canCourse(content) {
  // A test read: what reading it finds that its schema cannot say, then its bus.
  const test = (t, task, say) => {
    for (const f of t.bus.frames) if ((f.data ?? []).length > 8) say('a frame carries at most 8 bytes')
    for (const i of task.inputs ?? []) if (!t.inputs?.[i.name]) say(`a test gives nothing on the input ${i.name}`)
    return testOf(t)
  }
  // A task's wants read; a built part keeps its own registers.
  return circuitCourse(content, { board, parts: PARTS, read: (task) => ({ ...task, want: wantOf(task.want) }), test, holds: true })
}
