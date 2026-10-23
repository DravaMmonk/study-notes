// Tactics (《证明完毕》 chapter 8): a proof state is the list of goals still open, each with the hypotheses it may use;
// a tactic turns one state into the next, working on the first goal, or fails and says why. Tactics only ever do what
// the kernel's rules do, read backwards: a goal A → B becomes B with A among the hypotheses (the assumption box), a
// goal A ∧ B two goals (join), and so on, so whatever they prove the kernel would prove too.
//
//   state  { kind: 'state', goals: [{ hyps: [formula], goal: formula }], error?: { zh, en } }
//
// Prolog (the family topic): Horn rules ∀x̄. A1 ∧ … ∧ An → C over a world's facts, solved depth first in the order
// written, with a depth bound: running past it is a loop.
import { BOT, atom, bin, fn, freeVars, same, subst, tvar } from './formula.js'
import { mgu } from './unify.js'

const T = (zh, en) => ({ zh, en })
export const stateValue = (goals, error = null) => ({ kind: 'state', goals, ...(error ? { error } : {}) })
const failed = (s, error) => ({ ...s, error })
const unneg = (f) => (f.op === '¬' ? bin('→', f.a, BOT) : f)

// A variable new to a goal: x, x1, x2 …
function freshVar(base, g) {
  const taken = new Set([...g.hyps, g.goal].flatMap((f) => [...freeVars(f)]))
  let v = base
  for (let k = 1; taken.has(v); k++) v = `${base}${k}`
  return v
}

/** assumption: the first goal is one of its hypotheses. */
export function assumption(s) {
  const [g, ...rest] = s.goals
  if (!g) return failed(s, T('已经没有目标了', 'No goals left'))
  if (g.hyps.some((h) => same(h, g.goal)) || (g.goal.op === '⊤')) return stateValue(rest)
  if (g.hyps.some((h) => h.op === '⊥')) return stateValue(rest)
  return failed(s, T('第一个目标不在它的已知里', 'The first goal is not among its hypotheses'))
}

/** intro: the first goal taken apart by its shape, the way its introduction rule builds it, read backwards. */
export function intro(s) {
  const [g, ...rest] = s.goals
  if (!g) return failed(s, T('已经没有目标了', 'No goals left'))
  const f = unneg(g.goal)
  switch (f.op) {
    case '→': return stateValue([{ hyps: [...g.hyps, f.a], goal: f.b }, ...rest])
    case '∧': return stateValue([{ hyps: g.hyps, goal: f.a }, { hyps: g.hyps, goal: f.b }, ...rest])
    case '↔': return stateValue([{ hyps: g.hyps, goal: bin('→', f.a, f.b) }, { hyps: g.hyps, goal: bin('→', f.b, f.a) }, ...rest])
    case '∀': {
      const v = freshVar(f.v, g)
      return stateValue([{ hyps: g.hyps, goal: subst(f.body, f.v, tvar(v)) }, ...rest])
    }
    case '∨': {
      // Which side to prove cannot be read off the goal: the side already known, if one is.
      const side = [f.a, f.b].find((x) => g.hyps.some((h) => same(h, x)))
      return side ? stateValue([{ hyps: g.hyps, goal: side }, ...rest]) : failed(s, T('「或」的目标不知道该证哪一边', 'An “or” goal does not say which side to prove'))
    }
    default: return failed(s, T('第一个目标拆不开了', 'The first goal does not come apart'))
  }
}

/**
 * elim: the first hypothesis of the first goal that can be used up, used: A ∧ B gives A and B; A ∨ B splits the goal
 * in two cases; ∃x. P gives P of a new thing; A → B with A known gives B; ⊥ closes the goal.
 */
export function elim(s) {
  const [g, ...rest] = s.goals
  if (!g) return failed(s, T('已经没有目标了', 'No goals left'))
  const known = (x) => g.hyps.some((h) => same(h, x))
  for (let i = 0; i < g.hyps.length; i++) {
    const h = unneg(g.hyps[i])
    const others = g.hyps.filter((_, k) => k !== i)
    if (h.op === '⊥') return stateValue(rest)
    if (h.op === '∧') return stateValue([{ hyps: [...others, h.a, h.b], goal: g.goal }, ...rest])
    if (h.op === '∨') return stateValue([{ hyps: [...others, h.a], goal: g.goal }, { hyps: [...others, h.b], goal: g.goal }, ...rest])
    if (h.op === '∃') {
      const v = freshVar(h.v, g)
      return stateValue([{ hyps: [...others, subst(h.body, h.v, tvar(v))], goal: g.goal }, ...rest])
    }
    if (h.op === '→' && known(h.a) && !known(h.b)) return stateValue([{ hyps: [...others, h.b], goal: g.goal }, ...rest])
  }
  return failed(s, T('没有能用掉的已知', 'No hypothesis can be used up'))
}

/** auto: REPEAT (assumption ORELSE intro ORELSE elim), the player's own, built in; `onStep(state, tactic)` sees each step. */
export function auto(s, onStep = null) {
  let cur = s
  const tactics = { assumption, intro, elim }
  for (let k = 0; k < 60 && cur.goals.length; k++) {
    const name = Object.keys(tactics).find((t) => !tactics[t](cur).error)
    if (!name) return cur
    cur = tactics[name](cur)
    onStep?.(cur, name)
  }
  return cur
}

/** A test's start: one goal with its hypotheses. */
export const startState = (goal, hyps = []) => stateValue([{ hyps, goal }])

/* ---------- Prolog ---------- */

// A Horn rule as { head: atom, body: [atom], vars: [name] } from ∀x̄. A1 ∧ … ∧ An → C, or a fact C.
export function hornOf(f) {
  const vars = []
  let g = f
  while (g.op === '∀') { vars.push(g.v); g = g.body }
  if (g.op === 'atom') return { head: g, body: [], vars }
  if (g.op !== '→' || g.b.op !== 'atom') return null
  const body = []
  const walk = (x) => { if (x.op === '∧') { walk(x.a); walk(x.b) } else body.push(x) }
  walk(g.a)
  return body.every((a) => a.op === 'atom') ? { head: g.b, body, vars } : null
}

let renameCount = 0
const renamed = (rule) => {
  const k = ++renameCount
  const σ = Object.fromEntries(rule.vars.map((v) => [v, tvar(`${v}${k}`)]))
  const ren = (a) => atom(a.pred, a.args.map(function sub(t) { return t.t === 'var' ? σ[t.name] ?? t : fn(t.f, t.args.map(sub)) }))
  return { head: ren(rule.head), body: rule.body.map(ren) }
}
const applyAtom = (a, σ) => atom(a.pred, a.args.map(function ap(t) { return t.t === 'var' ? (σ[t.name] ? ap(σ[t.name]) : t) : fn(t.f, t.args.map(ap)) }))

/**
 * Every answer to goals, depth first, clauses in order: [σ] (substitutions), or { loop: true } when a branch runs
 * deeper than `depth`.
 */
export function solve(goals, clauses, { depth = 24, limit = 200 } = {}) {
  const answers = []
  let loop = false
  const go = (gs, σ, d) => {
    if (answers.length >= limit || loop) return
    if (!gs.length) { answers.push(σ); return }
    if (d > depth) { loop = true; return }
    const [g0, ...rest] = gs
    const g = applyAtom(g0, σ)
    for (const c of clauses) {
      const r = renamed(c)
      if (r.head.pred !== g.pred || r.head.args.length !== g.args.length) continue
      const θ = mgu(r.head.args.map((t, k) => [t, g.args[k]]))
      if (!θ) continue
      const both = { ...Object.fromEntries(Object.entries(σ).map(([v, t]) => [v, applyAtom(atom('_', [t]), θ).args[0]])), ...θ }
      go([...r.body, ...rest], both, d + 1)
      if (loop) return
    }
  }
  go(goals, {}, 0)
  return loop ? { loop: true } : answers
}

/** The things x stands for in the answers to a query (an atom with the variable x). */
export function answersFor(query, clauses) {
  const res = solve([query], clauses)
  if (res.loop) return res
  const name = (t) => (t.t === 'fn' ? t.f : t.name)
  return [...new Set(res.map((σ) => applyAtom(query, σ)).map((a) => a.args.map(name).join(',')))].sort()
}

/** A world's facts as clauses. */
export const factsOf = (world) => Object.entries(world.preds ?? {}).flatMap(([p, list]) => list.map((x) => ({ head: atom(p, [x].flat().map((n) => fn(n))), body: [], vars: [] })))

