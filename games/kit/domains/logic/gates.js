// Truth circuits (《证明完毕》's chapter of gates): a board of gates that computes a sentence's truth value from the
// values of its letters. Its test is every row of the sentence's truth table, the way 《状态之图》's robot runs one board
// on every cell: the board passes when it gives the sentence's value on every row.
//
// A gates level: { kind: 'gates', target: formula text (in WORDS letters), hideTarget?: true (the target value column
// is not shown, so the table does not give the answer away), blind?: true (the sentence is not shown either: it is
// said in words only, and putting it into gates is the puzzle), builds?: gate type, budget?: gates allowed }.
// The gates the course starts from are 'gNot' and 'gAnd'; the others are built (spec.gates, each { name, desc, ports,
// f }) and run as their own function once built, checked against the level that builds them (validate.js).
import { runBoard, sink, source } from '../../engine/boards.js'
import { parse } from './formula.js'
import { lettersOf, rowsOf, valueOn } from './truth.js'

const T = (zh, en) => ({ zh, en })

/** The gates the course starts from. */
export const PRIMITIVE_GATES = {
  gNot: { name: T('非', 'Not'), desc: T('输入是真，输出假；输入是假，输出真。', 'True in gives false out; false in gives true out.'), ports: ['a'], f: ([a]) => !a },
  gAnd: { name: T('与', 'And'), desc: T('两个输入都是真，才输出真；否则输出假。', 'Outputs true only when both inputs are true; otherwise false.'), ports: ['a', 'b'], f: ([a, b]) => a && b },
}

/** Every gate a course knows: the primitive ones and the ones its levels build. */
export const gatesOf = (built = {}) => ({ ...PRIMITIVE_GATES, ...built })
export const isGate = (type, built = {}) => Boolean(gatesOf(built)[type])

/** The engine's parts for a board of gates: a letter is a source, the output a sink, every gate its function. */
export function gateParts(built = {}) {
  const parts = { letter: source(), out: sink() }
  for (const [type, g] of Object.entries(gatesOf(built))) {
    parts[type] = { inputs: g.ports, eval: (ins) => g.f(g.ports.map((p) => ins[p])) }
  }
  return parts
}

/** A level's letters (in order) and its rows, each with the value the target has on it. */
export function rowsFor(level) {
  const target = parse(level.target)
  const letters = lettersOf([target])
  return { letters, rows: rowsOf(letters).map((row) => ({ row, want: valueOn(target, row) })) }
}

/** What the board gives on one row: the engine's values, and the output (undefined when nothing reaches it). */
export function runRow(level, circuit, row) {
  const run = runBoard(circuit, { parts: gateParts(level.gates), bind: row })
  return { ...run, value: run.outputs.out }
}

/** Every row checked: { pass, results: [{ row, want, got, pass }], gates, overBudget }. */
export function checkGates(level, circuit) {
  const results = rowsFor(level).rows.map(({ row, want }) => {
    const got = runRow(level, circuit, row).value
    return { row, want, got, pass: got === want }
  })
  const gates = countGates(level, circuit)
  const overBudget = level.budget !== undefined && gates > level.budget
  return { pass: results.every((r) => r.pass) && !overBudget, results, gates, overBudget }
}

export const countGates = (level, circuit) => circuit.nodes.filter((n) => isGate(n.type, level.gates)).length

/** The board a level starts from: a card for each letter of its target, and the output. */
export function startGates(level) {
  const { letters } = rowsFor(level)
  return {
    nodes: [...letters.map((name, k) => ({ id: name, type: 'letter', params: { name }, x: 20, y: 40 + k * 120 })), { id: 'out', type: 'out', params: { name: 'out' }, x: 760, y: 40 }],
    wires: [],
  }
}

/**
 * A reference board written compactly: gates({ n: 'gNot', a: 'gAnd' }, ['Rain>n.a', 'n>a.a', 'Wind>a.b', 'a>out']).
 * A letter is a source named by its letter; 'x>out' wires into the output.
 */
export function gates(nodes, wires, level) {
  const start = startGates(level)
  const cards = Object.entries(nodes).map(([id, type], k) => ({ id, type, params: {}, x: 220 + (k % 3) * 180, y: 40 + Math.floor(k / 3) * 150 }))
  return {
    nodes: [...start.nodes, ...cards],
    wires: wires.map((s) => {
      const [from, to] = s.split('>')
      const [id, port = 'in'] = to.split('.')
      return { from, to: id, port }
    }),
  }
}
