// The parts of 《车在说话》's boards (games/bus/DESIGN.md 3), for the shared engine: every board runs tick by tick on the
// bus (../../engine/ticks.js). Values on the wires are bits (0 dominant, 1 recessive), whole numbers, yes or no
// (true / false), and 「—」 (null): nothing this tick. A part handed 「—」 gives 「—」.
//
// Fixed cards (a task puts them on the board, board.js):
//   line     the bus this tick (a board that says something from it in the same tick has a loop)
//   in       one of the task's inputs this tick, by params.name
//   out      one of the task's outputs, by params.name
// The parts a course may start from (game.json primitives, vocabulary.js part):
//   reg      what register params.reg holds (params.start until something is kept in it)
//   keep     keeps what reaches it in register params.reg, from the next tick on
//   const    a number (params.value)
//   select   `yes` when `if` is yes or 1, `no` when it is no or 0; an open port reads 「—」
//   compare  forms eq (are a and b equal) and lt (is a less than b)
//   arith    forms inc (in + 1) and add (a + b)
//   xor      bitwise exclusive or of two unsigned 32-bit numbers
//   subtract the first number minus the second
//   band     bitwise AND of two unsigned 32-bit numbers
//   shiftRight  unsigned right shift by 0 to 31 bits
//   sliceBytes  a contiguous range of a byte sequence
//   concatBytes  joins two byte sequences
//   byteLength  the number of bytes in a sequence
//   byteList  a single-byte sequence
//   byteAt  one byte at a sequence index
// Built parts are the boards of the levels that build them (course.js), each run as a packed part that keeps its own
// registers.
import { formed } from '../../engine/forms.js'
import { register, store } from '../../engine/ticks.js'

/** The registers a card may name. */
export const REGISTERS = ['A', 'B', 'C', 'D']

// A part that gives 「—」 when any input is 「—」.
const strict = (f) => (ins, node) => (Object.values(ins).some((v) => v === null) ? null : f(ins, node))
const num = (v) => (typeof v === 'boolean' ? Number(v) : v)
const equal = (a, b) => Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((value, index) => value === b[index]) : num(a) === num(b)
const truth = (v) => (v === null ? null : v === true || v === 1)

export const PARTS = {
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
    { key: 'eq', inputs: ['a', 'b'], symmetric: ['a', 'b'], eval: strict(({ a, b }) => equal(a, b)) },
    { key: 'lt', inputs: ['a', 'b'], eval: strict(({ a, b }) => num(a) < num(b)) },
  ]),
  arith: formed([
    { key: 'inc', inputs: ['in'], eval: strict(({ in: x }) => num(x) + 1) },
    { key: 'add', inputs: ['a', 'b'], symmetric: ['a', 'b'], eval: strict(({ a, b }) => num(a) + num(b)) },
  ]),
  xor: { inputs: ['a', 'b'], symmetric: ['a', 'b'], eval: strict(({ a, b }) => (num(a) ^ num(b)) >>> 0) },
  subtract: { inputs: ['a', 'b'], eval: strict(({ a, b }) => num(a) - num(b)) },
  band: { inputs: ['a', 'b'], symmetric: ['a', 'b'], eval: strict(({ a, b }) => (num(a) & num(b)) >>> 0) },
  shiftRight: { inputs: ['value', 'amount'], eval: strict(({ value, amount }) => Number.isInteger(amount) && amount >= 0 && amount <= 31 ? num(value) >>> amount : null) },
  sliceBytes: { inputs: ['bytes', 'start', 'length'], eval: strict(({ bytes, start, length }) => Array.isArray(bytes) && Number.isInteger(start) && start >= 0 && Number.isInteger(length) && length >= 0 && start + length <= bytes.length ? bytes.slice(start, start + length) : null) },
  concatBytes: { inputs: ['a', 'b'], eval: strict(({ a, b }) => Array.isArray(a) && Array.isArray(b) ? [...a, ...b] : null) },
  byteLength: { inputs: ['bytes'], eval: strict(({ bytes }) => Array.isArray(bytes) ? bytes.length : null) },
  byteList: { inputs: ['byte'], eval: strict(({ byte }) => Number.isInteger(byte) && byte >= 0 && byte <= 255 ? [byte] : null) },
  byteAt: { inputs: ['bytes', 'index'], eval: strict(({ bytes, index }) => Array.isArray(bytes) && Number.isInteger(index) && index >= 0 && index < bytes.length ? bytes[index] : null) },
}
