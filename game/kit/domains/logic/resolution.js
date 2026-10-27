// Clauses and resolution (《证明完毕》 chapter 13): what an automatic prover works on. A proof state whose goal is ⊥ is
// split into clauses (its hypotheses, each a conjunction of disjunctions of literals, ∀ dropped); resolution cancels a
// pair of opposite literals of two clauses (unifying them first, when they have variables), round after round, until
// the empty clause ⊥ appears or nothing new does. Every clause made remembers the clauses it came from: the steps that
// lead to ⊥ are the certificate, and replaying it checks each step as a use of the resolution lemma the player proved
// (one pair cancelled, the parents taken at what unification made of them), so a prover that is wrong is caught.
//
//   literal  { neg, atom }                 a variable is a term { t: 'var' }, read as “for all”
//   clause   { lits: [literal], key, from?: [index], inst?: [σ] }   lits sorted and each once; no lits is ⊥; `from`:
//            its parents, `inst`: what each parent's variables became in it
//   value    { kind: 'clauses', set: [clause], from?: state, endless? }   `from`: the state it was split from
import { BOT, all, atom, fn, not, or, show, tvar } from './formula.js'

const T = (zh, en) => ({ zh, en })

/* ---------- literals and clauses ---------- */

const litText = (l) => `${l.neg ? '¬' : ''}${show(l.atom)}`
const flipped = (l) => ({ neg: !l.neg, atom: l.atom })
const termVars = (t, out) => { if (t.t === 'var') out.push(t.name); else t.args.forEach((a) => termVars(a, out)); return out }
const litVars = (l) => l.atom.args.flatMap((t) => termVars(t, []))
const mapTerms = (l, g) => ({ neg: l.neg, atom: atom(l.atom.pred, l.atom.args.map(g)) })
const renameT = (t, names) => (t.t === 'var' ? tvar(names[t.name] ?? t.name) : fn(t.f, t.args.map((a) => renameT(a, names))))
const VARS = ['x', 'y', 'z', 'u', 'v', 'w']
const varsOf = (c) => [...new Set(c.lits.flatMap(litVars))]

/**
 * A clause from its literals: each once, in order, its variables named x, y, z … as they first appear. `made`: its
 * parents and what their variables became (in the literals' own names, renamed here with them).
 */
export function clauseOf(lits, made) {
  // Order by the literal with its variables blanked, so renaming does not change the order.
  const blank = (l) => litText(mapTerms(l, function b(t) { return t.t === 'var' ? tvar('_') : fn(t.f, t.args.map(b)) }))
  const sorted = [...lits].sort((a, b) => blank(a).localeCompare(blank(b)) || litText(a).localeCompare(litText(b)))
  const names = {}
  for (const v of sorted.flatMap(litVars)) names[v] ??= VARS[Object.keys(names).length] ?? `x${Object.keys(names).length}`
  const named = sorted.map((l) => mapTerms(l, (t) => renameT(t, names)))
  const unique = [...new Map(named.map((l) => [litText(l), l])).values()]
  const out = { lits: unique, key: unique.map(litText).join(' ∨ ') }
  if (!made) return out
  const inst = made.inst.map((σ) => Object.fromEntries(Object.entries(σ).map(([v, t]) => [v, renameT(t, names)])))
  return { ...out, from: made.from, inst }
}
const tautology = (c) => c.lits.some((l) => c.lits.some((m) => l.neg !== m.neg && litText(flipped(l)) === litText(m)))
export const isEmpty = (c) => !c.lits.length
export const refuted = (set) => set.some(isEmpty)

/** Literals as a formula: joined by ∨ (⊥ for none). */
export const disjunction = (lits) => (lits.length ? lits.map((l) => (l.neg ? not(l.atom) : l.atom)).reduceRight((acc, f) => (acc ? or(f, acc) : f), null) : BOT)
/** A clause as a formula: its literals joined by ∨, its variables under ∀ (⊥ when it has none). */
export const clauseFormula = (c) => varsOf(c).reduceRight((f, v) => all(v, f), disjunction(c.lits))

/**
 * The resolution lemma, used once: two clauses' literals with exactly one opposite pair between them give the rest of
 * both, in order, each once ({ lits }); no pair or more than one is { fail: 'none' | 'more' }.
 */
export function cancelOne(c, d) {
  const pairs = c.filter((l) => d.some((m) => l.neg !== m.neg && litText(flipped(l)) === litText(m)))
  if (!pairs.length) return { fail: 'none' }
  if (pairs.length > 1) return { fail: 'more' }
  const [l] = pairs
  const rest = [...c.filter((x) => x !== l), ...d.filter((m) => litText(m) !== litText(flipped(l)))]
  return { lits: [...new Map(rest.map((x) => [litText(x), x])).values()] }
}
/** A clause as written. */
export const clauseText = (c) => (c.lits.length ? c.key : '⊥')

/** A formula's literals, when it is one disjunction of literals (A, ¬A …), or null. */
export function literalsIn(f) {
  if (f.op === 'atom') return [{ neg: false, atom: f }]
  if (f.op === '¬' && f.a.op === 'atom') return [{ neg: true, atom: f.a }]
  if (f.op === '⊥') return []
  if (f.op === '∨') { const a = literalsIn(f.a); const b = literalsIn(f.b); return a && b ? [...a, ...b] : null }
  return null
}

/** A clause written out ('¬Human(x) ∨ Mortal(x)', '⊥'), read with `parse`. */
export const parseClause = (text, parse) => {
  const lits = text.trim() === '⊥' ? [] : literalsIn(parse(text))
  if (!lits) throw new Error(`not a clause: ${text}`)
  return clauseOf(lits)
}

/* ---------- splitting a state into clauses ---------- */

// The clauses of one hypothesis: ∧ splits, ∀ is dropped (its variable kept as a variable), the rest must be a clause.
function clausesOfHyp(f, why) {
  if (f.op === '∧') return [...clausesOfHyp(f.a, why), ...clausesOfHyp(f.b, why)]
  if (f.op === '∀') return clausesOfHyp(f.body, why)
  if (f.op === '∃') throw why(T('已知里还有 ∃：先 Skolem 化', 'A hypothesis still has ∃: Skolemise first'))
  // ¬⊥ always holds: no clause. A ∀ inside a disjunction goes out too: in clauses every variable is “for all”.
  if (f.op === '¬' && f.a.op === '⊥') return []
  const strip = (g) => (g.op === '∀' ? strip(g.body) : g.op === '∨' ? or(strip(g.a), strip(g.b)) : g)
  const lits = literalsIn(strip(f))
  if (!lits) throw why(T(`「${show(f)}」还不是子句：已知要先化成合取范式`, `“${show(f)}” is not a clause yet: bring the hypotheses to CNF first`))
  return [lits]
}

/** The clause set of a state: the hypotheses of its first goal, which must be ⊥. Throws a { zh, en } as an Error. */
export function clausesOfState(s, why) {
  const g = s.goals[0]
  if (!g) throw why(T('已经没有目标了', 'No goals left'))
  if (g.goal.op !== '⊥') throw why(T('第一个目标还不是 ⊥：先把要证的那句否定了放进已知', 'The first goal is not ⊥ yet: negate what is to be proved and put it among the hypotheses first'))
  const set = []
  for (const h of g.hyps) for (const lits of clausesOfHyp(h, why)) {
    const c = clauseOf(lits)
    if (!tautology(c) && !set.some((d) => d.key === c.key)) set.push(c)
  }
  return set
}

/* ---------- unification of terms ---------- */

function unifyTerms(pairs) {
  const σ = {}
  const walk = (t) => (t.t === 'var' && σ[t.name] ? walk(σ[t.name]) : t)
  const occurs = (x, t) => { const u = walk(t); return u.t === 'var' ? u.name === x : u.args.some((a) => occurs(x, a)) }
  const stack = [...pairs]
  while (stack.length) {
    const [a0, b0] = stack.pop()
    const [a, b] = [walk(a0), walk(b0)]
    if (a.t === 'var' && b.t === 'var' && a.name === b.name) continue
    if (a.t === 'var') { if (occurs(a.name, b)) return null; σ[a.name] = b; continue }
    if (b.t === 'var') { stack.push([b, a]); continue }
    if (a.f !== b.f || a.args.length !== b.args.length) return null
    a.args.forEach((x, k) => stack.push([x, b.args[k]]))
  }
  const full = (t) => { const u = walk(t); return u.t === 'var' ? u : fn(u.f, u.args.map(full)) }
  return full
}
const unifyAtoms = (p, q) => (p.pred === q.pred && p.args.length === q.args.length ? unifyTerms(p.args.map((a, k) => [a, q.args[k]])) : null)

/* ---------- resolution ---------- */

// Two clauses apart: the second's variables renamed so the two share none.
const apartName = (v) => `${v}′`
const apart = (c) => c.lits.map((l) => mapTerms(l, function r(t) { return t.t === 'var' ? tvar(apartName(t.name)) : fn(t.f, t.args.map(r)) }))

/**
 * Every resolvent of two clauses: for each pair of opposite literals that unify, the rest of both, unified; with what
 * each parent's variables became.
 */
export function resolvents(c, d) {
  const b = apart(d)
  const out = []
  c.lits.forEach((l, i) => b.forEach((m, j) => {
    if (l.neg === m.neg) return
    const σ = unifyAtoms(l.atom, m.atom)
    if (!σ) return
    const lits = [...c.lits.filter((_, k) => k !== i), ...b.filter((_, k) => k !== j)].map((x) => mapTerms(x, σ))
    const inst = [Object.fromEntries(varsOf(c).map((v) => [v, σ(tvar(v))])), Object.fromEntries(varsOf(d).map((v) => [v, σ(tvar(apartName(v)))]))]
    out.push({ lits, inst })
  }))
  return out
}
/** A clause's factors: two literals of the same sign that unify become one. */
function factors(c) {
  const out = []
  c.lits.forEach((l, i) => c.lits.forEach((m, j) => {
    if (j <= i || l.neg !== m.neg) return
    const σ = unifyAtoms(l.atom, m.atom)
    if (σ) out.push({ lits: c.lits.filter((_, k) => k !== j).map((x) => mapTerms(x, σ)), inst: [Object.fromEntries(varsOf(c).map((v) => [v, σ(tvar(v))]))] })
  }))
  return out
}

const CAP = 1500
/**
 * One round: every pair of clauses resolved (with `unit`, only pairs where one clause has a single literal), and every
 * new clause factored; what is new is added, each with its parents. A tautology is never added.
 */
export function resolveRound(set, { unit = false } = {}) {
  const out = [...set]
  const seen = new Set(set.map((c) => c.key))
  // A clause with no variables that holds every literal of one already there says less than it: it is left out.
  const ground = (c) => !varsOf(c).length
  const texts = (c) => new Set(c.lits.map(litText))
  const sets = out.filter(ground).map(texts)
  const subsumed = (c) => ground(c) && sets.some((t) => [...t].every((l) => texts(c).has(l)))
  const add = ({ lits, inst }, from) => {
    const c = clauseOf(lits, { from, inst })
    if (tautology(c) || seen.has(c.key) || out.length >= CAP || subsumed(c)) return
    if (ground(c)) sets.push(texts(c))
    seen.add(c.key)
    out.push(c)
    const k = out.length - 1
    for (const f of factors(c)) add(f, [k])
  }
  for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) {
    if (unit && set[i].lits.length !== 1 && set[j].lits.length !== 1) continue
    for (const r of resolvents(set[i], set[j])) add(r, [i, j])
  }
  return out
}

/**
 * Someone else's prover (a level hands it over to be caught): it cancels every opposite pair two clauses have at
 * once, which does not follow from them.
 */
export function oracleRound(set) {
  const out = [...set]
  const seen = new Set(set.map((c) => c.key))
  for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) {
    const [c, d] = [set[i], set[j]]
    const gone = c.lits.filter((l) => d.lits.some((m) => litText(flipped(l)) === litText(m)))
    if (!gone.length) continue
    const keep = [...c.lits, ...d.lits].filter((l) => !gone.some((g) => litText(g) === litText(l) || litText(flipped(g)) === litText(l)))
    const r = clauseOf(keep, { from: [i, j], inst: [{}, {}] })
    if (!seen.has(r.key)) { seen.add(r.key); out.push(r) }
  }
  return out
}

/** Rounds until ⊥ appears or nothing new does (or the limit: then it never stops, `endless`). */
export function saturate(set, { round = resolveRound, limit = 30, onRound = null } = {}) {
  let cur = set
  for (let k = 0; k < limit; k++) {
    if (refuted(cur)) return { set: cur }
    const next = round(cur)
    if (next.length === cur.length) return { set: cur }
    cur = next
    onRound?.(cur, k + 1)
    if (cur.length >= CAP) return { set: cur, endless: true }
  }
  return { set: cur, endless: !refuted(cur) }
}

/** The clauses a ⊥ in the set comes from, in the order they were made: input clauses and steps. */
export function certificate(set) {
  const bot = set.findIndex(isEmpty)
  if (bot < 0) return null
  const need = new Set()
  const visit = (i) => { if (need.has(i)) return; need.add(i); (set[i].from ?? []).forEach(visit) }
  visit(bot)
  return [...need].sort((a, b) => a - b)
}

/* ---------- replay ---------- */

const instTerm = (t, σ) => (t.t === 'var' ? σ[t.name] ?? t : fn(t.f, t.args.map((a) => instTerm(a, σ))))
const instLits = (c, σ) => c.lits.map((l) => mapTerms(l, (t) => instTerm(t, σ)))
const sameLits = (a, b) => [...new Set(a.map(litText))].sort().join() === [...new Set(b.map(litText))].sort().join()

/**
 * A certificate replayed, from the state the clauses were split from: each input clause used must be a conjunct of a
 * hypothesis with its ∀ taken (Split ∧, Take one); each step must be a use of the resolution lemma on its parents taken
 * at what their variables became (Take one), or a parent taken so two of its literals meet (Take one, A ∨ A is A). The
 * state with its first goal proved, or { fail } naming the step that is not one.
 */
export function replay(value) {
  const s = value.from
  if (!s) return { fail: T('这组子句不是从证明状态拆出来的，没有可以证的目标', 'These clauses were not split from a proof state: there is no goal to prove') }
  if (s.choice) return { fail: T('已知里有 ∀ 底下换成的 Skolem 函数：它不是已知推出来的，核里重放不了', 'The hypotheses have a Skolem function put in under ∀: it does not follow from them, so the kernel cannot replay it') }
  const used = certificate(value.set)
  if (!used) return { fail: T('子句里还没有 ⊥：没有证书可以重放', 'There is no ⊥ among the clauses: no certificate to replay') }
  const inputs = new Set(clausesOfState(s, (t) => new Error(t.en)).map((c) => c.key))
  for (const [n, i] of used.entries()) {
    const c = value.set[i]
    const parents = (c.from ?? []).map((k, j) => instLits(value.set[k], c.inst[j]))
    const what = (zh, en) => T(`第 ${n + 1} 步：${zh}`, `Step ${n + 1}: ${en}`)
    const named = (c.from ?? []).map((k) => clauseText(value.set[k]))
    if (!c.from) {
      if (!inputs.has(c.key)) return { fail: what(`子句 ${clauseText(c)} 不在已知里`, `the clause ${clauseText(c)} is not among the hypotheses`) }
    } else if (parents.length === 1) {
      if (!sameLits(parents[0], c.lits)) return { fail: what(`${clauseText(c)} 不是 ${named[0]} 取出来的样子`, `${clauseText(c)} is not ${named[0]} taken at some things`) }
    } else {
      const r = cancelOne(...parents)
      if (r.fail === 'more') return { fail: what(`${named.join('、')} 之间有不止一对相反的文字，归结一次只消一对`, `${named.join(' and ')} have more than one opposite pair, and resolution cancels one pair at a time`) }
      if (r.fail || !sameLits(r.lits, c.lits)) return { fail: what(`由 ${named.join('、')} 归结不出 ${clauseText(c)}`, `${clauseText(c)} does not come of resolving ${named.join(' and ')}`) }
    }
  }
  return { state: { ...s, goals: s.goals.slice(1), error: undefined, more: undefined } }
}
