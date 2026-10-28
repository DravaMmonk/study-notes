// Truth circuits (《证明完毕》's chapter of gates): a board of gates that computes a sentence's truth value from the
// values of its letters. Its test is every row of the sentence's truth table, the way 《状态之图》's robot runs one board
// on every cell: the board passes when it gives the sentence's value on every row.
//
// A gates level: { kind: 'gates', target: formula text (in WORDS letters), hideTarget?: true (the target value column
// is not shown, so the table does not give the answer away), blind?: true (the sentence is not shown either: it is
// said in words only, and putting it into gates is the puzzle), builds?: gate type, budget?: gates allowed }.
// The gates the course starts from are 'gNot' and 'gAnd'; the others are built (spec.gates, each { name, desc, ports,
// f }) and run as their own function once built, checked against the level that builds them (validate.js).
//
// A declaration (`declare: name`, the connectives chapter) is a gates level of another shape, the way Lean declares
// a connective (`structure And`, `inductive Or`, `inductive False`): the board ends in the declaration card, each card
// wired into it is one way to make the sentence (a constructor), and what is wired into that card is what the way
// needs. The sentence holds when some way has all it needs, so the board's truth table is the declaration's meaning,
// checked against the sentence said in words: a specification can be tested, not proved. Ways must not repeat a need,
// and no way may need more than another one (it would add nothing to the meaning, but one more case to every use).
import { runBoard, sink, source } from '../../engine/boards.js'
import { parse } from './formula.js'
import { lettersOf, rowsOf, valueOn } from './truth.js'

const T = (zh, en) => ({ zh, en })

/** The gates the course starts from. */
export const PRIMITIVE_GATES = {
  gNot: { name: T('非 ¬', 'Not ¬'), desc: T('¬a：输入是真，输出假；输入是假，输出真。', '¬a: true in gives false out; false in gives true out.'), ports: ['a'], f: ([a]) => !a },
  gAnd: { name: T('与 ∧', 'And ∧'), desc: T('a ∧ b：两个输入都是真，才输出真；否则输出假。', 'a ∧ b: outputs true only when both inputs are true; otherwise false.'), ports: ['a', 'b'], f: ([a, b]) => a && b },
}

/** A declaration's cards: a way to make the sentence, and the declaration itself (the end of its board). */
export const DECLARE_PARTS = {
  ctor: { name: T('一种造法', 'A way to make it'), desc: T('接进这种造法要的东西，最多三样：它们都有，就造得出这句话。什么都不接，就是什么都不要也造得出。', 'Wire in what this way needs, up to three things: with all of them, the sentence can be made. Wire in nothing, and it needs nothing at all.'), ports: ['f1', 'f2', 'f3'], optional: true, f: (vals) => vals.filter((v) => v !== undefined).every(Boolean) },
  decl: { name: T('声明', 'Declaration'), desc: T('每一种造法接进一个口。有一种造法造得出，这句话就成立；一种造法都不接，它就怎样都造不出来。', 'Each way to make the sentence goes into one input. The sentence holds when some way can make it; with no way wired in, it can never be made.'), ports: ['c1', 'c2', 'c3'], optional: true, f: (vals) => vals.some((v) => v === true) },
}

/** Every gate a course knows: the primitive ones, the ones its levels build, and a declaration's cards. */
export const gatesOf = (built = {}) => ({ ...PRIMITIVE_GATES, ...DECLARE_PARTS, ...built })
export const isGate = (type, built = {}) => Boolean(gatesOf(built)[type])

/** The engine's parts for a board of gates: a letter is a source, the output a sink, every gate its function. */
export function gateParts(built = {}) {
  const parts = { letter: source(), out: sink() }
  for (const [type, g] of Object.entries(gatesOf(built))) {
    parts[type] = { inputs: g.ports, ...(g.optional ? { optional: g.ports, bare: true } : {}), eval: (ins) => g.f(g.ports.map((p) => ins[p])) }
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
  return { ...run, value: level.declare ? run.values.get(DECL) : run.outputs.out }
}

const DECL = 'decl'
/** Why a declaration's board is not a declaration, or '': each way wired straight into it, no need repeated, none
 *  needing more than another. */
export function declarationShape(circuit) {
  const byId = new Map(circuit.nodes.map((n) => [n.id, n]))
  const ways = circuit.wires.filter((w) => w.to === DECL)
  if (ways.some((w) => byId.get(w.from)?.type !== 'ctor')) return T('声明的每个口接的必须是一种造法', 'Each input of the declaration takes a way to make it')
  if (circuit.wires.some((w) => byId.get(w.from)?.type === 'ctor' && w.to !== DECL)) return T('造法只能接进声明', 'A way to make it goes into the declaration only')
  const needs = ways.map((w) => circuit.wires.filter((x) => x.to === w.from).map((x) => x.from))
  if (needs.some((n) => new Set(n).size < n.length)) return T('同一种造法里，一样东西要了两次', 'One way needs the same thing twice')
  const covers = (a, b) => a.every((x) => b.includes(x))
  if (needs.some((a, i) => needs.some((b, j) => i !== j && covers(a, b) && (a.length < b.length || i < j)))) return T('有一种造法多余：另一种造法要的更少，或者一模一样', 'One way is more than needed: another needs less, or the same')
  return ''
}

/** Every row checked: { pass, results: [{ row, want, got, pass }], gates, overBudget }. */
export function checkGates(level, circuit) {
  const results = rowsFor(level).rows.map(({ row, want }) => {
    const got = runRow(level, circuit, row).value
    return { row, want, got, pass: got === want }
  })
  const gates = countGates(level, circuit)
  const overBudget = level.budget !== undefined && gates > level.budget
  const shape = level.declare ? declarationShape(circuit) : ''
  return { pass: results.every((r) => r.pass) && !overBudget && !shape, results, gates, overBudget, shape }
}

export const countGates = (level, circuit) => circuit.nodes.filter((n) => n.type !== DECL && isGate(n.type, level.gates)).length

/** The board a level starts from: a card for each letter of its target, and the output. */
export function startGates(level) {
  const { letters } = rowsFor(level)
  return {
    nodes: [...letters.map((name, k) => ({ id: name, type: 'letter', params: { name }, x: 20, y: 40 + k * 120 })), level.declare ? { id: DECL, type: DECL, params: {}, locked: true, x: 760, y: 40 } : { id: 'out', type: 'out', params: { name: 'out' }, x: 760, y: 40 }],
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
