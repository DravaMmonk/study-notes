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
import { KERNEL_RULES, RULE_SETS, instantiate, metasIn, unify } from './schematic.js'

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
// The state after a step: the new goals in front of the rest, everything with σ put in.
function after(s, σ, goals, scopes, fixed = []) {
  const put = (f) => instantiate(f, σ)
  return {
    kind: 'state',
    goals: goals.map((g) => ({ fixes: fixesOf(g), hyps: g.hyps.map(put), goal: put(g.goal) })),
    scopes,
    inst: σ,
    fixed: [...(s.fixed ?? []), ...fixed],
    query: s.query ?? [],
  }
}

/** The rules a key names: one rule, or each of a set's (rules: the level's rule book, by key). */
export const rulesNamed = (key, rules) => (RULE_SETS[key] ? RULE_SETS[key].rules.map((k) => rules[k]) : rules[key] ? [rules[key]] : [])

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
  return { fail: late(why) ?? T('第一个目标和哪一条已知都对不上', 'The first goal fits none of its hypotheses') }
}

// Of the reasons unifying failed, the one worth saying: a metavariable that may not become a thing fixed after it.
const late = (why) => why.find((w) => /之前留下|was left before/.test(w.en)) ?? null

// A rule whose first premise is a plain sentence: what it says about the hypothesis it uses up.
const major = (r) => (r.premises[0] && !r.premises[0].fixes.length && !r.premises[0].hyps.length ? r.premises[0].show : null)

/** erule: like rule, and its first premise unified with a hypothesis, which it uses up (each that fits is a result). */
export function erule(s, R) {
  const g = s.goals[0]
  if (!g) return { fail: NO_GOALS }
  if (!major(R)) return { fail: T(`「${R.name.zh}」没有能对上已知的第一条前提`, `“${R.name.en}” has no first premise to fit a hypothesis`) }
  const results = []
  const why = []
  g.hyps.forEach((h, i) => {
    const r = renamed(R, metasOfState(s))
    const scopes = { ...s.scopes, ...Object.fromEntries(r.metas.map((m) => [m, fixesOf(g)])) }
    const u = unify([[r.conclusion, g.goal], [major(r), h]], s.inst ?? {}, { scopes, fixed: s.fixed ?? [] })
    if (u.fail) { why.push(u.fail); return }
    const { goals, fixed } = lift(r.premises.slice(1), { ...g, hyps: g.hyps.filter((_, k) => k !== i) }, s)
    results.push(after(s, u.σ, [...goals, ...s.goals.slice(1)], scopes, fixed))
  })
  if (results.length) return { results }
  return { fail: late(why) ?? T(`「${R.name.zh}」对不上：结论要对上第一个目标，第一条前提要对上一条已知`, `“${R.name.en}” does not fit: its conclusion must fit the first goal and its first premise a hypothesis`) }
}

/**
 * drule: the rule's first premise unified with a hypothesis, which becomes the rule's conclusion (frule: the
 * hypothesis stays, and the conclusion is added); the rule's other premises are goals of their own, in front.
 */
export function drule(s, R, keep = false) {
  const g = s.goals[0]
  if (!g) return { fail: NO_GOALS }
  if (!major(R)) return { fail: T(`「${R.name.zh}」没有能对上已知的第一条前提`, `“${R.name.en}” has no first premise to fit a hypothesis`) }
  const results = []
  g.hyps.forEach((h, i) => {
    const r = renamed(R, metasOfState(s))
    const scopes = { ...s.scopes, ...Object.fromEntries(r.metas.map((m) => [m, fixesOf(g)])) }
    const u = unify([[major(r), h]], s.inst ?? {}, { scopes, fixed: s.fixed ?? [] })
    if (u.fail) return
    const hyps = keep ? g.hyps : g.hyps.filter((_, k) => k !== i)
    const { goals, fixed } = lift(r.premises.slice(1), { ...g, hyps }, s)
    results.push(after(s, u.σ, [...goals, { fixes: fixesOf(g), hyps: [...hyps, r.conclusion], goal: g.goal }, ...s.goals.slice(1)], scopes, fixed))
  })
  if (results.length) return { results }
  return { fail: T(`「${R.name.zh}」的第一条前提对不上哪一条已知`, `The first premise of “${R.name.en}” fits no hypothesis`) }
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

/**
 * Depth first: the results of `expand` on each state, deeper and deeper, every state with no goal left found, in
 * order; a path stops at `depth` steps (when given). { found, stopped }: stopped when it went on for `limit` steps.
 */
export function depthFirst(starts, expand, { depth = Infinity, limit = 600, most = 12 } = {}) {
  const found = []
  let steps = 0
  let stopped = false
  const go = (s, d) => {
    if (found.length >= most || stopped) return
    if (!s.goals.length) { found.push(s); return }
    if (d >= depth) return
    if (++steps > limit) { stopped = true; return }
    for (const next of expand(s)) go(next, d + 1)
  }
  for (const s of starts) go(s, 0)
  return { found, stopped }
}

/** The kernel's rules by key. */
export const KERNEL = Object.fromEntries(KERNEL_RULES.map((r) => [r.key, r]))

/**
 * auto: depth first, each step trying assumption, then every introduction rule, then every elimination rule on a
 * hypothesis; at most `depth` steps on a path (the player's own, built in: search, append and two rule sets).
 */
export function auto(s, { depth = 12, limit = 4000 } = {}) {
  const expand = (x) => [
    ...(assumption(x).results ?? []),
    ...(eachRule(x, rulesNamed('intro', KERNEL), rule).results ?? []),
    ...(eachRule(x, rulesNamed('elim', KERNEL), erule).results ?? []),
  ]
  return depthFirst([s], expand, { depth, limit })
}
