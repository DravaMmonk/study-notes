// Replaying a run step by step, the same in every game. A traced evaluation (circuit.js, `ctx.trace`) lists every
// node computed, in the order it ran: { id, key, value } or { id, key, error }, a frame going round adding its own
// entries. A board replays it by showing, after each step, only what had been computed by then.
import { sourceOf } from './circuit.js'

/** The values and errors a board shows once the first `upTo + 1` entries of a trace have run. */
export function viewAt(trace, upTo) {
  const values = new Map()
  const errors = new Map()
  for (const e of trace.slice(0, upTo + 1)) {
    if (e.error) errors.set(e.id, e.error)
    else values.set(sourceOf(e.id, e.key), e.value)
  }
  return { values, errors }
}

const samePath = (a = [], b = []) => a.length === b.length && a.every((id, k) => id === b[k])
const within = (path = [], prefix) => path.length >= prefix.length && prefix.every((id, k) => id === path[k])

/**
 * What the board inside a packed part shows (engine/boards.js packed: a traced run sees every card inside as an entry
 * with a `path`, the ids of the packed parts it is in, outermost first): the part at `path` (the parts it is in and its
 * own id), in its latest run up to trace entry `upTo` (the whole trace by default): { values, errors }, empty before
 * it has run, and `lit`, the card on it that `step` (a trace entry: the current step of a run) is in or computing.
 */
export function insideAt(trace, path, { upTo = trace.length - 1, step = null } = {}) {
  let end = Math.min(upTo, trace.length - 1)
  while (end >= 0 && !within(trace[end].path, path)) end -= 1
  let from = end
  while (from > 0 && within(trace[from - 1].path, path)) from -= 1
  const values = new Map()
  const errors = new Map()
  for (let k = from; k <= end && end >= 0; k++) {
    const e = trace[k]
    if (!samePath(e.path, path)) continue
    if (e.error) errors.set(e.id, e.error)
    else values.set(sourceOf(e.id, e.key), e.value)
  }
  const lit = step && within(step.path, path) ? step.path?.[path.length] ?? step.id : null
  return { values, errors, lit }
}

// Base intervals for the first and later tests, with duration thresholds for grouping steps into frames.
const PACE = [{ per: 650, most: 12000 }, { per: 110, most: 1700 }]

/** Apply the playback speed to the frame interval while keeping the same number of steps per frame. */
export function paceOf(test, steps, speed) {
  const { per, most } = PACE[test === 0 ? 0 : 1]
  return { per: per / speed, stride: Math.max(1, Math.ceil((Math.max(1, steps) * per) / most)) }
}
