// Rewriting (《证明完毕》 chapter 9 on): a rewrite rule replaces what fits its left side by its right side, in the first
// goal of a proof state (tactics.js), at the first place it fits: outermost first, then left to right, under
// quantifiers too. A rule is an equivalence of sentences or an equation of things, its ?-letters filled in by
// matching; one with conditions leaves each condition, filled in, as a goal after the rewritten one.
//
//   rule  { key, name, lhs, rhs, conditions: [formula], group: 'law' | 'def' | 'hyp' }
//
// Where rules come from (rewriteBookOf): a lemma's two shapes that are each other's converse (¬¬A gives A and A gives
// ¬¬A: either way round is a rule), the equations proved (the course's `facts`, chapter 10), the level's definitions (`defs`: equations, maybe with conditions, their
// variables standing for anything), and the goal's own hypotheses (the card's rule 'hyp': the first hypothesis that is
// an equation or an equivalence and fits somewhere, its ∀ variables standing for anything).
import { atom, bin, fn, same, show, showTerm, subst, tvar } from './formula.js'
import { instantiate, isMetaName, lemmaRules, metasIn, parseS } from './schematic.js'

const T = (zh, en) => ({ zh, en })
const isTerm = (x) => 't' in x
const NO_GOALS = T('已经没有目标了', 'No goals left')

/* ---------- matching ---------- */

const termKey = (t) => showTerm(t)
// The free variables of a formula or term.
function freeIn(x, out = new Set(), bound = new Set()) {
  if (isTerm(x)) {
    if (x.t === 'var') { if (!bound.has(x.name)) out.add(x.name) } else x.args.forEach((a) => freeIn(a, out, bound))
    return out
  }
  switch (x.op) {
    case 'meta': case 'atom': (x.args ?? []).forEach((a) => freeIn(a, out, bound)); break
    case '¬': freeIn(x.a, out, bound); break
    case '∀': case '∃': freeIn(x.body, out, new Set([...bound, x.v])); break
    case '⊥': break
    default: freeIn(x.a, out, bound); freeIn(x.b, out, bound)
  }
  return out
}
function bind(σ, name, value) {
  const had = σ[name]
  if (!had) { σ[name] = value; return true }
  if (isTerm(had) || isTerm(value)) return isTerm(had) && isTerm(value) && termKey(had) === termKey(value)
  if (had.op === 'lam' || value.op === 'lam') return had.op === value.op && had.params.join() === value.params.join() && same(had.body, value.body)
  return same(had, value)
}
// The pattern p (a rule's side, with ?-letters) fitted to x, filling σ. `env` pairs the pattern's bound variables with
// x's, `inside` the variables bound inside the pattern around x (a ?-letter applied to bound variables, ?P(x), may
// take those it is applied to, and none other bound inside the pattern; what is bound around the whole place is in
// scope wherever the result goes).
function matchTerm(p, x, σ, env) {
  if (p.t === 'var') {
    if (isMetaName(p.name)) return bind(σ, p.name, x)
    return x.t === 'var' && (env.get(p.name) ?? p.name) === x.name
  }
  return x.t === 'fn' && p.f === x.f && p.args.length === x.args.length && p.args.every((a, k) => matchTerm(a, x.args[k], σ, env))
}
function matchForm(p, x, σ, env, inside, names = {}) {
  if (p.op === 'meta') {
    if (!p.args?.length) return bind(σ, p.name, x)
    const params = p.args.map((a) => (a.t === 'var' ? env.get(a.name) : null))
    if (params.some((v) => !v)) return false
    if ([...freeIn(x)].some((v) => inside.has(v) && !params.includes(v))) return false
    return bind(σ, p.name, { op: 'lam', params, body: x })
  }
  if (p.op !== x.op) return false
  switch (p.op) {
    case 'atom': return p.pred === x.pred && p.args.length === x.args.length && p.args.every((a, k) => matchTerm(a, x.args[k], σ, env))
    case '⊥': return true
    case '¬': return matchForm(p.a, x.a, σ, env, inside, names)
    case '∀': case '∃':
      names[p.v] = x.v
      return matchForm(p.body, x.body, σ, new Map([...env, [p.v, x.v]]), new Set([...inside, x.v]), names)
    default: return matchForm(p.a, x.a, σ, env, inside, names) && matchForm(p.b, x.b, σ, env, inside, names)
  }
}

/* ---------- one rewrite ---------- */

// A rule's side with its bound variables named as the place it fitted named them (`names`), so what is put in for its
// ?-letters is never caught by them: ¬∃y. P(y, x) ⟼ ∀y. ¬P(y, x), not ∀x. ¬P(x, x).
function renamed(f, names) {
  const term = (t, map) => (t.t === 'var' ? (map[t.name] ? tvar(map[t.name]) : t) : fn(t.f, t.args.map((a) => term(a, map))))
  const go = (g, map) => {
    switch (g.op) {
      case 'atom': return atom(g.pred, g.args.map((a) => term(a, map)))
      case 'meta': return g.args ? { ...g, args: g.args.map((a) => term(a, map)) } : g
      case '¬': return { op: '¬', a: go(g.a, map) }
      case '∀': case '∃': { const v = names[g.v] ?? g.v; return { op: g.op, v, body: go(g.body, { ...map, [g.v]: v }) } }
      case '⊥': return g
      default: return bin(g.op, go(g.a, map), go(g.b, map))
    }
  }
  return go(f, {})
}

// The formula f with the first place a rule fits replaced (pre-order: the place itself, then its parts left to
// right), and the σ it fitted with; null when it fits nowhere.
function rewriteOnce(f, rule) {
  const term = isTerm(rule.lhs)
  const tryAt = (x) => {
    const σ = {}
    const names = {}
    return (term ? matchTerm(rule.lhs, x, σ, new Map()) : matchForm(rule.lhs, x, σ, new Map(), new Set(), names)) ? { σ, rhs: term ? rule.rhs : renamed(rule.rhs, names) } : null
  }
  const inTerm = (t) => {
    const m = tryAt(t)
    if (m) return { to: instantiate(m.rhs, m.σ), σ: m.σ }
    if (t.t !== 'fn') return null
    for (let k = 0; k < t.args.length; k++) {
      const r = inTerm(t.args[k])
      if (r) return { to: fn(t.f, t.args.map((a, i) => (i === k ? r.to : a))), σ: r.σ }
    }
    return null
  }
  const inForm = (x) => {
    if (!term) {
      const m = tryAt(x)
      if (m) return { to: instantiate(m.rhs, m.σ), σ: m.σ }
    }
    switch (x.op) {
      case 'atom': {
        if (!term) return null
        for (let k = 0; k < x.args.length; k++) {
          const r = inTerm(x.args[k])
          if (r) return { to: atom(x.pred, x.args.map((a, i) => (i === k ? r.to : a))), σ: r.σ }
        }
        return null
      }
      case '¬': { const r = inForm(x.a); return r && { to: { op: '¬', a: r.to }, σ: r.σ } }
      case '∀': case '∃': { const r = inForm(x.body); return r && { to: { ...x, body: r.to }, σ: r.σ } }
      case 'meta': case '⊥': return null
      default: {
        const a = inForm(x.a)
        if (a) return { to: bin(x.op, a.to, x.b), σ: a.σ }
        const b = inForm(x.b)
        return b && { to: bin(x.op, x.a, b.to), σ: b.σ }
      }
    }
  }
  return inForm(f)
}

// A hypothesis (or an equation proved) as a rule, its ∀ variables standing for anything: an equation of things, or an
// equivalence. A hypothesis that still has a ?-letter of the proof in it is not one yet.
function hypRule(h) {
  if (metasIn(h).size) return null
  let f = h
  const vars = []
  while (f.op === '∀') { vars.push(f.v); f = f.body }
  const free = (x) => vars.reduce((g, v) => subst(g, v, tvar(`?${v}`)), x)
  if (f.op === 'atom' && f.pred === '=') {
    const [l, r] = free(f).args
    return { lhs: l, rhs: r }
  }
  if (f.op === '↔') return { lhs: free(f.a), rhs: free(f.b) }
  return null
}

/**
 * rw: the first goal with the rule used once, at the first place it fits; the rule's conditions, filled in, become
 * goals after it (with the same fixed things and hypotheses). The rule 'hyp' is the first hypothesis of the goal that
 * is an equation or an equivalence and fits somewhere. `at: 'hyps'` (Lean's simp at) rewrites the first goal's first
 * hypothesis the rule fits instead of the goal itself; a hypothesis is never a rule for another there.
 */
export function rewrite(s, rule, at = 'goal') {
  const g = s.goals[0]
  if (!g) return { fail: NO_GOALS }
  const after = (goal, r, done) => ({ results: [{ ...s, more: undefined, error: undefined, goals: [goal, ...r.conditions.map((c) => ({ ...g, goal: instantiate(c, done.σ) })), ...s.goals.slice(1)] }] })
  if (at === 'hyps') {
    if (rule.group === 'hyp') return { fail: T('已知里的等式只用来改目标', 'An equation given rewrites only the goal') }
    for (const [k, h] of g.hyps.entries()) {
      const done = rewriteOnce(h, rule)
      if (done) return after({ ...g, hyps: g.hyps.map((x, i) => (i === k ? done.to : x)) }, rule, done)
    }
    return { fail: T(`「${rule.name.zh}」的左边在第一个目标的已知里哪一处都对不上`, `The left side of “${rule.name.en}” fits nowhere in the first goal’s hypotheses`) }
  }
  const rules = rule.group === 'hyp' ? g.hyps.map(hypRule).filter(Boolean).map((r) => ({ ...rule, ...r, conditions: [] })) : [rule]
  for (const r of rules) {
    const done = rewriteOnce(g.goal, r)
    if (done) return after({ ...g, goal: done.to }, r, done)
  }
  if (rule.group === 'hyp') return { fail: T('目标的已知里，没有一条等式或等价对得上第一个目标的哪一处', 'No equation or equivalence among the hypotheses fits anywhere in the first goal') }
  return { fail: T(`「${rule.name.zh}」的左边在第一个目标里哪一处都对不上`, `The left side of “${rule.name.en}” fits nowhere in the first goal`) }
}

/**
 * A level's definitions working a sentence out: every thing in it rewritten by them (those without conditions) until
 * none fits, so two sentences that work out alike are one (definitional equality, pterm.js checkTerm `norm`).
 */
export function defNormal(defs = []) {
  const rules = defs.filter((d) => !d.includes('⟹')).map(defRule)
  return (f) => {
    let cur = f
    for (let k = 0; k < 200; k++) {
      const next = rules.map((r) => rewriteOnce(cur, r)).find(Boolean)
      if (!next) return cur
      cur = next.to
    }
    return cur
  }
}

/**
 * simp, as the player builds it: round after round, the first rule (in order) that fits rewrites the first goal once;
 * until no rule fits. (A repeat frame around alternatives holding one rewrite each.)
 */
export function simplify(s, rules, at = 'goal', limit = 60) {
  let cur = s
  for (let k = 0; k < limit; k++) {
    const next = rules.map((r) => rewrite(cur, r, at)).find((x) => !x.fail)
    if (!next) return { results: [cur] }
    cur = next.results[0]
  }
  return { fail: T(`改了 ${limit} 次还没停下来：有几条规则把句子改来改去`, `Still changing after ${limit} rewrites: some rules turn the sentence back and forth`) }
}

/* ---------- the rule book ---------- */

const plain = (f) => show(f)
/** A level's definitions as rules: 'l = r' or 'c1; c2 ⟹ l = r', their variables (u … z) standing for anything. */
function defRule(text, k) {
  const m = /^(?:(.*)⟹)?(.*)$/.exec(text)
  const free = (f) => [...freeIn(f)].reduce((g, v) => subst(g, v, tvar(`?${v}`)), f)
  const eq = free(parseS(m[2].trim()))
  const conditions = m[1] ? m[1].split(';').map((c) => free(parseS(c.trim()))) : []
  return { key: `def.${k}`, name: T(text, text), lhs: eq.args[0], rhs: eq.args[1], conditions, group: 'def', text }
}

const books = new WeakMap()
/**
 * A level's rewrite rules by key: each shape of a lemma whose converse shape the level holds too (keyed as the rule
 * book keys it, machine.js), the level's definitions, and 'hyp' (the goal's hypotheses).
 */
export function rewriteBookOf(level) {
  if (!books.has(level)) {
    const has = (p) => !level.holds || level.holds.includes(p)
    const laws = Object.entries(level.lemmas ?? {}).filter(([type, l]) => l.forms && has(type)).flatMap(([type, l]) => {
      const held = level.forms?.[type] ?? l.forms.map((f) => f.key)
      const rules = lemmaRules(type, l).filter((r) => r.premises.length === 1 && held.includes(r.key.split('.')[1] ?? l.forms[0].key))
      const sides = rules.map((r) => [plain(r.premises[0].show), plain(r.conclusion)])
      return rules.filter((_, k) => sides.some(([p, c]) => p === sides[k][1] && c === sides[k][0]))
        .map((r) => ({ key: r.key, name: r.name, lhs: r.premises[0].show, rhs: r.conclusion, conditions: [], group: 'law' }))
    })
    const defs = (level.defs ?? []).map(defRule)
    const facts = Object.entries(level.facts ?? {}).filter(([type]) => has(type)).map(([type, f]) => [type, f, hypRule(parseS(f.statement))]).filter(([, , r]) => r)
      .map(([type, f, r]) => ({ key: type, name: f.name, ...r, conditions: [], group: 'fact' }))
    const hyp = { key: 'hyp', name: T('已知里的等式', 'An equation given'), lhs: null, rhs: null, conditions: [], group: 'hyp' }
    books.set(level, Object.fromEntries([...laws, ...facts, ...defs, hyp].map((r) => [r.key, r])))
  }
  return books.get(level)
}
/** A rewrite rule written out: left ⟼ right, after its conditions. */
export const rewriteText = (r, say = show) => {
  if (r.group === 'hyp') return ''
  const side = (x) => (isTerm(x) ? say(atom('=', [x, x])).split(' = ')[0] : say(x))
  return `${r.conditions.length ? `${r.conditions.map(say).join('; ')} ⟹ ` : ''}${side(r.lhs)} ⟼ ${side(r.rhs)}`
}
