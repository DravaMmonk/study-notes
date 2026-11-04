// The cards a __name__ level puts on its board, for the shared engine (../../engine/circuit.js): values on the wires
// are numbers, and 「—」 (null): nothing.
//   in       one of the level's inputs, by params.name
//   out      one of the level's outputs, by params.name
// The parts a course starts from are each game's own, defined as data in its parts.json (games/DESIGN.md 6.9) over
// the domain's engine resources (ops.js); built parts are the boards of the levels that build them (course.js), each
// run as a packed part.
import { sink, source } from '../../engine/boards.js'

export const FIXED = ['in', 'out']

export const FIXED_PARTS = {
  in: source(),
  out: sink(),
}
