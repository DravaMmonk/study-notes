// Truth circuits (《证明完毕》's chapter of gates): a board of gates that computes a sentence's truth value from the
// values of its letters. Its test is every row of the sentence's truth table, the way 《状态之图》's robot runs one board
// on every cell: the board passes when it gives the sentence's value on every row.
//
// A gates level: { kind: 'gates', target: formula text (in WORDS letters), builds?: gate type, budget?: gates allowed,
// gates }. Its `gates` are every gate its board may hold, by type: the game's primitive gates (parts.json, run as the
// kernel's defined parts) and the ones its levels build (game.json gates, each { name, desc, ports }), which run the
// board of the level that builds them (builtGates).
import { packed, runBoard, sink, source } from '../../engine/boards.js'
import { OUTPUTS, circuitBoard } from '../../engine/board-cards.js'
import { boardView } from '../../engine/board-view.js'
import { parse } from './formula.js'
import { say } from './notation.js'
import { lettersOf, rowsOf, valueOn } from './truth.js'
import { T } from '../../shell/i18n.js'

/** A truth circuit's board: a card for each letter of the target on the left, the sentence's output on the right. */
export const GATE_BOARD = circuitBoard({
  cards: [
    { type: 'letter', side: 'left', of: (task) => rowsFor(task).letters.map((name) => ({ name, label: say(parse(name), task.notation) })) },
    { ...OUTPUTS, of: () => [{ name: 'out', label: T('这句话') }] },
  ],
  right: 760,
  gap: 120,
})

/** The engine's parts for a board of gates: a letter is a source, the output a sink, every gate its own part. */
export const gateParts = (gates = {}) => ({ letter: source(), out: sink(), ...gates })

/**
 * The gates a course's levels build (game.json gates: { type: { name, desc, ports } }), each a packed part
 * (../../engine/boards.js) running the board its level (`builders[type]`) was passed with, or the level's reference
 * board: its ports are the board's letters, in order. A kept board that no longer gives its sentence on every row (the
 * player changed it after passing) leaves the gate on the reference board until the level is passed again.
 */
export function builtGates(gates, builders, ownBoard) {
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
      if (!fits.has(board)) fits.set(board, checkGates(level, board).pass)
      return fits.get(board)
    }
    const circuit = () => {
      const own = ownBoard(level.taskId)
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

export const countGates = (level, circuit) => circuit.nodes.filter((n) => level.gates[n.type]).length

/** The board a level starts from: a card for each letter of its target, and the output. */
export const startGates = (level) => GATE_BOARD.startBoard(level)

/** A level's tests: a row of the target's truth table each, the letters its inputs and the target's value its output. */
export const gateTests = (level) => rowsFor(level).rows.map(({ row, want }) => ({ inputs: row, expect: { out: want } }))

const WRONG_ROW = T('这一行的结果错误')
/** Every test run (the kernel's circuit screen, ../../shell/CircuitScreen.jsx run): its values, trace and failure. */
export const runGates = (level, circuit) => ({
  runs: level.tests.map((test) => {
    const trace = []
    const run = runRow(level, circuit, test.inputs, trace)
    return { ...run, trace, ...(run.value === test.expect.out ? {} : { fail: { why: WRONG_ROW } }) }
  }),
})

/** Why a board that gives every row is still wrong: it uses more gates than the level allows. */
export function overBudget(level, circuit) {
  const gates = countGates(level, circuit)
  return level.budget !== undefined && gates > level.budget ? T(`每一行都正确，但用了 ${gates} 个门，这一关最多允许 ${level.budget} 个。`, `Every row is correct, but it uses ${gates} gates; this level allows ${level.budget}.`) : ''
}

/**
 * A course's truth circuits as the kernel's circuit screen reads a course read (../../engine/board-view.js): the board,
 * the gates a task holds (its `gates`), and the gates the levels build (`built`, from `builders`, the task building
 * each) as packed parts that open on the board they run.
 */
export const gateCourse = ({ built, builders, offerIn, holdsIn, syncOwn }) => boardView({ board: GATE_BOARD, parts: (task) => task.gates, built: () => built, builder: (type) => builders[type], offerIn, holdsIn, syncOwn })
