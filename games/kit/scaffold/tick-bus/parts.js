// The parts of a __name__ board, for the shared engine: every board runs tick by tick on the line
// (../../engine/ticks.js). Values on the wires are bits, whole numbers, yes or no (true / false), and 「—」 (null):
// nothing this tick. A part handed 「—」 gives 「—」.
//
// Fixed cards (the level puts them on the board):
//   line     the line this tick (a board that says something from it in the same tick has a loop)
//   say      what the board says on the line this tick (a level that talks has it)
//   in       one of the level's inputs this tick, by params.name
//   out      one of the level's outputs, by params.name
// The parts a course may start from (game.json primitives, vocabulary.js part):
//   reg      what register params.reg holds (params.start until something is kept in it)
//   keep     keeps what reaches it in register params.reg, from the next tick on
//   const    a number (params.value)
// Built parts are the boards of the levels that build them (course.js), each run as a packed part that keeps its own
// registers.
import { register, store } from '../../engine/ticks.js'

/** The registers a card may name. */
export const REGISTERS = ['A', 'B', 'C', 'D']

export const PARTS = {
  reg: register({ start: (node) => (node.params?.start === undefined || node.params.start === '' ? null : Number(node.params.start)), params: ['reg', 'start'] }),
  keep: store({ params: ['reg'] }),
  const: { inputs: [], params: ['value'], eval: (_, node) => Number(node.params?.value ?? 0) },
}
