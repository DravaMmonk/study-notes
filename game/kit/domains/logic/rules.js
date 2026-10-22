// Designing a connective's rules (a `rule` level): the player writes the rules, and the prover checks them against
// the connective's truth table (its gate, chapter 1) row by row.
//
//   intro   the ways to make it: each a set of sides it needs ([['a', 'b']] for 与). Sound when no rule can be used
//           on a row where the connective is false; complete when on every row where it is true some rule can be
//           used; and no rule is wasted (one that needs more than another, or the same).
//   elim    the boxes using it up takes: each a set of sides it assumes. Sound when on every row where the connective
//           is true some box's assumptions all hold (else C could be false with every box vacuously done); and in
//           harmony with the ways to make it (Prawitz's inversion): a box for each way, assuming exactly what that way
//           needed. A box assuming less throws away what the connective was made from; a box no way matches is
//           a case that never happens.
//
// A level: { kind: 'rule', conn: CONNECTIVES id (declare.js), mode: 'intro' | 'elim', answer: the design that passes }.
import { CONNECTIVES } from './declare.js'

/** The connective's rows: every value of its sides, with its value there. */
export function connRows(conn) {
  const c = CONNECTIVES[conn]
  const rows = c.sides.length ? [[true, true], [true, false], [false, true], [false, false]] : [[]]
  return rows.map((vals) => {
    const row = Object.fromEntries(c.sides.map((s, k) => [s, vals[k]]))
    return { row, want: c.value(row.a, row.b) }
  })
}

const holds = (sides, row) => sides.every((s) => row[s])
const key = (sides) => [...sides].sort().join()
const subset = (a, b) => a.every((s) => b.includes(s))

/**
 * A design checked: { pass, rows: [{ row, want, uses: [bool per rule or box], problem: 'unsound' | 'uncovered' | null }],
 * problems: [{ kind, at?, row?, other? }] }, problems in the order to tell them.
 */
export function checkDesign(level, design) {
  const rows = connRows(level.conn).map(({ row, want }) => {
    const uses = design.map((sides) => holds(sides, row))
    const problem = level.mode === 'intro'
      ? (uses.some(Boolean) && !want ? 'unsound' : want && !uses.some(Boolean) ? 'uncovered' : null)
      : (want && !uses.some(Boolean) ? 'unsound' : null)
    return { row, want, uses, problem }
  })
  const problems = rows.flatMap((r, k) => (r.problem ? [{ kind: r.problem, row: k, at: r.uses.findIndex(Boolean) }] : []))
  if (!problems.length) {
    design.forEach((sides, k) => {
      const twin = design.findIndex((other, j) => j !== k && (j < k ? subset(other, sides) : subset(other, sides) && key(other) !== key(sides)))
      if (level.mode === 'intro' && twin >= 0) problems.push({ kind: 'wasted', at: k, other: twin })
    })
    if (level.mode === 'elim') {
      const ways = CONNECTIVES[level.conn].ctors
      ways.forEach((way, w) => {
        if (design.some((sides) => key(sides) === key(way))) return
        const less = design.findIndex((sides) => subset(sides, way))
        problems.push({ kind: 'weak', at: less, way: w })
      })
      design.forEach((sides, k) => {
        if (!ways.some((way) => key(way) === key(sides)) && !problems.some((p) => p.at === k)) problems.push({ kind: 'stray', at: k })
        if (design.findIndex((other) => key(other) === key(sides)) !== k) problems.push({ kind: 'twice', at: k })
      })
    }
  }
  return { pass: problems.length === 0, rows, problems }
}
