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

/**
 * How fast a run plays: the first test slowly enough to follow each step, the rest fast, and a long run squeezed so
 * it never drags (several steps a frame once there are many). Returns { per: ms a frame, stride: steps a frame }.
 */
export function paceOf(test, steps) {
  const n = Math.max(1, steps)
  if (test === 0) return { per: Math.max(90, Math.min(650, 8000 / n)), stride: Math.max(1, Math.ceil(n / 120)) }
  return { per: Math.max(22, Math.min(110, 1700 / n)), stride: Math.max(1, Math.ceil(n / 90)) }
}
