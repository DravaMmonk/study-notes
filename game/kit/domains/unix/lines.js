// The teletype's machine (《一切皆文件》 era 1): a program is a board run once per line of its input, with registers
// that carry a value from one line to the next, and an end board run once after the last line. It is the shared
// engine's walk (../../engine/machine.js): step i writes `print@i` and every register `reg:<name>@i`, and reads the
// registers of step i − 1.
//
//   program  { each: circuit, end?: circuit, registers?: { name: initial value } }
//   circuit  sources: 'line' (this line), 'reg' (params.name: the register as the line before left it)
//            sinks:   'print' (a line out; nothing when 「—」), 'set' (params.name: the register's new value)
//
// Values are strings, numbers, booleans or null (「—」, nothing); an unconnected input reads null, as in 状态之图.
import { runBoard, sink } from '../../engine/boards.js'
import { walk } from '../../engine/machine.js'

const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))
const idle = () => null
const nulls = (f) => (ins, node) => (Object.values(ins).some((v) => v === null) ? null : f(ins, node))

export const LINE_PARTS = {
  line: { inputs: [], eval: (_, __, ctx) => ctx.line },
  reg: { inputs: [], eval: (_, node, ctx) => ctx.registers[node.params.name] ?? null },
  print: sink(),
  set: sink(),
  const: { inputs: [], eval: (_, node) => node.params.value ?? null },
  // Does the line contain the card's text?
  contains: { inputs: ['in'], idle, eval: nulls(({ in: s }, node) => String(s).includes(node.params.text ?? '')) },
  // The k-th field (from 1) of the line split by the card's separator (whitespace by default).
  field: { inputs: ['in'], idle, eval: nulls(({ in: s }, node) => { const parts = node.params.sep ? String(s).split(node.params.sep) : String(s).trim().split(/\s+/); return parts[(node.params.k ?? 1) - 1] ?? null }) },
  number: { inputs: ['in'], idle, eval: ({ in: s }) => num(s) },
  add: { inputs: ['a', 'b'], idle, eval: nulls(({ a, b }) => num(a) + num(b)) },
  equal: { inputs: ['a', 'b'], idle, eval: nulls(({ a, b }) => String(a) === String(b)) },
  less: { inputs: ['a', 'b'], idle, eval: nulls(({ a, b }) => num(a) < num(b)) },
  not: { inputs: ['in'], idle, eval: nulls(({ in: v }) => !v) },
  // Lets the value through when the condition is yes; 「—」 otherwise.
  pass: { inputs: ['if', 'v'], idle, eval: ({ if: c, v }) => (c ? v : null) },
  // Joins its inputs with the card's separator, leaving out 「—」.
  join: { inputs: ['a', 'b'], idle, eval: ({ a, b }, node) => [a, b].filter((v) => v !== null).join(node.params.sep ?? ' ') },
  // The first input that is not 「—」.
  either: { inputs: ['a', 'b'], idle, eval: ({ a, b }) => a ?? b },
}

// The board's sinks by kind: what it prints, and each register it sets.
function sinksOf(circuit, values) {
  let print
  const set = {}
  for (const n of circuit.nodes) {
    if (n.type === 'print') print = values.get(n.id)
    if (n.type === 'set') set[n.params.name] = values.get(n.id)
  }
  return { print, set }
}

/** The lines of a text, without the empty one after a final newline. */
export const linesOf = (text) => (text === '' ? [] : text.replace(/\n$/, '').split('\n'))

/**
 * Run a program on a text. Returns { output, steps, table } (output: the printed lines, each ending in a newline),
 * or { error } when a part cannot compute.
 */
export function runLines(program, text, { parts = LINE_PARTS } = {}) {
  const lines = linesOf(text)
  const names = Object.keys(program.registers ?? {})
  const order = [...lines.keys(), 'end']
  const keyOf = (i, name) => `${name}@${i}`
  const previous = (i) => (i === 'end' ? lines.length - 1 : i - 1)
  const result = walk({
    order,
    keys: (i) => Object.fromEntries([['print', keyOf(i, 'print')], ...names.map((n) => [`reg:${n}`, keyOf(i, `reg:${n}`)])]),
    base: names.map((n) => [keyOf(-1, `reg:${n}`), program.registers[n]]),
    step: (i, get) => {
      const registers = Object.fromEntries(names.map((n) => [n, get(keyOf(previous(i), `reg:${n}`))]))
      const circuit = i === 'end' ? program.end : program.each
      if (!circuit) return { out: { print: null, ...Object.fromEntries(names.map((n) => [`reg:${n}`, registers[n]])) } }
      const { values, errors } = runBoard(circuit, { parts, ctx: { line: i === 'end' ? null : lines[i], registers } })
      if (errors.size) throw new Error(`a part cannot compute on line ${i}`)
      const { print, set } = sinksOf(circuit, values)
      return { out: { print: print ?? null, ...Object.fromEntries(names.map((n) => [`reg:${n}`, set[n] === undefined ? registers[n] : set[n]])) }, probe: Object.fromEntries(values) }
    },
    answer: (table) => order.map((i) => table.get(keyOf(i, 'print'))).filter((v) => v !== null && v !== undefined).map((v) => `${v}\n`).join(''),
  })
  return { output: result.value, steps: result.steps, table: result.table }
}

/** Programs one after another, each reading what the one before printed (the teletype's pipe board). */
export const pipeline = (programs, text, options) => programs.reduce((input, p) => (typeof p === 'function' ? p(input) : runLines(p, input, options).output), text)

/** Whole-input commands no line board can build (declared primitives of the course). */
export const BUILTINS = {
  sort: (text) => linesOf(text).sort().map((l) => `${l}\n`).join(''),
}
