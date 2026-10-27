// Rules with metavariables (《证明完毕》 chapter 7 on), the way Isabelle writes them: a rule is ⟦premises⟧ ⟹ conclusion,
// with metavariables for any sentence (?A), any thing (?t) and any sentence about some things (?P(x)). Using a rule
// means unifying: solving equations s ≐ t between sentences (or things) that have such letters, by a handful of rules,
// each a card of the machine board (machine.js). A metavariable applied to distinct bound variables, ?P(x) ≐ x是人 under
// ∀x, is a pattern (Miller's higher-order patterns) and is solved as a function, ?P ≐ fun x => x是人; any other
// application (?P(?t) ≐ 苏格拉底会死) has more than one solution and is left alone.
//
//   side      a formula (formula.js) or a term; ¬A is read as A → ⊥ and A ↔ B as (A → B) ∧ (B → A)
//   lam       { op: 'lam', params: [name], body: formula }   what a pattern's metavariable stands for
//   equation  { s, t, bound: [name] }   bound: the variables bound around it (a quantifier taken apart), written ⋀x.
//   set       { eqs: [equation], fail: null | { zh, en } }
//   σ         { metavariable name: side | lam }
//
// Some things are fixed (a, b … that a for-any box or Take the one there is took): a metavariable left by a rule may
// only become a thing that was fixed before it was left (`scopes`: { name: [fixed name] }, `fixed`: every fixed name).
import { BOT, all, and, atom, bin, ex, fn, imp, meta, parse, same, show, showTerm, subst, tvar } from './formula.js'

const T = (zh, en) => ({ zh, en })
export const isMetaName = (name) => name.startsWith('?')
const isTerm = (x) => 't' in x
const VARS = ['x', 'y', 'z', 'u', 'v', 'w']

/** A sentence or thing written with metavariables: lower-case names are things (u … z variables), ?A, ?t, ?P(x) letters. */
export function parseS(text) {
  const names = text.match(/(?:^|[^?A-Za-z0-9_'])([a-z][A-Za-z0-9_']*)/g)?.map((m) => m.replace(/^[^a-z]/, '')) ?? []
  return parse(text, { consts: names.filter((n) => !/^[u-z]\d*$/.test(n)) })
}
/** A side of an equation, as written: a thing when it reads as one (ann, ?t, s(x)), else a sentence. */
export function parseSide(text) {
  const t = text.trim()
  return /^\??[a-z][A-Za-z0-9_']*(\(.*\))?$/.test(t) ? parseS(`${t} = ${t}`).args[0] : parseS(t)
}
/** An equation s ≐ t, as written. */
export const parseEquation = (text) => {
  const [s, t] = text.split('≐')
  return { s: parseSide(s), t: parseSide(t), bound: [] }
}

/* ---------- shape ---------- */

const unfold = (f) => (f.op === '¬' ? imp(f.a, BOT) : f.op === '↔' ? and(imp(f.a, f.b), imp(f.b, f.a)) : f)
/** A bare metavariable's name (?A, ?t), or null. */
export function flexName(x) {
  if (isTerm(x)) return x.t === 'var' && isMetaName(x.name) ? x.name : null
  return x.op === 'meta' && isMetaName(x.name) && !x.args?.length ? x.name : null
}
/** A metavariable applied to things (?P(x)), or null. */
const flexApp = (x) => (!isTerm(x) && x.op === 'meta' && x.args?.length ? x : null)
const flex = (x) => Boolean(flexName(x) || flexApp(x))
// What a side is made of when it is not a metavariable: a key that two sides must share, and its parts; a quantifier
// is its own kind, taken apart with its variable.
function head(x0) {
  if (isTerm(x0)) return x0.t === 'var' ? (isMetaName(x0.name) ? null : { key: `v ${x0.name}`, args: [] }) : { key: `f ${x0.f}/${x0.args.length}`, args: x0.args }
  const x = unfold(x0)
  switch (x.op) {
    case 'meta': return null
    case 'atom': return { key: `p ${x.pred}/${x.args.length}`, args: x.args }
    case '⊥': return { key: '⊥', args: [] }
    case '∀': case '∃': return { key: x.op, binder: true, args: [] }
    case 'lam': return { key: `λ${x.params.length}`, binder: true, args: [] }
    default: return { key: x.op, args: [x.a, x.b] }
  }
}
/** Are two sides the same (up to the names of bound variables)? */
export function sameSide(a, b) {
  if (isTerm(a) || isTerm(b)) return isTerm(a) && isTerm(b) && showTerm(a) === showTerm(b)
  if (a.op === 'lam' || b.op === 'lam') return a.op === b.op && a.params.length === b.params.length && same(renameLam(a, b.params).body, b.body)
  return same(a, b)
}
const renameLam = (l, params) => ({ ...l, params, body: l.params.reduce((f, p, k) => subst(f, p, tvar(params[k])), l.body) })

/** The metavariables in a side. */
export function metasIn(x, out = new Set()) {
  if (isTerm(x)) {
    if (x.t === 'var') { if (isMetaName(x.name)) out.add(x.name) } else x.args.forEach((a) => metasIn(a, out))
    return out
  }
  switch (x.op) {
    case 'meta': if (isMetaName(x.name)) out.add(x.name); (x.args ?? []).forEach((a) => metasIn(a, out)); break
    case 'atom': x.args.forEach((a) => metasIn(a, out)); break
    case '¬': metasIn(x.a, out); break
    case '∀': case '∃': case 'lam': metasIn(x.body, out); break
    default: if (x.a) { metasIn(x.a, out); metasIn(x.b, out) }
  }
  return out
}
// The names of things in a side, free (a variable bound inside it is left out).
function namesIn(x, out = new Set(), bound = new Set()) {
  if (isTerm(x)) {
    if (x.t === 'var') { if (!bound.has(x.name)) out.add(x.name) } else { if (!x.args.length) out.add(x.f); x.args.forEach((a) => namesIn(a, out, bound)) }
    return out
  }
  switch (x.op) {
    case 'meta': case 'atom': (x.args ?? []).forEach((a) => namesIn(a, out, bound)); break
    case '¬': namesIn(x.a, out, bound); break
    case '∀': case '∃': namesIn(x.body, out, new Set([...bound, x.v])); break
    case 'lam': namesIn(x.body, out, new Set([...bound, ...x.params])); break
    default: if (x.a) { namesIn(x.a, out, bound); namesIn(x.b, out, bound) }
  }
  return out
}

/* ---------- substitution ---------- */

const beta = (l, args) => {
  // Simultaneously: the parameters first renamed out of the way of the arguments.
  const tmp = l.params.map((_, k) => `#${k}`)
  const body = l.params.reduce((f, p, k) => subst(f, p, tvar(tmp[k])), l.body)
  return tmp.reduce((f, p, k) => subst(f, p, args[k]), body)
}
/** A side with every metavariable σ knows replaced, all the way down. */
export function instantiate(x, σ) {
  if (isTerm(x)) {
    if (x.t === 'var') return isMetaName(x.name) && σ[x.name] ? instantiate(σ[x.name], σ) : x
    return fn(x.f, x.args.map((a) => instantiate(a, σ)))
  }
  switch (x.op) {
    case 'meta': {
      const args = (x.args ?? []).map((a) => instantiate(a, σ))
      const v = σ[x.name]
      if (!v) return args.length ? { ...x, args } : x
      return instantiate(v.op === 'lam' ? beta(v, args) : v, σ)
    }
    case 'atom': return atom(x.pred, x.args.map((a) => instantiate(a, σ)))
    case '¬': return { op: '¬', a: instantiate(x.a, σ) }
    case '∀': case '∃': return { ...x, body: instantiate(x.body, σ) }
    case 'lam': return { ...x, body: instantiate(x.body, σ) }
    case '⊥': return x
    default: return bin(x.op, instantiate(x.a, σ), instantiate(x.b, σ))
  }
}
const instEq = (e, σ) => ({ ...e, s: instantiate(e.s, σ), t: instantiate(e.t, σ) })
// An equation keeps only the bound variables it still mentions.
const tidy = (e) => {
  const used = new Set([...namesIn(e.s), ...namesIn(e.t)])
  return { ...e, bound: e.bound.filter((v) => used.has(v)) }
}

/* ---------- the rules of unification ---------- */

const eqText = (e) => `${e.bound.length ? `⋀${e.bound.join(' ')}. ` : ''}${sideText(e.s)} ≐ ${sideText(e.t)}`
export const sideText = (x) => (isTerm(x) ? showTerm(x) : x.op === 'lam' ? `fun ${x.params.join(' ')} => ${show(x.body)}` : show(x))
const replaceAt = (eqs, i, ins) => [...eqs.slice(0, i), ...ins.map(tidy), ...eqs.slice(i + 1)]
// The variable two quantifiers taken apart share: theirs when they agree and it is free, else the first free one.
const freshBound = (e, [va, a], [vb, b]) => {
  const taken = new Set([...e.bound, ...[...namesIn(a)].filter((n) => n !== va), ...[...namesIn(b)].filter((n) => n !== vb)])
  return [va, vb, ...VARS].find((v) => !taken.has(v)) ?? `v${e.bound.length}`
}
// Why a metavariable X may not become t: it is inside t, t has a bound variable that would leave its quantifier, or t
// names a thing fixed after X was left (opts.scopes, opts.fixed). Null when it may.
function blocked(e, X, t, opts = {}) {
  if (metasIn(t).has(X)) return T(`${eqText(e)}：${X} 出现在另一边里面，代进去永远代不完`, `${eqText(e)}: ${X} occurs inside the other side, and putting it in never ends`)
  const names = namesIn(t)
  const escapes = e.bound.filter((v) => names.has(v))
  if (escapes.length) return T(`${eqText(e)}：${escapes.join('、')} 是量词管着的，${X} 不能带走它`, `${eqText(e)}: ${escapes.join(', ')} is bound by a quantifier, and ${X} cannot take it out`)
  const late = (opts.fixed ?? []).filter((n) => names.has(n) && !(opts.scopes?.[X] ?? []).includes(n))
  if (late.length) return T(`${eqText(e)}：${X} 是在取出 ${late.join('、')} 之前留下的，不能变成后来才有的东西`, `${eqText(e)}: ${X} was left before ${late.join(', ')} was taken, and cannot become something that came later`)
  return null
}

/**
 * The rules, each applied once, to the first equation it applies to: { eqs, fail? }, or null when it applies to none.
 * opts { scopes, fixed } for the fixed-thing check.
 */
export const UNIFY_RULES = {
  // t ≐ t: drop it.
  delete: (eqs) => {
    const i = eqs.findIndex((e) => sameSide(e.s, e.t))
    return i < 0 ? null : { eqs: replaceAt(eqs, i, []) }
  },
  // Same shape on both sides: an equation for each pair of parts; a quantifier on both sides: their bodies, with one
  // variable for both.
  decompose: (eqs) => {
    const i = eqs.findIndex((e) => { const [a, b] = [head(e.s), head(e.t)]; return a && b && a.key === b.key && !sameSide(e.s, e.t) })
    if (i < 0) return null
    const e = eqs[i]
    const [a, b] = [head(e.s), head(e.t)]
    if (a.binder) {
      const [s, t] = [unfold(e.s), unfold(e.t)]
      if (s.op === 'lam') {
        const ps = s.params.map((p, k) => freshBound({ ...e, bound: [...e.bound, ...s.params.slice(0, k)] }, [p, s.body], [t.params[k], t.body]))
        return { eqs: replaceAt(eqs, i, [{ s: renameLam(s, ps).body, t: renameLam(t, ps).body, bound: [...e.bound, ...ps] }]) }
      }
      const w = freshBound(e, [s.v, s.body], [t.v, t.body])
      return { eqs: replaceAt(eqs, i, [{ s: subst(s.body, s.v, tvar(w)), t: subst(t.body, t.v, tvar(w)), bound: [...e.bound, w] }]) }
    }
    return { eqs: replaceAt(eqs, i, a.args.map((x, k) => ({ s: x, t: b.args[k], bound: e.bound }))) }
  },
  // Different shapes, neither side a metavariable: no unifier.
  conflict: (eqs) => {
    const e = eqs.find((x) => { const [a, b] = [head(x.s), head(x.t)]; return a && b && a.key !== b.key })
    return e ? { eqs, fail: T(`${eqText(e)}：两边的样子不同，怎样代都对不上`, `${eqText(e)}: the two sides have different shapes, and nothing put in makes them meet`) } : null
  },
  // A metavariable on the right only: turn it round.
  swap: (eqs) => {
    const i = eqs.findIndex((e) => flex(e.t) && (!flex(e.s) || (flexApp(e.s) && flexName(e.t))))
    return i < 0 ? null : { eqs: replaceAt(eqs, i, [{ ...eqs[i], s: eqs[i].t, t: eqs[i].s }]) }
  },
  // ?X ≐ t where ?X may not become t: no unifier.
  check: (eqs, opts) => {
    for (const e of eqs) {
      const X = flexName(e.s)
      if (!X || sameSide(e.s, e.t)) continue
      const why = blocked(e, X, e.t, opts)
      if (why) return { eqs, fail: why }
    }
    return null
  },
  // ?X ≐ t, ?X free to be t and still elsewhere: put t for ?X there.
  eliminate: (eqs, opts) => {
    const i = eqs.findIndex((e, k) => {
      const X = flexName(e.s)
      return X && !sameSide(e.s, e.t) && !blocked(e, X, e.t, opts) && eqs.some((d, j) => j !== k && (metasIn(d.s).has(X) || metasIn(d.t).has(X)))
    })
    if (i < 0) return null
    const σ = { [flexName(eqs[i].s)]: eqs[i].t }
    return { eqs: eqs.map((e, j) => (j === i ? e : tidy(instEq(e, σ)))) }
  },
  // ?P(x1, …, xn) ≐ t, the xi distinct bound variables and t about no other bound one: ?P ≐ fun x1 … xn => t.
  pattern: (eqs) => {
    const i = eqs.findIndex((e) => patternOf(e))
    if (i < 0) return null
    const e = eqs[i]
    const P = flexApp(e.s)
    return { eqs: replaceAt(eqs, i, [{ s: meta(P.name), t: { op: 'lam', params: P.args.map((a) => a.name), body: e.t }, bound: e.bound }]) }
  },
}
// Is an equation a pattern the last rule solves: { params } or null.
function patternOf(e) {
  const P = flexApp(e.s)
  if (!P || isTerm(e.t) || metasIn(e.t).has(P.name)) return null
  const params = P.args.map((a) => (a.t === 'var' && e.bound.includes(a.name) ? a.name : null))
  if (params.some((p) => !p) || new Set(params).size !== params.length) return null
  const names = namesIn(e.t)
  return e.bound.every((v) => params.includes(v) || !names.has(v)) ? { params } : null
}
/** An equation whose metavariable is applied but not to distinct bound variables, the one kind left alone. */
export const nonPattern = (eqs) => eqs.find((e) => (flexApp(e.s) || flexApp(e.t)) && !patternOf(e) && !patternOf({ ...e, s: e.t, t: e.s }))

/** Is a set solved: ?X1 ≐ t1, … with distinct metavariables on the left, none of them anywhere on a right? */
export function solved(eqs) {
  const lefts = eqs.map((e) => flexName(e.s))
  if (lefts.some((x) => !x) || new Set(lefts).size !== lefts.length) return false
  return eqs.every((e) => lefts.every((x) => !metasIn(e.t).has(x)) && !e.bound.some((v) => namesIn(e.t).has(v)))
}
export const solutionOf = (eqs) => Object.fromEntries(eqs.map((e) => [flexName(e.s), e.t]))

const ORDER = ['delete', 'decompose', 'conflict', 'swap', 'check', 'eliminate']
export const FULL = [...ORDER, 'pattern']
/**
 * Solve a set by the rules, in order, each time the first that applies, until it is solved, fails or none applies:
 * { eqs, fail }. `rules` is ORDER (the unifier: patterns left alone) by default; onStep(set, rule) sees each step.
 */
export function solveEqs(eqs0, { rules = ORDER, onStep = null, ...opts } = {}) {
  let set = { eqs: eqs0.map(tidy), fail: null }
  for (let k = 0; k < 400 && !set.fail && !solved(set.eqs); k++) {
    const rule = rules.find((r) => UNIFY_RULES[r](set.eqs, opts))
    if (!rule) break
    const next = UNIFY_RULES[rule](set.eqs, opts)
    set = { eqs: next.eqs, fail: next.fail ?? null }
    onStep?.(set, rule)
  }
  return set
}

/**
 * Unify pairs of sides, all at once, on top of what σ already knows: { σ } with σ extended, or { fail }. A pattern is
 * solved; another application of a metavariable fails as having no single solution.
 */
export function unify(pairs, σ = {}, opts = {}) {
  const set = solveEqs(pairs.map(([a, b]) => ({ s: instantiate(a, σ), t: instantiate(b, σ), bound: [] })), { rules: FULL, ...opts })
  if (set.fail) return { fail: set.fail }
  if (!solved(set.eqs)) {
    const e = nonPattern(set.eqs)
    return { fail: e ? T(`${eqText(e)}：${(flexApp(e.s) ?? flexApp(e.t)).name} 后面跟的不都是不同的约束变量，解不止一个，机器不猜`, `${eqText(e)}: ${(flexApp(e.s) ?? flexApp(e.t)).name} is not applied to distinct bound variables, so there is more than one solution, and the machine does not guess`) : T('合一不了', 'No unifier') }
  }
  // A solved set may still give a metavariable a thing fixed after it was left.
  const late = UNIFY_RULES.check(set.eqs, opts)
  if (late) return { fail: late.fail }
  const found = solutionOf(set.eqs)
  return { σ: { ...Object.fromEntries(Object.entries(σ).map(([k, v]) => [k, instantiate(v, found)])), ...found } }
}

/* ---------- rules ---------- */

//   rule      { key, name: { zh, en }, premises: [premise], conclusion: formula }
//   premise   { fixes: [variable], hyps: [formula], show: formula }   ⋀x. ⟦hyps⟧ ⟹ show
const premiseOf = (text) => {
  // ⋀x. ⟦A; B⟧ ⟹ C, any part left out.
  const m = /^(?:⋀([a-z ]+)\.\s*)?(?:⟦(.*)⟧\s*⟹\s*)?(.*)$/.exec(text.trim())
  return { fixes: m[1] ? m[1].trim().split(/\s+/) : [], hyps: m[2] ? m[2].split(';').map(parseS) : [], show: parseS(m[3]) }
}
/** A rule from its premises and conclusion as written: ruleOf('conjI', name, ['?A', '?B'], '?A ∧ ?B'). */
export const ruleOf = (key, name, premises, conclusion) => ({ key, name, premises: premises.map(premiseOf), conclusion: parseS(conclusion) })

/** A rule written the way Isabelle writes it: ⟦?A; ?B⟧ ⟹ ?A ∧ ?B (a premise with assumptions of its own in brackets). */
export function ruleText(rule, say = show) {
  const prem = (p) => {
    const inner = p.hyps.length ? `${p.hyps.map(say).join('; ')} ⟹ ${say(p.show)}` : say(p.show)
    const body = p.fixes.length ? `⋀${p.fixes.join(' ')}. ${inner}` : inner
    return p.hyps.length || p.fixes.length ? `(${body})` : body
  }
  return rule.premises.length ? `⟦${rule.premises.map(prem).join('; ')}⟧ ⟹ ${say(rule.conclusion)}` : say(rule.conclusion)
}

const R = (zh, en) => T(zh, en)
/**
 * The kernel's rules as rules with metavariables, in the order a card lists them, each with the name of the card it
 * is on the proof board: introduction rules first (used on a goal), then elimination rules (the first premise a
 * hypothesis to use up), then the rest.
 */
export const KERNEL_RULES = [
  ruleOf('conjI', R('拼成 ∧', 'Join ∧'), ['?A', '?B'], '?A ∧ ?B'),
  ruleOf('impI', R('假设框', 'Assumption box'), ['⟦?A⟧ ⟹ ?B'], '?A → ?B'),
  ruleOf('disjI1', R('引入 ∨（左边）', 'Bring in ∨ (left)'), ['?A'], '?A ∨ ?B'),
  ruleOf('disjI2', R('引入 ∨（右边）', 'Bring in ∨ (right)'), ['?B'], '?A ∨ ?B'),
  ruleOf('allI', R('任取', 'For any'), ['⋀x. ?P(x)'], '∀x. ?P(x)'),
  ruleOf('exI', R('举例', 'Example'), ['?P(?t)'], '∃x. ?P(x)'),
  ruleOf('mp', R('套用', 'Apply'), ['?A → ?B', '?A'], '?B'),
  ruleOf('conjE', R('拆开 ∧', 'Split ∧'), ['?A ∧ ?B', '⟦?A; ?B⟧ ⟹ ?C'], '?C'),
  ruleOf('conjunct1', R('拆开 ∧（左边）', 'Split ∧ (left)'), ['?A ∧ ?B'], '?A'),
  ruleOf('conjunct2', R('拆开 ∧（右边）', 'Split ∧ (right)'), ['?A ∧ ?B'], '?B'),
  ruleOf('disjE', R('分情况', 'Case by case'), ['?A ∨ ?B', '⟦?A⟧ ⟹ ?C', '⟦?B⟧ ⟹ ?C'], '?C'),
  ruleOf('impE', R('用上「若…则…」', 'Use an “if”'), ['?A → ?B', '?A', '⟦?B⟧ ⟹ ?C'], '?C'),
  ruleOf('botE', R('矛盾推出一切', 'From contradiction'), ['⊥'], '?C'),
  ruleOf('spec', R('取一个', 'Take one'), ['∀x. ?P(x)'], '?P(?t)'),
  ruleOf('allE', R('取一个，再用', 'Take one, then use'), ['∀x. ?P(x)', '⟦?P(?t)⟧ ⟹ ?C'], '?C'),
  ruleOf('exE', R('拿出那一个', 'Take the one there is'), ['∃x. ?P(x)', '⋀x. ⟦?P(x)⟧ ⟹ ?C'], '?C'),
  ruleOf('raa', R('反证法', 'By contradiction'), ['¬¬?A'], '?A'),
  // A sentence proved on the way and then used, as a wire on the proof board does (Lean's have).
  ruleOf('cut', R('先证一句', 'Have'), ['?A', '⟦?A⟧ ⟹ ?C'], '?C'),
  ruleOf('refl', R('自反', 'Reflexivity'), [], '?t = ?t'),
]
// The proof-board part each kernel rule is (a level has the rule once it holds the part); Have is Apply and a box.
const PART = { conjI: 'andI', impI: 'impI', disjI1: 'orI', disjI2: 'orI', allI: 'allI', exI: 'exI', mp: 'mp', conjE: 'andE', conjunct1: 'andE', conjunct2: 'andE', disjE: 'orE', impE: 'mp', botE: 'botE', spec: 'allE', allE: 'allE', exE: 'exE', raa: 'raa', cut: 'mp', refl: 'refl' }
for (const r of KERNEL_RULES) r.part = PART[r.key]
/** The introduction rules (a goal taken apart by its shape) and the elimination rules (a given used), in order. */
export const INTRO_RULES = ['conjI', 'impI', 'disjI1', 'disjI2', 'allI', 'exI']
export const ELIM_RULES = ['conjE', 'disjE', 'impE', 'botE', 'exE', 'allE']

// A lemma's letters are ?-letters as a rule; a letter under a quantifier is about its variable (∀x. P is ∀x. ?P(x)).
function metaRule(f, letters, bound = []) {
  if (f.op === 'meta' || (f.op === 'atom' && !f.args.length && letters.includes(f.pred))) {
    const name = `?${f.name ?? f.pred}`
    return bound.length ? { op: 'meta', name, args: bound.map(tvar) } : meta(name)
  }
  if (f.op === '¬') return { op: '¬', a: metaRule(f.a, letters, bound) }
  if (f.op === '∀' || f.op === '∃') return (f.op === '∀' ? all : ex)(f.v, metaRule(f.body, letters, [...bound, f.v]))
  if (f.a) return bin(f.op, metaRule(f.a, letters, bound), metaRule(f.b, letters, bound))
  return f
}
/** The rules a lemma (course LEMMAS) gives: one per shape it has, named after it (and the shape). */
export function lemmaRules(type, l) {
  const forms = l.forms ?? [{ key: null, statement: l.statement, premises: l.premises ?? [] }]
  const read = (text) => metaRule(parse(text, { metas: l.metas }), l.metas)
  return forms.map((f) => ({
    key: f.key ? `${type}.${f.key}` : type,
    name: f.key ? T(`${l.name.zh} ${f.label}`, `${l.name.en} ${f.label}`) : l.name,
    premises: f.premises.map((p) => ({ fixes: [], hyps: [], show: read(p) })),
    conclusion: read(f.statement),
    lemma: type,
  }))
}
