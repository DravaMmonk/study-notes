// Proof states and tactics (《证明完毕》 chapters 7 and 8). A proof state is the goals still open, each with the things
// it has fixed and the hypotheses it may use; metavariables a rule left in them are shared by every goal, and filled in
// wherever one is unified (Isabelle's ?A, Lean's ?m). A tactic takes a state to the states it can make of it: none
// (it fails, and says why), one, or several (chapter 8: one for each way it applies, tried in order). Tactics only use
// rules, read backwards: whatever they prove, the kernel proves too.
//
//   state  { kind: 'state', goals: [goal], scopes: { ?name: [fixed] }, inst: σ, fixed: [name], query: [?name],
//            error?: { zh, en }, more?: [state], endless?, root?, fills?, holes?, named? }
//   goal   { fixes: [name], hyps: [formula], goal: formula, hole?, terms? }
//
// A state may also build the proof's term as it goes (startState's `terms`, Lean's way: a goal is a hole in the term,
// pterm.js). Then `root` is the hole the whole proof fills, `fills` what each hole has been filled with (terms with
// holes of their own), each goal names its hole and gives each of its hypotheses a term (a given's name, a box's
// assumption, p.1 for half of p …); `holes` and `named` count the holes and the assumptions' names made so far. A rule
// fills its goal's hole with its own term over new holes, one for each premise; Assumption fills it with a
// hypothesis's term.
//
// `scopes` says which fixed things each metavariable may become (those fixed when it was left), `inst` what the
// metavariables have become so far, `query` the metavariables of the start (a question: who is a grandparent?), and
// `more` the further results after this one, when a tactic gives several, and `endless` that a search making them did
// not stop (schematic.js does the unifying).
import { fn, subst, tvar } from './formula.js'
import { absurd, cases, fillHoles, fst, hole, inl, inr, lam, mapTerm, obj, open as unpack, pair, papp, pconst, pvar, raa, rfl, snd } from './pterm.js'
import { ELIM_RULES, INTRO_RULES, KERNEL_RULES, instantiate, metasIn, unify } from './schematic.js'

const T = (zh, en) => ({ zh, en })
const NO_GOALS = T('已经没有目标了', 'No goals left')
// The names a fixed thing gets, in order.
const FIXED = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'k', 'm', 'n']

export const stateValue = (goals, error = null) => ({ kind: 'state', goals, ...(error ? { error } : {}) })
// The names the givens of a proof's start have in its term.
export const GIVEN = ['p', 'q', 'r', 's', 'u', 'v', 'w', 'z']
/**
 * A state's start: one goal with its hypotheses; its metavariables (a question's) may become anything. With `terms`,
 * the state also builds the proof's term, the givens named p, q, r … in order.
 */
export function startState(goal, hyps = [], { terms = false } = {}) {
  const query = [...metasIn(goal)]
  const start = { kind: 'state', goals: [{ fixes: [], hyps, goal }], scopes: Object.fromEntries(query.map((m) => [m, []])), inst: {}, fixed: [], query }
  if (!terms) return start
  return { ...start, goals: [{ ...start.goals[0], hole: 'm0', terms: hyps.map((_, k) => pvar(GIVEN[k])) }], root: 'm0', fills: {}, holes: 1, named: 0 }
}
/**
 * The proof term a state has built so far (with holes where goals are left): its things as they are now, a thing a
 * goal fixed written as the name its λ binds.
 */
export function proofTermOf(s) {
  const fixed = new Set(s.fixed ?? [])
  const thing = (t) => (t.t === 'fn' && !t.args.length && fixed.has(t.f) ? tvar(t.f) : t.args ? { ...t, args: t.args.map(thing) } : t)
  return mapTerm(fillHoles(hole(s.root), s.fills), (u) => (u.k === 'obj' ? obj(thing(instantiate(u.term, s.inst ?? {}))) : u))
}
/** A state's results as a list: itself and the ones after it. */
export const resultsOf = (s) => [{ ...s, more: undefined, endless: undefined }, ...(s.more ?? [])]
/** A list of results as one value: the first, carrying the rest; the first failure when there is none. */
export const asValue = (list, failed) => (list.length ? (list.length > 1 ? { ...list[0], more: list.slice(1) } : list[0]) : failed)
/** What the start's metavariables have become in a state (a question's answer). */
export const answerOf = (s) => (s.query ?? []).map((m) => instantiate(/^\?[A-Z]/.test(m) ? { op: 'meta', name: m } : { t: 'var', name: m }, s.inst ?? {}))

const fixesOf = (g) => g.fixes ?? []
function metasOfState(s) {
  const out = new Set(Object.keys(s.scopes ?? {}))
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
  return { ...rule, conclusion: ren(rule.conclusion), premises: rule.premises.map((p) => ({ ...p, show: ren(p.show), hyps: p.hyps.map(ren) })), metas: Object.values(names), names }
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
// The state after a step: the new goals in front of the rest, everything with σ put in; a hypothesis already there is
// not kept twice (its first term stays). `made`: the holes filled, and the counts after the step, for a state building
// its term.
function after(s, σ, goals, scopes, fixed = [], made = {}) {
  const put = (f) => instantiate(f, σ)
  const goal = (g) => {
    const kept = new Map()
    g.hyps.forEach((h, k) => { const f = put(h); if (!kept.has(keyOf(f))) kept.set(keyOf(f), [f, g.terms?.[k]]) })
    const both = [...kept.values()]
    return { fixes: fixesOf(g), hyps: both.map(([f]) => f), goal: put(g.goal), ...(g.hole ? { hole: g.hole, terms: both.map(([, t]) => t) } : {}) }
  }
  return {
    kind: 'state',
    goals: goals.map(goal),
    scopes,
    inst: σ,
    fixed: [...(s.fixed ?? []), ...fixed],
    query: s.query ?? [],
    ...(s.root ? { root: s.root, fills: { ...s.fills, ...made.fills }, holes: made.holes ?? s.holes, named: made.named ?? s.named } : {}),
  }
}

// Each kernel rule's term over its premises' holes (m), the names of the assumptions it binds (h, by premise), the
// things a premise fixes (x, by premise) and its things left open (t('?t')); `hyps` the terms of the assumptions a
// premise gets when they are not names a λ binds (the halves of a pair, an Apply made already).
const TERMS = {
  conjI: { make: (m) => ({ term: pair(m[0], m[1]) }) },
  impI: { binds: true, make: (m, h) => ({ term: lam(h[0][0], m[0]) }) },
  disjI1: { make: (m) => ({ term: inl(m[0]) }) },
  disjI2: { make: (m) => ({ term: inr(m[0]) }) },
  allI: { make: (m, _h, x) => ({ term: lam(x[0][0], m[0]) }) },
  exI: { make: (m, _h, _x, t) => ({ term: pair(t('?t'), m[0]) }) },
  mp: { make: (m) => ({ term: papp(m[0], m[1]) }) },
  conjE: { make: (m) => ({ term: m[1], hyps: [[], [fst(m[0]), snd(m[0])]] }) },
  conjunct1: { make: (m) => ({ term: fst(m[0]) }) },
  conjunct2: { make: (m) => ({ term: snd(m[0]) }) },
  disjE: { binds: true, make: (m, h) => ({ term: cases(m[0], h[1][0], m[1], h[2][0], m[2]) }) },
  impE: { make: (m) => ({ term: m[2], hyps: [[], [], [papp(m[0], m[1])]] }) },
  botE: { make: (m) => ({ term: absurd(m[0]) }) },
  spec: { make: (m, _h, _x, t) => ({ term: papp(m[0], t('?t')) }) },
  allE: { make: (m, _h, _x, t) => ({ term: m[1], hyps: [[], [papp(m[0], t('?t'))]] }) },
  exE: { binds: true, make: (m, h, x) => ({ term: unpack(m[0], x[1][0], h[1][0], m[1]) }) },
  raa: { make: (m) => ({ term: raa(m[0]) }) },
  cut: { make: (m) => ({ term: m[1], hyps: [[], [m[0]]] }) },
  refl: { make: () => ({ term: rfl }) },
}
/** The things a level's own rule is about (its ?-letters for things), in the order its term passes them: as they first appear, premises first. */
export function thingsOf(r) {
  const seen = new Set()
  for (const f of [...r.premises.flatMap((p) => [...p.hyps, p.show]), r.conclusion]) metasIn(f, seen)
  return [...seen].filter((n) => /^\?[a-z]/.test(n))
}
// What a rule (renamed apart: r) fills goal g's hole with in state s, and the new goals' holes and hypothesis terms.
function fillFor(s, r, g, goals) {
  const holes = r.premises.map((_, k) => `m${s.holes + k}`)
  const own = TERMS[r.key] && !r.lemma && !r.own ? TERMS[r.key] : null
  let named = s.named
  const binders = r.premises.map((p) => (own?.binds ? p.hyps.map(() => `h${++named}`) : []))
  const fixes = goals.map((x) => x.fixes.slice(fixesOf(g).length))
  const m = holes.map(hole)
  const things = (name) => obj(tvar(r.names[name] ?? name))
  // A lemma is its card's name applied to its premises; a level's own rule, an axiom, to its things and its premises.
  const made = own ? own.make(m, binders, fixes, things)
    : r.lemma ? { term: m.reduce(papp, pconst(r.key)) }
    : { term: m.reduce(papp, thingsOf(r).map((n) => obj(tvar(n))).reduce(papp, pvar(r.key))) }
  goals.forEach((x, k) => {
    x.hole = holes[k]
    x.terms = [...g.terms, ...(made.hyps?.[k] ?? binders[k].map(pvar))]
  })
  return { fills: { [g.hole]: made.term }, holes: s.holes + holes.length, named }
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
  const made = s.root ? fillFor(s, r, g, goals) : {}
  return { results: [after(s, u.σ, [...goals, ...s.goals.slice(1)], scopes, fixed, made)] }
}

/** assumption: the first goal unified with one of its hypotheses (each that fits is a result). */
export function assumption(s) {
  const g = s.goals[0]
  if (!g) return { fail: NO_GOALS }
  const results = []
  const why = []
  g.hyps.forEach((h, k) => {
    const u = unify([[g.goal, h]], s.inst ?? {}, { scopes: s.scopes ?? {}, fixed: s.fixed ?? [] })
    if (u.fail) { why.push(u.fail); return }
    results.push(after(s, u.σ, s.goals.slice(1), s.scopes ?? {}, [], s.root ? { fills: { [g.hole]: g.terms[k] } } : {}))
  })
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

// A state's goals by their sentence, each with its hypotheses written out (kept, as a search compares a state with
// every one on its path).
const indexed = new WeakMap()
function goalsBy(s) {
  if (!indexed.has(s)) {
    const by = new Map()
    for (const g of s.goals) {
      const k = keyOf(g.goal)
      if (!by.has(k)) by.set(k, [])
      by.get(k).push({ fixes: fixesOf(g), hyps: g.hyps.map(keyOf) })
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
/** A state that is no nearer the end than one before it: each goal of that one has a goal here no easier than it. */
export function noProgress(next, before) {
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
