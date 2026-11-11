// The parts of a market board, for the shared engine: the board runs once a tick (../../engine/ticks.js), each tick
// giving every shop its price. Values on the wires are numbers and 「—」 (null): no value. A part handed 「—」 gives 「—」.
//
// Fixed cards (the level puts them on the board, board.js), each named by params.name:
//   in       a shop the tick before: its price, how much it had left, how many it turned away
//   out      a shop's price this tick
// The parts a course may start from (game.json primitives, vocabulary.js part):
//   const    a number (params.value)
//   add      a + b
//   sub      a − b
//   mul      a × b
//   div      a ÷ b (「—」 when b is 0)
//   min      the smaller of a and b
// A board keeps nothing from tick to tick: the street hands it yesterday's price (world.js).
// Built parts are the boards of the levels that build them (course.js).
const strict = (f) => (ins, node) => (Object.values(ins).some((v) => v === null || v === undefined) ? null : f(ins, node))
const number = (text) => (text === undefined || text === '' ? null : Number(text))

export const PARTS = {
  const: { inputs: [], params: ['value'], eval: (_, node) => number(node.params?.value) ?? 0 },
  add: { inputs: ['a', 'b'], symmetric: ['a', 'b'], eval: strict(({ a, b }) => a + b) },
  sub: { inputs: ['a', 'b'], eval: strict(({ a, b }) => a - b) },
  mul: { inputs: ['a', 'b'], symmetric: ['a', 'b'], eval: strict(({ a, b }) => a * b) },
  div: { inputs: ['a', 'b'], eval: strict(({ a, b }) => (b === 0 ? null : a / b)) },
  min: { inputs: ['a', 'b'], symmetric: ['a', 'b'], eval: strict(({ a, b }) => Math.min(a, b)) },
}
