// The parts of 《从一根线开始》's boards, for the shared engine: every board runs once a tick (run.js, with the registers
// of ../../engine/ticks.js). Values on the wires are bits (0, 1), whole numbers, yes or no (true / false), and 「—」
// (null): nothing this tick. A part handed 「—」 gives 「—」 (select reads only the input it picks).
//
// Fixed cards (the level puts them on the board), each named by params.name:
//   rx       the bit arriving this tick on one of the wires into the board
//   tx       what the board says this tick on one of the wires out of it (nothing wired: 0)
//   in       one of the level's inputs this tick
//   out      one of the level's outputs
// The wires are the board's ports, like its inputs and outputs: a built part takes the wires of the level that built
// it as inputs and outputs of its own, so a network card is one part with a wire in, a wire out and its two sides.
// The parts a course may start from (game.json primitives, vocabulary.js part):
//   reg      what register params.reg holds (params.start until something is kept in it)
//   keep     keeps what reaches it in register params.reg, from the next tick on
//   const    a number (params.value)
//   select   `yes` when `if` is yes or 1, `no` when it is no or 0
//   add      a + b
//   equal    whether a and b are the same number (a bit is the number 0 or 1, yes is 1 and no 0)
//   bit      bit i of the 8-bit number n, counted from the top (i = 0 is the highest); 「—」 for i outside 0–7
import { sink, source } from '../../engine/boards.js'
import { register, store } from '../../engine/ticks.js'

/** The registers a card may name. */
export const REGISTERS = ['A', 'B', 'C', 'D', 'E', 'F']

// A part that gives 「—」 when any input is 「—」.
const strict = (f) => (ins, node) => (Object.values(ins).some((v) => v === null || v === undefined) ? null : f(ins, node))
const num = (v) => (typeof v === 'boolean' ? Number(v) : v)
const truth = (v) => (v === null || v === undefined ? null : v === true || v === 1)

export const FIXED = ['rx', 'tx', 'in', 'out']

export const PARTS = {
  rx: source(),
  tx: sink(),
  in: source(),
  out: sink(),
  reg: register({ start: (node) => (node.params?.start === undefined || node.params.start === '' ? null : Number(node.params.start)), params: ['reg', 'start'] }),
  keep: store({ params: ['reg'] }),
  const: { inputs: [], params: ['value'], eval: (_, node) => Number(node.params?.value ?? 0) },
  select: {
    inputs: ['if', 'yes', 'no'],
    idle: () => null,
    eval: ({ if: c, yes, no }) => {
      const t = truth(c)
      return t === null ? null : t ? yes ?? null : no ?? null
    },
  },
  add: { inputs: ['a', 'b'], eval: strict(({ a, b }) => num(a) + num(b)) },
  equal: { inputs: ['a', 'b'], eval: strict(({ a, b }) => num(a) === num(b)) },
  bit: {
    inputs: ['n', 'i'],
    eval: strict(({ n, i }) => {
      const k = num(i)
      return Number.isInteger(k) && k >= 0 && k < 8 ? (num(n) >> (7 - k)) & 1 : null
    }),
  },
}
