// Truth circuits (《证明完毕》's chapter of gates): a board of gates that computes a sentence's truth value from the
// values of its letters. Its test is every row of the sentence's truth table, the way 《状态之图》's robot runs one board
// on every cell: the board passes when it gives the sentence's value on every row.
//
// A gates level: { kind: 'gates', target: formula text (in WORDS letters), hideTarget?: true (the target value column
// is not shown, so the table does not give the answer away), blind?: true (the sentence is not shown either: it is
// said in words only, and putting it into gates is the puzzle), builds?: gate type, budget?: gates allowed }.
// The gates the course starts from are 'gNot' and 'gAnd'; the others are built (game.json gates, each { name, desc,
// ports }) and run the board of the level that builds them (builtGates).
import { packed, runBoard, sink, source } from '../../engine/boards.js'
import { parse } from './formula.js'
import { lettersOf, rowsOf, valueOn } from './truth.js'
import { ownBoard } from './built.js'
import { T } from '../../shell/i18n.js'


/** The gates the course starts from. */
export const PRIMITIVE_GATES = {
  gNot: { name: T('非 ¬', 'Not ¬'), desc: T('¬a：输入是真，输出假；输入是假，输出真。', '¬a: true in gives false out; false in gives true out.'), ports: ['a'], f: ([a]) => !a },
  gAnd: { name: T('与 ∧', 'And ∧'), desc: T('a ∧ b：两个输入都是真，才输出真；否则输出假。', 'a ∧ b: outputs true only when both inputs are true; otherwise false.'), ports: ['a', 'b'], f: ([a, b]) => a && b },
}

/** Every gate a course knows: the primitive ones and the ones its levels build. */
export const gatesOf = (built = {}) => ({ ...PRIMITIVE_GATES, ...built })
export const isGate = (type, built = {}) => Boolean(gatesOf(built)[type])

/** The engine's parts for a board of gates: a letter is a source, the output a sink, a primitive gate its function,
 *  a built gate the board it runs. */
export function gateParts(built = {}) {
  const parts = { letter: source(), out: sink() }
  for (const [type, g] of Object.entries(PRIMITIVE_GATES)) parts[type] = { inputs: g.ports, eval: (ins) => g.f(g.ports.map((p) => ins[p])) }
  return { ...parts, ...built }
}

/**
 * The gates a course's levels build (game.json gates: { type: { name, desc, ports } }), each a packed part
 * (../../engine/boards.js) running the board its level (`builders[type]`) was passed with, or the level's reference
 * board: its ports are the board's letters, in order. A kept board that no longer gives its sentence on every row (the
 * player changed it after passing) leaves the gate on the reference board until the level is passed again.
 */
export function builtGates(gates, builders) {
  const all = {}
  for (const [type, g] of Object.entries(gates)) {
    const level = builders[type]
    const port = new Map(rowsFor(level).letters.map((letter, k) => [letter, g.ports[k]]))
    const asPart = new WeakMap()
    const portsOn = (board) => {
      if (!asPart.has(board)) asPart.set(board, { ...board, nodes: board.nodes.map((n) => (n.type === 'letter' ? { ...n, params: { ...n.params, name: port.get(n.params.name) } } : n)) })
      return asPart.get(board)
    }
    const fits = new WeakMap()
    const passes = (board) => {
      if (!fits.has(board)) fits.set(board, checkGates({ ...level, gates: all }, board).pass)
      return fits.get(board)
    }
    const circuit = () => {
      const own = ownBoard(level.key)
      return portsOn(own && passes(own) ? own : level.solution)
    }
    all[type] = { ...g, ...packed({ circuit, inputs: g.ports, outputs: ['out'] }), built: true, opens: () => ({ circuit: circuit(), level }) }
  }
  return all
}

/** A level's letters (in order) and its rows, each with the value the target has on it. */
export function rowsFor(level) {
  const target = parse(level.target)
  const letters = lettersOf([target])
  return { letters, rows: rowsOf(letters).map((row) => ({ row, want: valueOn(target, row) })) }
}

/** What the board gives on one row: the engine's values, and the output (undefined when nothing reaches it). With
 *  `trace` (an array), every card computed goes onto it, the cards inside the gates the player built too. */
export function runRow(level, circuit, row, trace) {
  const run = runBoard(circuit, { parts: gateParts(level.gates), bind: row, ctx: trace ? { trace } : {} })
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
