// Proof states and tactics (《证明完毕》 chapters 7 and 8). A proof state is the goals still open, each with the things
// it has fixed and the hypotheses it may use; metavariables a rule left in them are shared by every goal, and filled in
// wherever one is unified (Isabelle's ?A, Lean's ?m). A tactic takes a state to the states it can make of it: none
// (it fails, and says why), one, or several (chapter 8: one for each way it applies, tried in order). Tactics only use
// rules, read backwards: whatever they prove, the kernel proves too.
//
//   state  { kind: 'state', goals: [goal], scopes: { ?name: [fixed] }, inst: σ, fixed: [name], query: [?name],
//            error?: { zh, en }, more?: [state], endless? }
//   goal   { fixes: [name], hyps: [formula], goal: formula }
//
// `scopes` says which fixed things each metavariable may become (those fixed when it was left), `inst` what the
// metavariables have become so far, `query` the metavariables of the start (a question: who is a grandparent?), and
// `more` the further results after this one, when a tactic gives several, and `endless` that a search making them did
// not stop (schematic.js does the unifying).
import { fn, subst } from './formula.js'
import { ELIM_RULES, INTRO_RULES, KERNEL_RULES, instantiate, metasIn, unify } from './schematic.js'

const T = (zh, en) => ({ zh, en })
const NO_GOALS = T('已经没有目标了', 'No goals left')
// The names a fixed thing gets, in order.
const FIXED = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'k', 'm', 'n']

export const stateValue = (goals, error = null) => ({ kind: 'state', goals, ...(error ? { error } : {}) })
/** A state's start: one goal with its hypotheses; its metavariables (a question's) may become anything. */
export function startState(goal, hyps = []) {
  const query = [...metasIn(goal)]
  return { kind: 'state', goals: [{ fixes: [], hyps, goal }], scopes: Object.fromEntries(query.map((m) => [m, []])), inst: {}, fixed: [], query }
}
/** A state's results as a list: itself and the ones after it. */
export const resultsOf = (s) => [{ ...s, more: undefined, endless: undefined }, ...(s.more ?? [])]
/** A list of results as one value: the first, carrying the rest; the first failure when there is none. */
export const asValue = (list, failed) => (list.length ? (list.length > 1 ? { ...list[0], more: list.slice(1) } : list[0]) : failed)
/** What the start's metavariables have become in a state (a question's answer). */
export const answerOf = (s) => (s.query ?? []).map((m) => instantiate(/^\?[A-Z]/.test(m) ? { op: 'meta', name: m } : { t: 'var', name: m }, s.inst ?? {}))

const fixesOf = (g) => g.fixes ?? []
// The ?-letters a state knows: those in its goals, those it scopes, and those already settled (a new one may not reuse
// a settled name).
function metasOfState(s) {
  const out = new Set([...Object.keys(s.scopes ?? {}), ...Object.keys(s.inst ?? {})])
  for (const g of s.goals) [g.goal, ...g.hyps].forEach((f) => metasIn(f, out))
  return out
}
// The rule with its metavariables renamed apart from the state's: ?A, then ?A1, ?A2 …
function renamed(rule, used) {
  const own = new Set()
  for (const f of [rule.conclusion, ...rule.premises.flatMap((p) => [p.show, ...p.hyps])]) metasIn(f, own)
  const names = {}
  for (const m of own) {
    let name = m
    for (let k = 1; used.has(name); k++) name = `${m}${k}`
    used.add(name)
    names[m] = name
  }
  const ren = (f) => renameMetas(f, names)
  return { ...rule, conclusion: ren(rule.conclusion), premises: rule.premises.map((p) => ({ ...p, show: ren(p.show), hyps: p.hyps.map(ren) })), metas: Object.values(names) }
}
// A formula (or term) with its metavariables renamed, applied ones keeping what they are applied to.
function renameMetas(x, names) {
  if ('t' in x) return x.t === 'var' ? (names[x.name] ? { ...x, name: names[x.name] } : x) : { ...x, args: x.args.map((a) => renameMetas(a, names)) }
  switch (x.op) {
    case 'meta': return { ...x, name: names[x.name] ?? x.name, ...(x.args ? { args: x.args.map((a) => renameMetas(a, names)) } : {}) }
    case 'atom': return { ...x, args: x.args.map((a) => renameMetas(a, names)) }
    case '¬': return { ...x, a: renameMetas(x.a, names) }
    case '∀': case '∃': return { ...x, body: renameMetas(x.body, names) }
    case '⊥': return x
    default: return { ...x, a: renameMetas(x.a, names), b: renameMetas(x.b, names) }
  }
}

// The goals a rule's premises make of goal g: each with g's fixed things and hypotheses, its own assumptions, and a new
// fixed thing for each of its ⋀ variables.
function lift(premises, g, s) {
  const taken = new Set([...(s.fixed ?? []), ...fixesOf(g)])
  const fixed = []
  const goals = premises.map((p) => {
    const names = p.fixes.map(() => { const n = FIXED.find((x) => !taken.has(x)); taken.add(n); fixed.push(n); return n })
    const put = (f) => p.fixes.reduce((h, v, k) => subst(h, v, fn(names[k])), f)
    return { fixes: [...fixesOf(g), ...names], hyps: [...g.hyps, ...p.hyps.map(put)], goal: put(p.show) }
  })
  return { goals, fixed }
}
const keyOf = (f) => JSON.stringify(f)
const unique = (fs) => [...new Map(fs.map((f) => [keyOf(f), f])).values()]
// The state after a step: the new goals in front of the rest, everything with σ put in; a hypothesis already there is
// not kept twice.
function after(s, σ, goals, scopes, fixed = []) {
  const put = (f) => instantiate(f, σ)
  return {
    kind: 'state',
    goals: goals.map((g) => ({ fixes: fixesOf(g), hyps: unique(g.hyps.map(put)), goal: put(g.goal) })),
    scopes,
    inst: σ,
    fixed: [...(s.fixed ?? []), ...fixed],
    query: s.query ?? [],
  }
}

/* ---------- tactics: state → { results: [state] } | { fail } ---------- */

/** rule: the first goal unified with the rule's conclusion, and replaced by its premises. */
export function rule(s, R) {
  const g = s.goals[0]
  if (!g) return { fail: NO_GOALS }
  const r = renamed(R, metasOfState(s))
  const scopes = { ...s.scopes, ...Object.fromEntries(r.metas.map((m) => [m, fixesOf(g)])) }
  const u = unify([[r.conclusion, g.goal]], s.inst ?? {}, { scopes, fixed: s.fixed ?? [] })
  if (u.fail) return { fail: T(`「${R.name.zh}」的结论对不上第一个目标：${u.fail.zh}`, `The conclusion of “${R.name.en}” does not fit the first goal: ${u.fail.en}`) }
  const { goals, fixed } = lift(r.premises, g, s)
  return { results: [after(s, u.σ, [...goals, ...s.goals.slice(1)], scopes, fixed)] }
}

/** assumption: the first goal unified with one of its hypotheses (each that fits is a result). */
export function assumption(s) {
  const g = s.goals[0]
  if (!g) return { fail: NO_GOALS }
  const results = []
  const why = []
  for (const h of g.hyps) {
    const u = unify([[g.goal, h]], s.inst ?? {}, { scopes: s.scopes ?? {}, fixed: s.fixed ?? [] })
    if (u.fail) { why.push(u.fail); continue }
    results.push(after(s, u.σ, s.goals.slice(1), s.scopes ?? {}))
  }
  if (results.length) return { results }
  return { fail: late(why) ?? NONE }
}
const NONE = T('第一个目标和哪一条已知都对不上', 'The first goal fits none of its hypotheses')

// Of the reasons unifying failed, the one worth saying: a metavariable that may not become a thing fixed after it.
const late = (why) => why.find((w) => /之前留下|was left before/.test(w.en)) ?? null

/** erule: rule, then assumption on the goal it leaves first (the rule's first premise fitted to a hypothesis). */
export function erule(s, R) {
  const r = rule(s, R)
  if (r.fail) return r
  const a = assumption(r.results[0])
  return a.fail && a.fail === NONE ? { fail: T(`「${R.name.zh}」的第一条前提对不上哪一条已知`, `The first premise of “${R.name.en}” fits no hypothesis`) } : a
}

/** defer: the first goal moved to the end. */
export function defer(s) {
  if (!s.goals.length) return { fail: NO_GOALS }
  return { results: [{ ...s, more: undefined, error: undefined, goals: [...s.goals.slice(1), s.goals[0]] }] }
}

/** Each of a list of rules in turn, every result of each (a rule set). */
export function eachRule(s, rules, tactic) {
  const results = []
  let why = null
  for (const r of rules) {
    const out = tactic(s, r)
    if (out.fail) why ??= out.fail
    else results.push(...out.results)
  }
  return results.length ? { results } : { fail: why ?? T('没有规则', 'No rule') }
}

// A hypothesis written out with its ?-letters named in the order they appear: Human(?t1) → Animal(?t1) is the same
// hypothesis as Human(?t) → Animal(?t), so taking one again with a new ?-letter is nothing new. (Goals keep their
// letters: a goal asking the same of a new ?-letter, as a rule calling itself does, may well be progress.)
const shapeOf = (f) => {
  const names = new Map()
  return keyOf(f).replace(/"name":"(\?[^"]+)"/g, (_, n) => {
    if (!names.has(n)) names.set(n, `?${names.size}`)
    return `"name":"${names.get(n)}"`
  })
}
// A state's goals by their sentence, each with its hypotheses written out (kept, as a search compares a state with
// every one on its path).
const indexed = new WeakMap()
function goalsBy(s) {
  if (!indexed.has(s)) {
    const by = new Map()
    for (const g of s.goals) {
      const k = keyOf(g.goal)
      if (!by.has(k)) by.set(k, [])
      by.get(k).push({ fixes: fixesOf(g), hyps: g.hyps.map(shapeOf) })
    }
    indexed.set(s, by)
  }
  return indexed.get(s)
}
// Is a goal (g2) no easier than another with the same sentence (g): each hypothesis of g2 one of g's, once each thing
// g2 fixed beyond g's is named as one of g's (taking a thing out again gives nothing new).
function noEasier(g2, g) {
  const have = new Set(g.hyps)
  const extra = g2.fixes.filter((x) => !g.fixes.includes(x))
  const namings = extra.reduce((list, x) => list.flatMap((m) => g.fixes.map((y) => [...m, [keyOf(fn(x)), keyOf(fn(y))]])), [[]])
  return namings.some((m) => g2.hyps.every((h) => have.has(m.reduce((k, [x, y]) => k.split(x).join(y), h))))
}
/**
 * A state that is no nearer the end than one before it: it has as many goals at least, and each goal of that one has
 * a goal here no easier than it.
 */
export function noProgress(next, before) {
  if (next.goals.length < before.goals.length) return false
  const there = goalsBy(next)
  for (const [k, goals] of goalsBy(before)) {
    const same = there.get(k)
    if (!same || !goals.every((g) => same.some((g2) => noEasier(g2, g)))) return false
  }
  return true
}

/**
 * Depth first: the results of `expand` on each state, deeper and deeper, every state with no goal left found, in
 * order; a path stops at `depth` steps (when given), and is not followed into a state no nearer the end than one
 * already on it. { found, stopped }: stopped when it went on for `limit` steps.
 */
export function depthFirst(starts, expand, { depth = Infinity, limit = 600, most = 12 } = {}) {
  const found = []
  let steps = 0
  let stopped = false
  const go = (s, d, path) => {
    if (found.length >= most || stopped) return
    if (!s.goals.length) { found.push(s); return }
    if (d >= depth) return
    if (++steps > limit) { stopped = true; return }
    const on = [s, ...path]
    for (const next of expand(s)) if (!on.some((b) => noProgress(next, b))) go(next, d + 1, on)
  }
  for (const s of starts) go(s, 0, [])
  return { found, stopped }
}

/** The kernel's rules by key. */
export const KERNEL = Object.fromEntries(KERNEL_RULES.map((r) => [r.key, r]))

/** frule: the rule used forward, as the player builds it: Have (cut) leaves a sentence ?A to prove first, then erule. */
export function frule(s, R) {
  const c = rule(s, KERNEL.cut)
  return c.fail ? c : erule(c.results[0], R)
}

const ok = (r) => r.results ?? []
/** One step taking the first goal apart by its shape: every introduction rule that fits (rules: the rule book). */
export const introStep = (s, rules = KERNEL) => eachRule(s, INTRO_RULES.map((k) => rules[k]), rule)
/** One step using a hypothesis: every elimination rule that fits one, by erule. */
export const elimStep = (s, rules = KERNEL) => eachRule(s, ELIM_RULES.map((k) => rules[k]), erule)
/** auto, as the player builds it: depth-first search, each step assumption, then taking the goal apart, then using a hypothesis. */
export function auto(starts, rules = KERNEL, { limit = 250, most = 60 } = {}) {
  return depthFirst(starts, (x) => [...ok(assumption(x)), ...ok(introStep(x, rules)), ...ok(elimStep(x, rules))], { limit, most })
}
