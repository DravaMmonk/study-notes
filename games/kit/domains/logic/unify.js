// Unification and first-order clauses (《证明完毕》 chapter 7). An equation set is solved by six rules (Martelli and
// Montanari), each a card of the machine board; a first-order formula is put into clause form (negation normal form,
// quantifiers to the front, Skolem functions for ∃, CNF, clauses); clauses are resolved by unifying a pair of
// opposite literals, after renaming the two clauses apart.
//
// A first-order clause is a list of literal strings ('P(x, f(a))', '¬Q(y)'), like a propositional one (clauses.js):
// in them a variable is a name u, v, w, x, y or z (with digits), every other lower-case name a constant.
import { all, and, atom, bin, fn, not, or, parse, show, showTerm, tvar } from './formula.js'
import { cnf } from './clauses.js'

const T = (zh, en) => ({ zh, en })
export const isVarName = (name) => /^[u-z]\d*$/.test(name)

/** A formula or term written in this chapter's convention: u…z variables, any other lower-case name a constant. */
export function parseFo(text) {
  const names = text.match(/\b[a-z][A-Za-z0-9_']*/g) ?? []
  return parse(text, { consts: names.filter((n) => !isVarName(n)) })
}
export const parseTerm = (text) => parseFo(`${text} = ${text}`).args[0]

/* ---------- terms and substitutions ---------- */

export const termKey = showTerm
export const sameTerm = (s, t) => termKey(s) === termKey(t)
const isVar = (t) => t.t === 'var'
export const occurs = (x, t) => (isVar(t) ? t.name === x : t.args.some((a) => occurs(x, a)))
/** A term with the variables in σ ({ x: term }) replaced, once (a solved substitution needs no more). */
export const applyT = (t, σ) => (isVar(t) ? σ[t.name] ?? t : fn(t.f, t.args.map((a) => applyT(a, σ))))
const applyAtom = (a, σ) => atom(a.pred, a.args.map((t) => applyT(t, σ)))

/* ---------- equation sets and the six rules ---------- */

// An equation set: { eqs: [[s, t]], fail: null | why }. Each rule rewrites the first equation it applies to, or
// returns null when it applies to none.
const eqKey = ([s, t]) => `${termKey(s)} = ${termKey(t)}`
const replaceAt = (eqs, i, ins) => [...eqs.slice(0, i), ...ins, ...eqs.slice(i + 1)]

export const UNIFY_RULES = {
  // t = t: drop it.
  delete: (eqs) => {
    const i = eqs.findIndex(([s, t]) => sameTerm(s, t))
    return i < 0 ? null : { eqs: replaceAt(eqs, i, []) }
  },
  // f(s1…sn) = f(t1…tn): s1 = t1, …, sn = tn.
  decompose: (eqs) => {
    const i = eqs.findIndex(([s, t]) => !isVar(s) && !isVar(t) && s.f === t.f && s.args.length === t.args.length && !sameTerm(s, t))
    return i < 0 ? null : { eqs: replaceAt(eqs, i, eqs[i][0].args.map((a, k) => [a, eqs[i][1].args[k]])) }
  },
  // f(…) = g(…): no unifier.
  conflict: (eqs) => {
    const e = eqs.find(([s, t]) => !isVar(s) && !isVar(t) && (s.f !== t.f || s.args.length !== t.args.length))
    return e ? { eqs, fail: T(`${eqKey(e)}：两边的符号不同，永远对不上`, `${eqKey(e)}: the two sides have different symbols and never match`) } : null
  },
  // t = x, t not a variable: x = t.
  swap: (eqs) => {
    const i = eqs.findIndex(([s, t]) => !isVar(s) && isVar(t))
    return i < 0 ? null : { eqs: replaceAt(eqs, i, [[eqs[i][1], eqs[i][0]]]) }
  },
  // x = t with x inside t: no unifier.
  check: (eqs) => {
    const e = eqs.find(([s, t]) => isVar(s) && !sameTerm(s, t) && occurs(s.name, t))
    return e ? { eqs, fail: T(`${eqKey(e)}：x 出现在右边里面，换进去永远换不完`, `${eqKey(e)}: the variable occurs inside the other side, and replacing it never ends`) } : null
  },
  // x = t, x not in t, x elsewhere: put t for x everywhere else.
  eliminate: (eqs) => {
    const i = eqs.findIndex(([s, t], k) => isVar(s) && !occurs(s.name, t) && eqs.some((e, j) => j !== k && (occurs(s.name, e[0]) || occurs(s.name, e[1]))))
    if (i < 0) return null
    const [x, t] = eqs[i]
    const σ = { [x.name]: t }
    return { eqs: eqs.map((e, j) => (j === i ? e : [applyT(e[0], σ), applyT(e[1], σ)])) }
  },
}

/** Is an equation set solved: x1 = t1, … with distinct variables on the left, none of them anywhere on a right? */
export function solved(eqs) {
  const lefts = eqs.map(([s]) => s)
  if (!lefts.every(isVar) || new Set(lefts.map((x) => x.name)).size !== lefts.length) return false
  return eqs.every(([, t]) => lefts.every((x) => !occurs(x.name, t)))
}

/** The most general unifier of an equation set, as a substitution, or null. */
export function mgu(eqs0, onStep = null) {
  let state = { eqs: eqs0, fail: null }
  for (let k = 0; k < 500 && !state.fail && !solved(state.eqs); k++) {
    const rule = ['delete', 'decompose', 'conflict', 'swap', 'check', 'eliminate'].find((r) => UNIFY_RULES[r](state.eqs))
    if (!rule) break
    const next = UNIFY_RULES[rule](state.eqs)
    state = { eqs: next.eqs, fail: next.fail ?? null }
    onStep?.(state, rule)
  }
  if (state.fail || !solved(state.eqs)) return null
  return Object.fromEntries(state.eqs.map(([x, t]) => [x.name, t]))
}

/* ---------- clause form ---------- */

// NNF with quantifiers: ¬∀ is ∃¬, ¬∃ is ∀¬; no → or ↔.
export function foNnf(f) {
  const go = (g, neg) => {
    switch (g.op) {
      case 'atom': return neg ? not(g) : g
      case '⊥': return neg ? { op: 'atom', pred: 'True', args: [] } : g
      case '¬': return go(g.a, !neg)
      case '∧': case '∨': return bin(neg === (g.op === '∧') ? '∨' : '∧', go(g.a, neg), go(g.b, neg))
      case '→': return go(or(not(g.a), g.b), neg)
      case '↔': return go(and(or(not(g.a), g.b), or(not(g.b), g.a)), neg)
      case '∀': case '∃': return { op: neg === (g.op === '∀') ? '∃' : '∀', v: g.v, body: go(g.body, neg) }
      default: return g
    }
  }
  return go(f, false)
}
export const hasQuantifierInside = (f) => (f.op === '∀' || f.op === '∃' ? hasQuantifierInside(f.body) : quantified(f))
const quantified = (f) => f.op === '∀' || f.op === '∃' || (f.op === '¬' ? quantified(f.a) : f.a ? quantified(f.a) || quantified(f.b) : false)
export const isPrenex = (f) => (f.op === '∀' || f.op === '∃' ? isPrenex(f.body) : !quantified(f))

let fresh = 0
const renameBound = (f, used) => {
  // Every bound variable gets a name of its own, so pulling quantifiers out captures nothing.
  const go = (g, σ) => {
    switch (g.op) {
      case 'atom': return applyAtom(g, σ)
      case '¬': return not(go(g.a, σ))
      case '∀': case '∃': {
        let v = g.v
        while (used.has(v)) v = `${g.v.replace(/\d+$/, '')}${++fresh}`
        used.add(v)
        return { op: g.op, v, body: go(g.body, { ...σ, [g.v]: tvar(v) }) }
      }
      default: return g.a ? bin(g.op, go(g.a, σ), go(g.b, σ)) : g
    }
  }
  return go(f, {})
}
/** Prenex form of an NNF formula: every quantifier pulled to the front, in order, bound variables renamed apart. */
export function prenex(f0) {
  fresh = 0
  const f = renameBound(f0, new Set())
  const prefix = []
  const pull = (g) => {
    if (g.op === '∀' || g.op === '∃') { prefix.push([g.op, g.v]); return pull(g.body) }
    if (g.op === '∧' || g.op === '∨') return bin(g.op, pull(g.a), pull(g.b))
    return g
  }
  const matrix = pull(f)
  return prefix.reduceRight((acc, [q, v]) => ({ op: q, v, body: acc }), matrix)
}
/** Skolem form of a prenex formula: each ∃ variable replaced by a new function of the ∀ variables before it. */
export function skolem(f) {
  const σ = {}
  const before = []
  let k = 0
  let g = f
  const out = []
  while (g.op === '∀' || g.op === '∃') {
    if (g.op === '∀') { before.push(tvar(g.v)); out.push(g.v) } else σ[g.v] = fn(`sk${++k}`, [...before])
    g = g.body
  }
  const sub = (h) => (h.op === 'atom' ? applyAtom(h, σ) : h.op === '¬' ? not(sub(h.a)) : h.a ? bin(h.op, sub(h.a), sub(h.b)) : h)
  return out.reduceRight((acc, v) => all(v, acc), sub(g))
}
export const hasExists = (f) => f.op === '∃' || (f.op === '∀' ? hasExists(f.body) : f.op === '¬' ? hasExists(f.a) : f.a ? hasExists(f.a) || hasExists(f.b) : false)
/** The matrix of a universal prenex formula (the ∀s dropped: a clause's variables are read as for all). */
export const matrixOf = (f) => (f.op === '∀' ? matrixOf(f.body) : f)

/** The clause form of a first-order formula: NNF, prenex, Skolem, CNF of the matrix, clauses. */
export function clauseFormOf(f) {
  const m = matrixOf(skolem(prenex(foNnf(f))))
  return foClausesOf(cnf(m))
}

/* ---------- first-order clauses ---------- */

const litOf = (f) => (f.op === '¬' ? `¬${show(f.a)}` : show(f))
const flipLit = (l) => (l.startsWith('¬') ? l.slice(1) : `¬${l}`)
export const parseLit = (l) => {
  const neg = l.startsWith('¬')
  return { neg, atom: parseFo(neg ? l.slice(1) : l) }
}
const writeLit = ({ neg, atom: a }) => (neg ? `¬${show(a)}` : show(a))
const tidy = (lits) => [...new Set(lits)].sort()
// A clause with its literals in a fixed order (by their shape, variables aside) and its variables named in order of
// appearance (v1, v2 …), so clauses equal up to renaming look equal.
function canonical(c) {
  const shape = (l) => l.replace(/\b[u-z]\d*\b/g, '_')
  const lits = tidy(c).sort((x, y) => shape(x).localeCompare(shape(y)) || x.localeCompare(y))
  const names = new Map()
  const ren = (t) => {
    if (!isVar(t)) return fn(t.f, t.args.map(ren))
    if (!names.has(t.name)) names.set(t.name, `v${names.size + 1}`)
    return tvar(names.get(t.name))
  }
  return lits.map(parseLit).map(({ neg, atom: a }) => writeLit({ neg, atom: atom(a.pred, a.args.map(ren)) }))
}
const tautology = (c) => c.some((l) => c.includes(flipLit(l)))

/** A first-order clause set: clauses in canonical form, each once, tautologies dropped. */
export function foSet(clauses) {
  const seen = new Map()
  for (const c of clauses) {
    const k = canonical(c)
    if (!tautology(k)) seen.set(k.join(' ∨ '), k)
  }
  return [...seen.values()].sort((a, b) => a.length - b.length || a.join().localeCompare(b.join()))
}

/** The clauses of a quantifier-free CNF formula; null when it is not CNF. */
export function foClausesOf(f) {
  if (f.op === '∧') {
    const [a, b] = [foClausesOf(f.a), foClausesOf(f.b)]
    return a && b ? foSet([...a, ...b]) : null
  }
  const clause = (g) => (g.op === '⊥' ? [] : g.op === 'atom' || (g.op === '¬' && g.a.op === 'atom') ? [litOf(g)] : g.op === '∨' ? [clause(g.a), clause(g.b)].every(Boolean) && [...clause(g.a), ...clause(g.b)] : null)
  const c = clause(f)
  return c ? foSet([c]) : null
}

// A clause's variables renamed with a suffix, so two clauses share none.
const apart = (c, tag) => c.map(parseLit).map(({ neg, atom: a }) => ({ neg, atom: atom(a.pred, a.args.map(function ren(t) { return isVar(t) ? tvar(`${t.name}${tag}`) : fn(t.f, t.args.map(ren)) })) }))

/** Every resolvent of two clauses: renamed apart, one complementary pair unified at a time. */
export function foResolvents(c, d) {
  // Tags are digits, so a renamed variable is still a variable's name; the two clauses' tags never meet.
  const [a, b] = [apart(c, '1'), apart(d, '2')]
  const out = []
  a.forEach((la, i) => b.forEach((lb, j) => {
    if (la.neg === lb.neg || la.atom.pred !== lb.atom.pred || la.atom.args.length !== lb.atom.args.length) return
    const σ = mgu(la.atom.args.map((t, k) => [t, lb.atom.args[k]]))
    if (!σ) return
    out.push([...a.filter((_, k) => k !== i), ...b.filter((_, k) => k !== j)].map(({ neg, atom: x }) => writeLit({ neg, atom: applyAtom(x, σ) })))
  }))
  return out
}

/**
 * One round of first-order resolution, unit resolution: every resolvent of every pair in which one clause has a single
 * literal, added. Resolving two long clauses is left out, which keeps the rounds from flooding (a transitivity rule
 * resolved with itself never stops); with factoring this finds a refutation of every Horn set, though not of every
 * clause set.
 */
export function foResolveRound(set) {
  if (set.some((c) => !c.length)) return set
  const out = [...set]
  for (let i = 0; i < set.length; i++) for (let j = i; j < set.length; j++) if (set[i].length === 1 || set[j].length === 1) out.push(...foResolvents(set[i], set[j]))
  return foSet(out)
}

/** Factors: two literals of the same sign in a clause unified into one. */
export function factorRound(set) {
  const out = [...set]
  for (const c of set) {
    const lits = c.map(parseLit)
    lits.forEach((l, i) => lits.forEach((m, j) => {
      if (j <= i || l.neg !== m.neg || l.atom.pred !== m.atom.pred) return
      const σ = mgu(l.atom.args.map((t, k) => [t, m.atom.args[k]]))
      if (σ) out.push(lits.filter((_, k) => k !== j).map(({ neg, atom: x }) => writeLit({ neg, atom: applyAtom(x, σ) })))
    }))
  }
  return foSet(out)
}

/** Resolution with factoring until ⊥, nothing new, or `limit` rounds (null then: it did not stop). */
export function foSaturate(set, limit = 8) {
  let cur = foSet(set)
  for (let k = 0; k < limit; k++) {
    if (cur.some((c) => !c.length)) return cur
    const next = factorRound(foResolveRound(cur))
    if (next.length === cur.length && next.every((c, i) => c.join() === cur[i].join())) return cur
    cur = next.length > 2000 ? null : next
    if (!cur) return null
  }
  return cur.some((c) => !c.length) ? cur : null
}


/** A clause (propositional or first-order) as a formula: its literals joined by ∨, ⊥ when empty. */
export function clauseFormulaOf(c) {
  if (!c.length) return { op: '⊥' }
  const lits = c.map(parseLit).map(({ neg, atom: a }) => (neg ? not(a) : a))
  return lits.slice(1).reduce((acc, l) => or(acc, l), lits[0])
}
