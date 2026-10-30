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

// Every stepped run in every game plays at the same pace: ms a step on the first test (slow enough to follow), and on
// the tests after it (fast), and the most a test may take before steps start going several to a frame.
const PACE = [{ per: 650, most: 12000 }, { per: 110, most: 1700 }]

/** How fast test `test` of a run plays, given its step count: { per: ms a frame, stride: steps a frame }. */
export function paceOf(test, steps) {
  const { per, most } = PACE[test === 0 ? 0 : 1]
  return { per, stride: Math.max(1, Math.ceil((Math.max(1, steps) * per) / most)) }
}
