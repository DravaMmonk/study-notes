// The parts of 《车在说话》's boards (games/bus/DESIGN.md 3), for the shared engine: every board runs tick by tick on the
// bus (../../engine/ticks.js). Values on the wires are bits (0 dominant, 1 recessive), whole numbers, yes or no
// (true / false), and 「—」 (null): nothing this tick. A part handed 「—」 gives 「—」.
//
// Fixed cards (the level puts them on the board):
//   line     the bus this tick (a board that says something from it in the same tick has a loop)
//   in       one of the level's inputs this tick, by params.name
//   out      one of the level's outputs, by params.name
// Primitives:
//   reg      what register params.reg holds (params.start until something is kept in it)
//   keep     keeps what reaches it in register params.reg, from the next tick on
//   const    a number (params.value)
//   select   `yes` when `if` is yes or 1, `no` when it is no or 0; an open port reads 「—」
//   compare  forms eq (are a and b equal) and lt (is a less than b)
//   arith    forms inc (in + 1) and add (a + b)
// Built parts are the boards of the levels that build them (course.js), each run as a packed part that keeps its own
// registers.
import { source, sink } from '../../engine/boards.js'
import { formed } from '../../engine/forms.js'
import { hearing, register, store } from '../../engine/ticks.js'

/** The registers a card may name. */
export const REGISTERS = ['A', 'B', 'C', 'D']

// A part that gives 「—」 when any input is 「—」.
const strict = (f) => (ins, node) => (Object.values(ins).some((v) => v === null) ? null : f(ins, node))
const num = (v) => (typeof v === 'boolean' ? Number(v) : v)
const truth = (v) => (v === null ? null : v === true || v === 1)

export const FIXED = ['line', 'in', 'out']

export const PARTS = {
  line: hearing(),
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
      return t === null ? null : t ? yes : no
    },
  },
  compare: formed([
    { key: 'eq', inputs: ['a', 'b'], eval: strict(({ a, b }) => num(a) === num(b)) },
    { key: 'lt', inputs: ['a', 'b'], eval: strict(({ a, b }) => num(a) < num(b)) },
  ]),
  arith: formed([
    { key: 'inc', inputs: ['in'], eval: strict(({ in: x }) => num(x) + 1) },
    { key: 'add', inputs: ['a', 'b'], eval: strict(({ a, b }) => num(a) + num(b)) },
  ]),
}

/** The primitives, in the order the course brings them in. */
export const PRIMITIVES = ['reg', 'keep', 'compare', 'arith', 'select', 'const']
