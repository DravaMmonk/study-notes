// Theories (《证明完毕》 chapter 9): functions defined by equations over natural numbers (zero, s(n)), lists (nil,
// cons(x, xs)) and truth values (tt, ff, if), simplification by rewriting with those equations left to right, and
// induction. A goal is an equation, maybe under ∀, on the machine board's proof state (tactics.js); a proved equation
// becomes a card that adds it to the rules simp uses.
//
//   a rule   [lhs, rhs]   terms; their variables match anything, while a goal's own variables stay fixed
//   defs     a level's definitions (`defs`, equation texts), handed to the board's run (machine.js ctx.defs)
//   rules    a state's extra rules, the lemmas its cards added
//
// Terms are written with zero, nil, tt and ff (true and false), and an automaton's states q0, q1 and letters c0, c1, the
// only names; any other bare lower-case word is a variable. A variable's kind is read off its name: n, m, k stand for
// numbers, xs, ys, zs for lists, and u, v, w for strings (lists of letters).
import { atom, fn, parse, subst, tvar } from './formula.js'
import { stateValue } from './tactics.js'

const T = (zh, en) => ({ zh, en })
const NAMES = ['zero', 'nil', 'tt', 'ff', 'q0', 'q1', 'c0', 'c1']
const isVar = (t) => t.t === 'var'
const key = (t) => (isVar(t) ? t.name : `${t.f}(${t.args.map(key).join(',')})`)
const stripAll = (f) => (f.op === '∀' ? stripAll(f.body) : f)
const boundOf = (f, out = []) => (f.op === '∀' ? boundOf(f.body, [...out, f.v]) : out)
const isEq = (f) => f.op === 'atom' && f.pred === '='

/** A formula or term written in this chapter's convention. */
export const parseTh = (text) => parse(text, { consts: NAMES })

/** An equation's text as a rule [lhs, rhs]. */
export function ruleOf(text) {
  const f = stripAll(parseTh(text))
  if (!isEq(f)) throw new Error(`not an equation: ${text}`)
  return f.args
}

// A goal's own variables are fixed while it is rewritten: frozen into names no rule can bind, thawed afterwards.
const FROZEN = '$'
const freeze = (t, bound) => (isVar(t) ? (bound.includes(t.name) ? t : fn(FROZEN + t.name)) : fn(t.f, t.args.map((a) => freeze(a, bound))))
const thaw = (t) => (isVar(t) ? t : t.f.startsWith(FROZEN) ? tvar(t.f.slice(1)) : fn(t.f, t.args.map(thaw)))

// One-way matching: the rule's variables bind; anything else must be equal.
function match(p, t, σ) {
  if (isVar(p)) {
    if (σ[p.name]) return key(σ[p.name]) === key(t)
    σ[p.name] = t
    return true
  }
  return !isVar(t) && p.f === t.f && p.args.length === t.args.length && p.args.every((a, k) => match(a, t.args[k], σ))
}
const inst = (t, σ) => (isVar(t) ? σ[t.name] ?? t : fn(t.f, t.args.map((a) => inst(a, σ))))

// A permutative rule (its two sides the same but for which variable goes where, like n + m = m + n) would turn a term
// back and forth for ever; it is used only when it makes the term come earlier in a fixed order (ordered rewriting).
const shape = (t) => (isVar(t) ? '_' : `${t.f}(${t.args.map(shape).join(',')})`)
const permutative = ([l, r]) => shape(l) === shape(r)

/** A term rewritten to normal form, inside first; null when it does not stop within `limit` steps. */
export function normalize(t, rules, limit = 400) {
  let steps = 0
  const go = (u) => {
    if (steps > limit) return u
    const v = isVar(u) ? u : fn(u.f, u.args.map(go))
    for (const rule of rules) {
      const σ = {}
      if (!match(rule[0], v, σ)) continue
      const w = inst(rule[1], σ)
      if (permutative(rule) && key(w) >= key(v)) continue
      steps++
      return go(w)
    }
    return v
  }
  const out = go(t)
  return steps > limit ? null : out
}

// The equations among a goal's hypotheses, as rules: what a hypothesis says for all things binds, the rest is fixed.
const hypRules = (g) => g.hyps.filter((h) => isEq(stripAll(h))).map((h) => stripAll(h).args.map((t) => freeze(t, boundOf(h))))

/** simp: the first goal's two sides rewritten with the definitions, the lemmas added and its hypotheses. */
export function simp(s, defs = []) {
  const [g, ...rest] = s.goals
  if (!g) return { ...s, error: T('已经没有目标了', 'No goals left') }
  const goal = stripAll(g.goal)
  if (!isEq(goal)) return { ...s, error: T('化简只管等式目标', 'Simp only works on equations') }
  const rules = [...defs.map(ruleOf), ...(s.rules ?? []), ...hypRules(g)]
  const [l, r] = goal.args.map((t) => normalize(freeze(t, []), rules))
  if (!l || !r) return { ...s, error: T('化简停不下来：有一条规则把式子改来改去，改不到头', 'Simp does not stop: some rule keeps changing the term, never reaching an end') }
  if (key(l) === key(r)) return { ...stateValue(rest), rules: s.rules }
  const [a, b] = [thaw(l), thaw(r)]
  if (key(a) === key(goal.args[0]) && key(b) === key(goal.args[1])) return { ...s, error: T('化简改不动这个目标了', 'Simp can change nothing in this goal') }
  const body = atom('=', [a, b])
  return { ...stateValue([{ hyps: g.hyps, goal: boundOf(g.goal).reduceRight((f, v) => ({ op: '∀', v, body: f }), body) }, ...rest]), rules: s.rules }
}

const kindOf = (v) => (/^[nmk]\d*$/.test(v) ? 'nat' : /^([xyz]s|[uvw])\d*$/.test(v) ? 'list' : null)

/** induct: on the first goal's first ∀ variable, a number or a list: the base case, then the step with its hypothesis. */
export function induct(s) {
  const [g, ...rest] = s.goals
  if (!g) return { ...s, error: T('已经没有目标了', 'No goals left') }
  if (g.goal.op !== '∀') return { ...s, error: T('第一个目标前面没有「对所有」，没有东西可以归纳', 'The first goal has no “for all” in front: nothing to induct on') }
  const { v, body } = g.goal
  const kind = kindOf(v)
  if (!kind) return { ...s, error: T(`${v} 不是数也不是列表，没法归纳`, `${v} is neither a number nor a list, so there is no induction on it`) }
  const v1 = `${v}1`
  const base = subst(body, v, kind === 'nat' ? fn('zero') : fn('nil'))
  const step = subst(body, v, kind === 'nat' ? fn('s', [tvar(v1)]) : fn('cons', [tvar('x1'), tvar(v1)]))
  const ih = subst(body, v, tvar(v1))
  return { ...stateValue([{ hyps: g.hyps, goal: base }, { hyps: [...g.hyps, ih], goal: step }, ...rest]), rules: s.rules }
}

// The first if(c, a, b) in a term whose condition is not settled yet.
function openIf(t) {
  if (isVar(t)) return null
  for (const a of t.args) { const c = openIf(a); if (c) return c }
  return t.f === 'if' && !(t.args[0].t === 'fn' && (t.args[0].f === 'tt' || t.args[0].f === 'ff')) ? t.args[0] : null
}

/** cases: the first goal split on the condition of its first open if: once with it true, once with it false. */
export function cases(s) {
  const [g, ...rest] = s.goals
  if (!g) return { ...s, error: T('已经没有目标了', 'No goals left') }
  const goal = stripAll(g.goal)
  const c = isEq(goal) && (openIf(goal.args[0]) ?? openIf(goal.args[1]))
  if (!c) return { ...s, error: T('第一个目标里没有还没定下来的「如果」', 'The first goal has no “if” still open') }
  const split = (value) => ({ hyps: [...g.hyps, atom('=', [c, fn(value)])], goal: g.goal })
  return { ...stateValue([split('tt'), split('ff'), ...rest]), rules: s.rules }
}

/** A lemma's card: its equation added to the rules simp uses. */
export const addRule = (s, text) => ({ ...s, rules: [...(s.rules ?? []), ruleOf(text)] })

/** The lemmas the player proves in chapter 9, each a card that adds it to the rules (machine.js). */
export const THEORY_LEMMAS = {
  addZero: '∀n. plus(n, zero) = n',
  addSucc: '∀n. ∀m. plus(n, s(m)) = s(plus(n, m))',
  addAssoc: '∀n. ∀m. ∀k. plus(plus(n, m), k) = plus(n, plus(m, k))',
  addComm: '∀n. ∀m. plus(n, m) = plus(m, n)',
  appNil: '∀xs. app(xs, nil) = xs',
  appAssoc: '∀xs. ∀ys. ∀zs. app(app(xs, ys), zs) = app(xs, app(ys, zs))',
  revApp: '∀xs. ∀ys. rev(app(xs, ys)) = app(rev(ys), rev(xs))',
  insLen: '∀ys. ∀x. len(ins(x, ys)) = s(len(ys))',
  itsumGen: '∀xs. ∀n. itsum(xs, n) = plus(n, sum(xs))',
  runApp: '∀w. ∀u. ∀q. run(q, app(w, u)) = run(run(q, w), u)',
}
