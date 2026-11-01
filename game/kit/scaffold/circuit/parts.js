// The parts of a __name__ board, for the shared engine (../../engine/circuit.js): values on the wires are numbers, and
// 「—」 (null): nothing. A part handed 「—」 gives 「—」.
//
// Fixed cards (the level puts them on the board):
//   in       one of the level's inputs, by params.name
//   out      one of the level's outputs, by params.name
// The parts a course may start from (game.json primitives, vocabulary.js part):
//   add      a + b
//   sub      a − b
// Built parts are the boards of the levels that build them (course.js), each run as a packed part.
import { sink, source } from '../../engine/boards.js'

// A part that gives 「—」 when any input is 「—」.
const strict = (f) => (ins, node) => (Object.values(ins).some((v) => v === null || v === undefined) ? null : f(ins, node))

export const FIXED = ['in', 'out']

export const PARTS = {
  in: source(),
  out: sink(),
  add: { inputs: ['a', 'b'], eval: strict(({ a, b }) => a + b) },
  sub: { inputs: ['a', 'b'], eval: strict(({ a, b }) => a - b) },
}
