// Rewriting and clauses (《证明完毕》 chapter 4): formulas rewritten by equivalence laws, normal forms, and clause sets
// saturated by resolution.
//
// A law rewrites one shape of formula into an equivalent one; a law card rewrites everywhere it can, again and again,
// until nothing it knows is left (`toEnd`). A clause is a set of literals ('A', '¬A'), kept as a sorted list; a clause
// set is a list of clauses, each once; the empty clause is ⊥, the clause set holding it is refuted.
import { BOT, and, atom, bin, not, or, show } from './formula.js'
import { lettersOf, rowsOf, valueOn } from './truth.js'

const isNeg = (f) => f.op === '¬'

/** The laws, each a rewrite at the root: the formula it gives, or null when it does not apply. */
export const LAWS = {
  // ¬¬A ⇒ A
  dneg: (f) => (isNeg(f) && isNeg(f.a) ? f.a.a : null),
  // A → B ⇒ ¬A ∨ B; A ↔ B ⇒ (¬A ∨ B) ∧ (¬B ∨ A)
  impOr: (f) => (f.op === '→' ? or(not(f.a), f.b) : f.op === '↔' ? and(or(not(f.a), f.b), or(not(f.b), f.a)) : null),
  // ¬(A ∧ B) ⇒ ¬A ∨ ¬B; ¬(A ∨ B) ⇒ ¬A ∧ ¬B
  dm: (f) => (isNeg(f) && (f.a.op === '∧' || f.a.op === '∨') ? bin(f.a.op === '∧' ? '∨' : '∧', not(f.a.a), not(f.a.b)) : null),
  // A ∨ (B ∧ C) ⇒ (A ∨ B) ∧ (A ∨ C); (B ∧ C) ∨ A ⇒ (B ∨ A) ∧ (C ∨ A)
  dist: (f) => {
    if (f.op !== '∨') return null
    if (f.b.op === '∧') return and(or(f.a, f.b.a), or(f.a, f.b.b))
    if (f.a.op === '∧') return and(or(f.a.a, f.b), or(f.a.b, f.b))
    return null
  },
}

// One pass: every subformula rewritten once, inside first.
function pass(f, law) {
  const inner = f.op === '¬' ? not(pass(f.a, law)) : f.a ? bin(f.op, pass(f.a, law), pass(f.b, law)) : f
  return law(inner) ?? inner
}

/** A formula with `law` used everywhere it applies, until it applies nowhere. */
export function toEnd(f, law, limit = 200) {
  let cur = f
  for (let k = 0; k < limit; k++) {
    const next = pass(cur, law)
    if (show(next) === show(cur)) return cur
    cur = next
  }
  throw new Error('the law never stops applying')
}

/** Negation normal form: no →, no ↔, ¬ only on letters. */
export const nnf = (f) => toEnd(toEnd(toEnd(f, LAWS.impOr), LAWS.dm), LAWS.dneg)
/** Conjunctive normal form: NNF, and no ∧ under an ∨. */
export const cnf = (f) => toEnd(nnf(f), LAWS.dist)

const literal = (f) => f.op === 'atom' || (isNeg(f) && f.a.op === 'atom')
export const isNnf = (f) => literal(f) || f.op === '⊥' || ((f.op === '∧' || f.op === '∨') && isNnf(f.a) && isNnf(f.b))
const isClause = (f) => literal(f) || f.op === '⊥' || (f.op === '∨' && isClause(f.a) && isClause(f.b))
export const isCnf = (f) => isClause(f) || (f.op === '∧' && isCnf(f.a) && isCnf(f.b))
export const hasDneg = (f) => (isNeg(f) && isNeg(f.a)) || (f.op === '¬' ? hasDneg(f.a) : f.a ? hasDneg(f.a) || hasDneg(f.b) : false)
export const hasArrow = (f) => f.op === '→' || f.op === '↔' || (f.op === '¬' ? hasArrow(f.a) : f.a ? hasArrow(f.a) || hasArrow(f.b) : false)

/** Do two formulas agree on every row of their truth table? */
export function equivalent(f, g) {
  const letters = lettersOf([f, g])
  return rowsOf(letters).every((row) => valueOn(f, row) === valueOn(g, row))
}

/* ---------- clauses ---------- */

const litOf = (f) => (isNeg(f) ? `¬${show(f.a)}` : show(f))
const flip = (l) => (l.startsWith('¬') ? l.slice(1) : `¬${l}`)
export const clauseKey = (c) => c.join(' ∨ ')
const tidy = (lits) => [...new Set(lits)].sort()
const tautological = (c) => c.some((l) => c.includes(flip(l)))

/** A clause from a disjunction of literals (or ⊥, the empty clause); null when it is not one. */
export function clauseOf(f) {
  if (f.op === '⊥') return []
  if (literal(f)) return [litOf(f)]
  if (f.op !== '∨') return null
  const [a, b] = [clauseOf(f.a), clauseOf(f.b)]
  return a && b ? tidy([...a, ...b]) : null
}
/** A clause written back as a formula (⊥ for the empty one). */
export function clauseFormula(c) {
  if (!c.length) return BOT
  const lit = (l) => (l.startsWith('¬') ? not(atom(l.slice(1))) : atom(l))
  return c.slice(1).reduce((acc, l) => or(acc, lit(l)), lit(c[0]))
}

/** A clause set (deduplicated, tautologies dropped) from clauses. */
export const clauseSet = (clauses) => {
  const seen = new Map()
  for (const c of clauses.map(tidy)) if (!tautological(c)) seen.set(clauseKey(c), c)
  return [...seen.values()].sort((a, b) => a.length - b.length || clauseKey(a).localeCompare(clauseKey(b)))
}

/** The clauses of a formula in CNF; null when it is not in CNF. */
export function clausesOf(f) {
  if (f.op === '∧') {
    const [a, b] = [clausesOf(f.a), clausesOf(f.b)]
    return a && b ? clauseSet([...a, ...b]) : null
  }
  const c = clauseOf(f)
  return c ? clauseSet([c]) : null
}

/** The resolvents of two clauses, one per complementary pair. */
export function resolvents(c, d) {
  return c.filter((l) => d.includes(flip(l))).map((l) => tidy([...c.filter((x) => x !== l), ...d.filter((x) => x !== flip(l))]))
}

export const refuted = (set) => set.some((c) => !c.length)

/** One round of resolution: the set with every new resolvent of every pair added (nothing more once ⊥ is in). */
export function resolveRound(set) {
  if (refuted(set)) return set
  const out = [...set]
  for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) out.push(...resolvents(set[i], set[j]))
  return clauseSet(out)
}

export const sameSet = (a, b) => a.length === b.length && a.every((c, k) => clauseKey(c) === clauseKey(b[k]))

/** Resolution until ⊥ appears or no new clause does. */
export function saturate(set, limit = 60) {
  let cur = clauseSet(set)
  for (let k = 0; k < limit; k++) {
    const next = resolveRound(cur)
    if (refuted(next) || sameSet(next, cur)) return next
    cur = next
  }
  throw new Error('saturation did not stop')
}

/** Is a clause set closed under resolution (every resolvent already in it, or a tautology)? */
export const closed = (set) => sameSet(resolveRound(set), set)

/** A row of truth values making every clause true, from letters to booleans; null when there is none. */
export function model(set) {
  const letters = [...new Set(set.flat().map((l) => l.replace('¬', '')))].sort()
  const holds = (row, l) => (l.startsWith('¬') ? !row[l.slice(1)] : row[l])
  return rowsOf(letters).find((row) => set.every((c) => c.some((l) => holds(row, l)))) ?? null
}
