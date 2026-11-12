// The parts of a calculus board, for the shared engine: the board runs once a tick (../../engine/ticks.js), tick n
// computing term n of each output. Values on the wires are numbers and 「—」 (null): no value yet. A part handed 「—」
// gives 「—」.
//
// Fixed cards (the level puts them on the board, board.js), each named by params.name:
//   in       one of the level's input sequences, its term this tick
//   out      one of the level's output sequences, checked term by term
// The parts a course may start from (game.json primitives, vocabulary.js part):
//   add      a + b
//   mul      a × b
//   recip    1/a (「—」 for 1/0)
//   less     1 when a < b, else 0
//   gravity  1/(x²+y²)^(3/2) (「—」 at the origin)
//   const    a number (params.value)
//   reg      what register params.reg holds (params.start until something is kept in it)
//   keep     keeps what reaches it in register params.reg, from the next tick on
// Built parts are the boards of the levels that build them (course.js), each run as a packed part that keeps its own
// registers.
import { register, store } from '../../engine/ticks.js'

/** The registers a card may name. */
export const REGISTERS = ['A', 'B', 'C', 'D']

// A part that gives 「—」 when any input is 「—」.
const strict = (f) => (ins, node) => (Object.values(ins).some((v) => v === null || v === undefined) ? null : f(ins, node))
const number = (text) => (text === undefined || text === '' ? null : Number(text))

export const PARTS = {
  add: { inputs: ['a', 'b'], symmetric: ['a', 'b'], eval: strict(({ a, b }) => a + b) },
  mul: { inputs: ['a', 'b'], symmetric: ['a', 'b'], eval: strict(({ a, b }) => a * b) },
  recip: { inputs: ['a'], eval: strict(({ a }) => (a === 0 ? null : 1 / a)) },
  less: { inputs: ['a', 'b'], eval: strict(({ a, b }) => (a < b ? 1 : 0)) },
  gravity: { inputs: ['x', 'y'], eval: strict(({ x, y }) => {
    const radiusSquared = x * x + y * y
    return radiusSquared === 0 ? null : radiusSquared ** -1.5
  }) },
  const: { inputs: [], params: ['value'], eval: (_, node) => number(node.params?.value) ?? 0 },
  reg: register({ start: (node) => number(node.params?.start), params: ['reg', 'start'] }),
  keep: store({ params: ['reg'] }),
}
