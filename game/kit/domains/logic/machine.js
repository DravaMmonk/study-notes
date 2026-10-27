// The machine board (《证明完毕》 chapter 7 on): a circuit whose wires carry equations, proof states, formulas or
// clause sets instead of proved judgments. Its sources (`in` cards, one per input the level names) give the test's
// inputs, its sink `out` is checked against what the level wants. A part is a rule of unification, a tactic, a frame
// that runs what it holds again and again (repeat, depth-first search, every goal) or tries several things (the
// alternatives frame), a rewrite, or a step on clauses (resolution.js); the level's parts come from the course as
// on every board. A part the player builds (the unifier, erule, frule, the introduction and elimination steps, auto)
// runs as its built-in implementation, which does what the circuit that built it does.
//
//   value   { kind: 'eqs', eqs: [equation], fail } (schematic.js) | { kind: 'state', … } (tactics.js)
//           | { kind: 'clauses', set, from?, endless? } (resolution.js)
//   level   { kind: 'machine', want, inputs?: [{ name, label }] (default one, `in`),
//             rules?: { key: { name, premises: [text], conclusion: text } }, backtrack?,
//             tests: [{ eqs: [equation text] } | { goal, hyps?, answers?, becomes?, clauses?, budget? }
//             | { clauses: [clause text], budget? }, want?] }
//
// What a level wants of its output (`want`, or a test's own): 'unify' (the solved equations, when the input has a
// unifier, or a failure when it has none), 'proved' (no goal left), 'becomes' (the results the test lists, each its
// goals written '⋀a. h1; h2 ⊢ goal', its ?-letters named as the machine likes: none, for a step that must fail),
// 'answers' (every way of proving the goal, as a
// question's answers: the test's `answers`, the things its ?-letters become), 'fails' (the goal cannot be proved, and
// the machine says so, having stopped); on clauses (chapter 13), 'clauses' (the clause set the test lists, from a goal),
// 'refuted' (a clause set holding ⊥, within the test's `budget` of clauses when it has one) and 'decide' (⊥ when the
// clauses cannot all hold, saturated without it when they can).
//
// Rewriting (chapter 9, rewrite.js): the rewrite card uses one rule of the level's rewrite book (rewriteBookOf: laws
// proved both ways, the level's `defs`, the goal's hypotheses) once; simp, which the player builds, uses a list of
// them until none fits. Both rewrite the goal, or (chapter 13, the card's `at`) its hypotheses.
//
// Rules on cards (rule, erule, frule) are named by key in the level's rule book (ruleBookOf: the kernel's rules, the
// lemmas' and the level's own). Until a level says `backtrack`, a tactic gives only its first result; from then on,
// every result, and each card after it works on each of them in turn (tactics.js).
import { PartError, evaluate } from '../../engine/circuit.js'
import { runBoard, sink, source } from '../../engine/boards.js'
import { framePart, within } from '../../circuit/frames.js'
import { all, fn, subst, tvar } from './formula.js'
import { KERNEL, answerOf, asValue, assumption, auto, defer, depthFirst, elimStep, erule, frule, introStep, resultsOf, rule, startState } from './tactics.js'
import { FULL, UNIFY_RULES, instantiate, lemmaRules, parseEquation, parseS, ruleOf, sameSide, sideText, solveEqs, solved } from './schematic.js'
import { rewrite, rewriteBookOf, simplify } from './rewrite.js'
import { datatypesRules } from './datatype.js'
import { clausesOfState, oracleRound, parseClause, refuted, replay, resolveRound, saturate } from './resolution.js'

const T = (zh, en) => ({ zh, en })
const fail = (zh, en) => new PartError({ zh, en })
export const clausesValue = (set, extra = {}) => ({ kind: 'clauses', set, ...extra })
export const eqsValue = (eqs, fail = null) => ({ kind: 'eqs', eqs, fail })

const books = new WeakMap()
/**
 * A level's rule book: every rule a card may name, by key: the kernel's, those its datatypes give (datatype.js), each
 * lemma's shapes, the equations proved (`facts`) and the level's own. A
 * level of a course (`holds`: the parts it can hold, `forms`: the shapes each lemma has there, course.js) has a kernel
 * rule once it holds its part, and a lemma once the lemma is built, in the shapes it has gained.
 */
export function ruleBookOf(level) {
  if (!books.has(level)) {
    const has = (p) => !level.holds || level.holds.includes(p)
    const own = Object.entries(level.rules ?? {}).map(([key, r]) => ({ ...ruleOf(key, r.name, r.premises ?? [], r.conclusion), own: true }))
    const shaped = (type, l) => (r) => !l.forms || !level.forms?.[type] || level.forms[type].includes(r.key.split('.')[1] ?? l.forms[0].key)
    const lemmas = Object.entries(level.lemmas ?? {}).filter(([type]) => has(type)).flatMap(([type, l]) => lemmaRules(type, l).filter(shaped(type, l)))
    const facts = Object.entries(level.facts ?? {}).filter(([type]) => has(type)).map(([type, f]) => ({ ...ruleOf(type, f.name, [], f.statement), lemma: type }))
    books.set(level, Object.fromEntries([...Object.values(KERNEL).filter((r) => has(r.part)), ...datatypesRules(level.datatypes), ...lemmas, ...facts, ...own].map((r) => [r.key, r])))
  }
  return books.get(level)
}

const stateIn = (v) => {
  if (v.kind !== 'state') throw fail('这里要一个证明状态（还没证完的目标）', 'This needs a proof state (the goals still open)')
  return v
}
const firstOf = (s) => ({ ...s, more: undefined })
// A tactic card: on each result it is handed (only the first, until the level backtracks), every result it makes; a
// failure is the state with what went wrong (a frame reads it). An input that failed passes through.
const tactic = (t) => ({
  inputs: ['in'],
  eval: ({ in: v }, node, ctx) => {
    const s = stateIn(v)
    if (s.error) return s
    const out = []
    let why = null
    for (const one of ctx.backtrack ? resultsOf(s) : [firstOf(s)]) {
      const r = t(one, ctx, node)
      if (r.fail) why ??= r.fail
      else out.push(...r.results)
      if (out.length >= 24) break
    }
    const made = asValue(ctx.backtrack ? out : out.slice(0, 1), { ...firstOf(s), error: why })
    return s.endless ? { ...made, endless: true } : made
  },
})
// The rule a card's setting names; none chosen yet, or one the level does not have, cannot run.
function chosen(ctx, node) {
  const key = node.params?.rule
  if (!key) throw fail('元件上还没选规则', 'No rule chosen on the part yet')
  const r = (ctx.rules ?? KERNEL)[key]
  if (!r) throw fail('这一关没有这条规则', 'This level has no such rule')
  return r
}
const ruleCard = (t) => ({ ...tactic((s, ctx, node) => t(s, chosen(ctx, node))), params: ['rule'] })
// The rewrite rules a card's setting names (`rewrite`: one; `rewrites`: a list, in order).
function rewritesOf(ctx, node, key) {
  const keys = (node.params?.[key] ?? '').split(',').filter(Boolean)
  if (!keys.length) throw fail('元件上还没选改写规则', 'No rewrite rule chosen on the part yet')
  return keys.map((k) => {
    const r = ctx.rewrites?.[k]
    if (!r) throw fail('这一关没有这条改写规则', 'This level has no such rewrite rule')
    return r
  })
}
// Where a rewrite card rewrites: the goal, or the hypotheses.
const atOf = (node) => (node.params?.at === 'hyps' ? 'hyps' : 'goal')
// A step inside a part, for a traced run (../../engine/circuit.js): a round of it, or the card it applies (`sub`).
const inner = (ctx, node, value, extra) => ctx?.trace?.push({ id: node.id, key: null, inner: true, value, ...extra })
const UNIFY_CARDS = { delete: 'uDelete', decompose: 'uDecompose', conflict: 'uConflict', swap: 'uSwap', check: 'uCheck', eliminate: 'uEliminate', pattern: 'uPattern' }
const clausesIn = (v) => {
  if (v.kind !== 'clauses') throw fail('这里要一组子句：先把证明状态拆成子句', 'This needs a clause set: split the proof state into clauses first')
  return v
}
const eqsIn = (v) => {
  if (v.kind !== 'eqs') throw fail('这里要一组等式', 'This needs a set of equations')
  return v
}
// A unification rule card: the rule once, where it first applies; a set already failed passes through.
const unifyCard = (r) => ({ inputs: ['in'], eval: ({ in: v }) => { const e = eqsIn(v); if (e.fail) return e; const next = UNIFY_RULES[r](e.eqs, {}); return next ? eqsValue(next.eqs, next.fail ?? null) : e } })

/**
 * What a frame's region makes of a value, run on its own: the cards inside the frame (frames inside it with their own),
 * with what the region opens with given as the value. Only what the frame opens can be read inside it.
 */
function regionRun(node, ctx, region) {
  const graph = ctx.graph
  const deep = within(graph, node.id)
  const inside = graph.nodes.filter((n) => deep.has(n.id))
  const ids = new Set(inside.map((n) => n.id))
  const back = graph.wires.find((w) => w.to === node.id && w.port === region)
  if (!back) throw fail('框里还没有接到「结果」上', 'Nothing inside is wired to the result yet')
  for (const w of graph.wires.filter((x) => ids.has(x.to))) {
    if (!ids.has(w.from.split('#')[0]) && w.from !== `${node.id}#${region}`) throw fail('框里只能用框开出来的东西', 'Inside the frame, only what the frame opens can be used')
  }
  const OPEN = '__open'
  const sub = {
    nodes: [{ id: OPEN, type: '__open' }, ...inside.map(({ in: _, ...n }) => n)],
    wires: graph.wires.filter((w) => ids.has(w.to)).map((w) => (w.from === `${node.id}#${region}` ? { ...w, from: OPEN } : w)),
  }
  const parts = ctx.engine.parts
  // quiet: the cards' steps stay out of a traced run (a search shows its steps its own way).
  return (value, quiet = false) => {
    const { values } = evaluate(sub, { parts: (type) => (type === '__open' ? { inputs: [], eval: () => value } : parts[type]), ctx: quiet ? { ...ctx, trace: null } : ctx })
    const out = values.get(back.from)
    if (out === undefined) throw fail('框里有一个元件算不出来', 'A part inside cannot compute')
    return out
  }
}

/**
 * The repeat frame: what its region makes from the value it opens with is fed back in, again and again, until it
 * stops changing (or a clause set holds ⊥, an equation set fails, no goal is left, or a tactic fails: then the round
 * before stands). On proof states it follows the first result only. Its region shows the first round; the frame gives
 * the last.
 */
const repeat = {
  ...framePart(['in'], [{ name: 'body', opens: true }]),
  eval: ({ in: v, body }, node, ctx, key) => {
    if (key) return v
    const round = regionRun(node, ctx, 'body')
    const first = (x) => (x.kind === 'state' ? firstOf(x) : x)
    const same2 = (a, b) => JSON.stringify(a) === JSON.stringify(b)
    let cur = first(v)
    for (let k = 0; k < 60; k++) {
      if ((cur.kind === 'clauses' && refuted(cur.set)) || (cur.kind === 'eqs' && cur.fail)) return cur
      if (cur.kind === 'state' && (cur.error || !cur.goals.length)) return cur
      // A traced run (../../engine/circuit.js) sees each round: what the frame opens with, its cards, what comes back.
      // The board's own pass was the first round; these are the second on.
      let next
      if (k === 0) next = first(body)
      else {
        ctx.trace?.push({ id: node.id, key: 'body', value: cur })
        next = first(round(cur))
        ctx.trace?.push({ id: node.id, key: null, round: k + 1, value: next, quiet: true })
      }
      if (next.kind === 'state' && next.error) return cur
      if (same2(next, cur)) return cur
      cur = next
    }
    throw fail('转了 60 圈还没停下来', 'Still changing after 60 rounds')
  },
}

const LIMIT = 250
/**
 * Depth-first search: what the region makes of each result it is handed, and of each result of that, deeper and
 * deeper, every state with no goal left found, in order. A path stops at the card's depth, when it has one.
 */
const search = {
  ...framePart(['in'], [{ name: 'body', opens: true }]),
  params: ['depth'],
  eval: ({ in: v }, node, ctx, key) => {
    if (key) return v
    const s = stateIn(v)
    if (s.error) return s
    const round = regionRun(node, ctx, 'body')
    const depth = Number(node.params?.depth) || Infinity
    let k = 0
    const expand = (x) => {
      const out = round(x, true)
      if (++k <= 30) inner(ctx, node, out, { label: T(`第 ${k} 步`, `step ${k}`) })
      return out.error ? [] : resultsOf(out)
    }
    const { found, stopped } = depthFirst(resultsOf(s), expand, { depth, limit: LIMIT, most: 60 })
    // A search that has not stopped gives what it found so far (the first is enough to prove a goal), and says it goes
    // on: asking for every answer then never ends.
    const none = stopped ? T(`搜了 ${LIMIT} 步还没停下来：有一条路走不到头`, `Searched ${LIMIT} steps without stopping: one path never ends`)
      : depth < Infinity ? T(`${depth} 层以内都搜遍了，也没有证完`, `Searched everything within ${depth} levels without finishing`) : T('都搜遍了，也没有证完', 'Searched everything without finishing')
    const out = asValue(found, { ...firstOf(s), error: none })
    return stopped ? { ...out, endless: true } : out
  },
}

/** Every goal: the region run on each goal of the state in turn, each on its own (Isabelle's ALLGOALS, Lean's <;>). */
const each = {
  ...framePart(['in'], [{ name: 'body', opens: true }]),
  eval: ({ in: v }, node, ctx, key) => {
    if (key) return v
    const s = stateIn(v)
    if (s.error) return s
    const round = regionRun(node, ctx, 'body')
    const put = (g, σ) => ({ ...g, hyps: g.hyps.map((h) => instantiate(h, σ ?? {})), goal: instantiate(g.goal, σ ?? {}) })
    // Partial results: the goals made so far, and what is known; each goal of the start is done on each of them.
    let partial = (ctx.backtrack ? resultsOf(s) : [firstOf(s)]).map((x) => ({ ...x, goals: [] }))
    let why = null
    for (const g of s.goals) {
      const next = []
      for (const p of partial) {
        const out = round({ ...p, goals: [put(g, p.inst)] }, true)
        if (out.error) { why ??= out.error; continue }
        for (const r of ctx.backtrack ? resultsOf(out) : [firstOf(out)]) next.push({ ...r, more: undefined, goals: [...p.goals.map((x) => put(x, r.inst)), ...r.goals] })
      }
      if (!next.length) return { ...firstOf(s), error: why }
      partial = next.slice(0, 24)
    }
    return asValue(partial)
  },
}

// Alternatives (Isabelle's APPEND, ORELSE when only the first result is followed): every region opens with the value;
// every result of the first region, then every result of the next, those that failed left out. How many regions is
// the card's setting.
const WAYS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']
export const waysOf = (node) => WAYS.slice(0, Math.min(WAYS.length, Math.max(2, Number(node?.params?.ways) || 2)))
const append = {
  inputs: (node) => ['in', ...waysOf(node)],
  frames: (node) => waysOf(node).map((name) => ({ name, opens: true })),
  outputs: (node) => [null, ...waysOf(node)],
  reads: (_node, key) => (key ? ['in'] : undefined),
  params: ['ways'],
  eval: (ins, node, _ctx, key) => {
    if (key) return ins.in
    const got = waysOf(node).map((w) => ins[w])
    const ok = got.filter((x) => !x.error)
    return ok.length ? asValue(ok.flatMap(resultsOf)) : got[0]
  },
}

/** The machine board's parts. */
export const MACHINE_PARTS = {
  in: source(),
  out: sink(),
  // Unification (chapter 7): its rules, the unifier built from them, and patterns.
  uDelete: unifyCard('delete'),
  uDecompose: unifyCard('decompose'),
  uConflict: unifyCard('conflict'),
  uSwap: unifyCard('swap'),
  uCheck: unifyCard('check'),
  uEliminate: unifyCard('eliminate'),
  uPattern: unifyCard('pattern'),
  unifier: {
    inputs: ['in'],
    eval: ({ in: v }, node, ctx) => {
      const e = eqsIn(v)
      if (e.fail) return e
      const set = solveEqs(e.eqs, { onStep: (state, r) => inner(ctx, node, eqsValue(state.eqs, state.fail), { sub: UNIFY_CARDS[r] }) })
      return eqsValue(set.eqs, set.fail)
    },
  },
  repeat,
  // Tactics (chapters 7 and 8): rule and assumption, and what the player builds of them.
  rule: ruleCard(rule),
  assumption: tactic(assumption),
  erule: ruleCard(erule),
  frule: ruleCard(frule),
  defer: tactic(defer),
  append,
  search,
  each,
  introRules: tactic((s, ctx) => introStep(s, ctx.rules ?? KERNEL)),
  elimRules: tactic((s, ctx) => elimStep(s, ctx.rules ?? KERNEL)),
  auto: tactic((s, ctx) => {
    const { found } = auto([s], ctx.rules ?? KERNEL)
    return found.length ? { results: found } : { fail: T('auto 没有证完', 'auto did not finish') }
  }),
  // Rewriting (chapter 9): one rule once, and simp, which the player builds of it, on the goal or the hypotheses.
  rw: { ...tactic((s, ctx, node) => rewrite(s, rewritesOf(ctx, node, 'rewrite')[0], atOf(node))), params: ['rewrite', 'at'] },
  simp: { ...tactic((s, ctx, node) => simplify(s, rewritesOf(ctx, node, 'rewrites'), atOf(node))), params: ['rewrites', 'at'] },
  // Clauses (chapter 13, resolution.js): ∃ out of the hypotheses, a state split into clauses, a round of resolution
  // (the saturator is built of rounds), someone else's prover, and the certificate replayed in the kernel; what the
  // player builds of them.
  skolem: tactic(skolemStep),
  toClauses: { inputs: ['in'], eval: ({ in: v }) => toClauses(v) },
  resolve: { inputs: ['in'], params: ['unit'], eval: ({ in: v }, node) => { const c = clausesIn(v); return { ...c, set: resolveRound(c.set, { unit: node.params?.unit === 'unit' }) } } },
  saturate: { inputs: ['in'], eval: ({ in: v }, node, ctx) => saturated(clausesIn(v), node, ctx) },
  oracle: { inputs: ['in'], eval: ({ in: v }, node, ctx) => saturated(clausesIn(v), node, ctx, oracleRound) },
  replay: { inputs: ['in'], eval: ({ in: v }) => replayed(clausesIn(v)) },
  clausify: { inputs: ['in'], eval: ({ in: v }, _node, ctx) => clausify(stateIn(v), ctx) },
  metis: tactic((s, ctx) => {
    let clauses
    try { clauses = clausify(s, ctx) } catch (e) { if (e instanceof PartError) return { fail: e.label }; throw e }
    const out = replayed(saturated(clauses, null, ctx))
    return out.error ? { fail: out.error } : { results: [out] }
  }),
}

// The fixed things Skolem's ∃ out of a hypothesis may name, in order.
const FRESH = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'k', 'm', 'n']
const quantified = (f) => f.op === '∀' || f.op === '∃' || (f.op === '¬' ? quantified(f.a) : f.a ? quantified(f.a) || quantified(f.b) : false)
/**
 * Skolem: every ∃ in the first goal's hypotheses (in negation normal form) taken out; with none, the state as it is.
 * One under no ∀ is taken out as take the one there is does, its thing fixed (a name); one under a ∀ becomes a function of the
 * ∀'s variables (sk1(x) …), which does not follow from the hypotheses (the state is marked: replaying it would need the
 * axiom of choice).
 */
function skolemStep(s) {
  const g = s.goals[0]
  if (!g) return { fail: T('已经没有目标了', 'No goals left') }
  const fixes = [...(g.fixes ?? [])]
  // Names already about: the fixed things and every name in the goal.
  const used = new Set([...fixes, ...[...JSON.stringify(g).matchAll(/"f":"([^"]+)"/g)].map((m) => m[1])])
  let n = 0
  let choice = false
  const go = (f, scope) => {
    if (f.op === '∃') {
      if (!scope.length) {
        const a = FRESH.find((x) => !used.has(x))
        used.add(a)
        fixes.push(a)
        return go(subst(f.body, f.v, fn(a)), scope)
      }
      choice = true
      return go(subst(f.body, f.v, fn(`sk${++n}`, scope.map(tvar))), scope)
    }
    if (f.op === '∀') return all(f.v, go(f.body, [...scope, f.v]))
    if (f.op === '∧' || f.op === '∨') return { ...f, a: go(f.a, scope), b: go(f.b, scope) }
    if (quantified(f)) throw fail('先把已知化成否定范式：¬ 和 → 挡住了量词', 'Bring the hypotheses to negation normal form first: ¬ and → stand in the quantifiers’ way')
    return f
  }
  const hyps = g.hyps.map((h) => go(h, []))
  return { results: [{ ...s, more: undefined, error: undefined, goals: [{ ...g, fixes, hyps }, ...s.goals.slice(1)], ...(choice || s.choice ? { choice: true } : {}) }] }
}
function toClauses(v) {
  const s = firstOf(stateIn(v))
  if (s.error) throw new PartError(s.error)
  return clausesValue(clausesOfState(s, (t) => new PartError(t)), { from: s })
}
// Rounds until ⊥ or nothing new (a traced run sees each round).
function saturated(c, node, ctx, round = resolveRound) {
  const r = saturate(c.set, { round, onRound: node ? (set, k) => inner(ctx, node, { ...c, set }, { round: k }) : null })
  return { ...c, set: r.set, ...(r.endless ? { endless: true } : {}) }
}
// The certificate replayed: the state it came from with its first goal proved, or with what the kernel would not take.
function replayed(c) {
  const r = replay(c)
  if (r.state) return r.state
  return { ...(c.from ?? { kind: 'state', goals: [] }), error: r.fail }
}
// The laws that bring hypotheses to conjunctive normal form, in order (those the level has).
const CNF_LAWS = ['iff.elim', 'arrow.elim', 'dneg.elim', 'dm.notOr', 'dm.notAnd', 'dm.notEx', 'dm.notAll', 'dist.orAndR', 'dist.orAndL']
/** Into clauses, as the player builds it: by contradiction, the hypotheses to CNF, ∃ out, split. */
function clausify(s0, ctx) {
  const step = (s, t) => {
    if (s.error) return s
    const r = t(firstOf(s))
    return r.fail ? { ...firstOf(s), error: r.fail } : r.results[0]
  }
  let s = step(step(s0, (x) => rule(x, KERNEL.raa)), (x) => rule(x, KERNEL.impI))
  s = step(s, (x) => simplify(x, CNF_LAWS.map((k) => ctx.rewrites?.[k]).filter(Boolean), 'hyps'))
  s = step(s, skolemStep)
  if (s.error) throw new PartError(s.error)
  return toClauses(s)
}

/** A test's inputs as values, by name. */
export function inputsOf(test) {
  if (test.goal) return { in: startState(parseS(test.goal), (test.hyps ?? []).map(parseS)) }
  if (test.eqs) return { in: eqsValue(test.eqs.map(parseEquation)) }
  return { in: clausesValue(clauseSetOf(test.clauses)) }
}
const clauseSetOf = (texts) => [...new Map(texts.map((c) => parseClause(c, parseS)).map((c) => [c.key, c])).values()]
/** The names and labels of a level's inputs. */
export const inputsOfLevel = (level) => level.inputs ?? [{ name: 'in', label: { zh: '输入', en: 'Input' } }]

/** A question's answers in a list of results: what its ?-letters become in each that has no goal left. */
export const answersIn = (out) => [...new Set(resultsOf(out).filter((s) => !s.error && !s.goals.length).map((s) => answerOf(s).map(sideText).join(', ')))].sort()

/** A goal written as a test writes it: '⋀a b. h1; h2 ⊢ goal', each part but the goal left out when empty. */
export function parseGoal(text) {
  const m = /^(?:⋀([a-z ]+)\.\s*)?(?:(.*)⊢\s*)?(.*)$/.exec(text.trim())
  return { fixes: m[1] ? m[1].trim().split(/\s+/) : [], hyps: m[2] ? m[2].split(';').map((h) => parseS(h)) : [], goal: parseS(m[3]) }
}
// A result's goals with its ?-letters named in the order they appear, so two results compare whatever names a step
// gave them.
const canonical = (goals) => {
  const names = new Map()
  return JSON.stringify(goals.map((g) => [g.fixes ?? [], g.hyps, g.goal])).replace(/"name":"(\?[^"]+)"/g, (_, n) => {
    if (!names.has(n)) names.set(n, `?${names.size}`)
    return `"name":"${names.get(n)}"`
  })
}

/** Is the output what the test wants? '' or why not. */
export function judge(want, test, out, level = {}) {
  const input = inputsOf(test).in
  if (!out) return T('还没有东西接到「结果」', 'Nothing reaches the result yet')
  if (want === 'proved') {
    if (out.kind !== 'state') return T('结果要一个证明状态', 'The result must be a proof state')
    if (out.error) return out.error
    return out.goals.length ? T(`还剩 ${out.goals.length} 个目标没证完`, `${out.goals.length} goal${out.goals.length === 1 ? '' : 's'} still open`) : ''
  }
  if (want === 'becomes') {
    if (out.kind !== 'state') return T('结果要一个证明状态', 'The result must be a proof state')
    if (!test.becomes.length) return out.error ? '' : T('这一步应该做不了，机器却做了', 'This step should not apply, yet the machine did it')
    if (out.error) return out.error
    const got = resultsOf(out).map((r) => canonical(r.goals))
    const wanted = test.becomes.map((r) => canonical(r.map(parseGoal)))
    if (got.length !== wanted.length) return T(`要 ${wanted.length} 种结果，得到 ${got.length} 种`, `${wanted.length} result${wanted.length === 1 ? '' : 's'} wanted, ${got.length} made`)
    const k = got.findIndex((g, i) => g !== wanted[i])
    return k < 0 ? '' : T(wanted.length > 1 ? `第 ${k + 1} 种结果的目标和要的不一样` : '得到的目标和要的不一样', wanted.length > 1 ? `Result ${k + 1} has other goals than wanted` : 'The goals made are not the ones wanted')
  }
  if (want === 'fails') {
    if (out.kind !== 'state') return T('结果要一个证明状态', 'The result must be a proof state')
    if (out.endless) return out.error ?? T('搜索停不下来', 'The search never stops')
    if (!out.error) return out.goals.length ? T('这一句证不出来，机器却还没有说「证不出来」', 'This cannot be proved, yet the machine has not said so') : T('这一句不该证得出来', 'This should not be provable')
    return ''
  }
  if (want === 'answers') {
    if (out.kind !== 'state') return T('结果要一个证明状态', 'The result must be a proof state')
    if (out.endless) return T('要找出所有答案，可搜索停不下来：有一条路走不到头', 'Every answer is wanted, but the search never stops: one path never ends')
    if (out.error) return out.error
    const got = answersIn(out)
    const wanted = [...new Set(test.answers)].sort()
    if (got.join(';') === wanted.join(';')) return ''
    const list = (xs) => (xs.length ? xs.join('、') : '没有')
    const listEn = (xs) => (xs.length ? xs.join(', ') : 'none')
    return T(`找到的答案是 ${list(got)}，应该是 ${list(wanted)}`, `The answers found are ${listEn(got)}; they should be ${listEn(wanted)}`)
  }
  if (want === 'unify') {
    if (out.kind !== 'eqs') return T('结果要一组等式', 'The result must be a set of equations')
    const ref = solveEqs(input.eqs, { rules: FULL })
    if (ref.fail) return out.fail ? '' : T('这组等式其实合一不了，结果却没有说「失败」', 'These equations have no unifier, yet the result does not say it failed')
    if (out.fail) return T('这组等式能合一，结果却说失败了', 'These equations can be unified, yet the result says it failed')
    if (!solved(out.eqs)) return T('还没解完：要每个等式左边都是一个 ?，右边里没有这些 ?', 'Not solved yet: each equation must have a ?-letter on the left, and none of those letters on any right side')
    const σ = Object.fromEntries(out.eqs.map((e) => [e.s.name, e.t]))
    return input.eqs.every((e) => sameSide(instantiate(e.s, σ), instantiate(e.t, σ))) ? '' : T('结果代回去，原来的等式两边还不一样', 'Put back into the equations, the result does not make both sides equal')
  }
  if (out.kind !== 'clauses') return T('结果要一组子句', 'The result must be a clause set')
  if (want === 'clauses') {
    const wanted = clauseSetOf(test.clauses).map((c) => c.key).sort()
    const got = out.set.map((c) => c.key).sort()
    return wanted.join(';') === got.join(';') ? '' : T('拆出的子句和要的不一样', 'The clauses made are not the ones wanted')
  }
  const has = refuted(out.set)
  if (want === 'refuted') {
    if (!has) return T('结果里还没有空子句 ⊥', 'The result has no empty clause ⊥ yet')
    return test.budget && out.set.length > test.budget ? T(`推出 ⊥ 用了 ${out.set.length} 条子句，最多只能有 ${test.budget} 条`, `Reaching ⊥ took ${out.set.length} clauses; at most ${test.budget} are allowed`) : ''
  }
  // decide: ⊥ when the clauses cannot all hold; when they can, saturated without it.
  const start = input.kind === 'clauses' ? input.set : clausify(input, ctxOf(level, { nodes: [], wires: [] })).set
  const unsat = refuted(saturate(start).set)
  if (unsat) return has ? '' : T('结果里还没有空子句 ⊥', 'The result has no empty clause ⊥ yet')
  if (has) return T('结果里有 ⊥，可这组子句是可满足的：机器「证」出了假话', 'The result holds ⊥, yet these clauses can all hold: the machine “proved” something false')
  if (out.endless) return T('一直推出新子句，停不下来', 'New clauses keep coming: it never stops')
  return resolveRound(out.set).length === out.set.length ? '' : T('结果还能再归结出新子句：还没饱和', 'The result still resolves into new clauses: not saturated yet')
}

const ctxOf = (level, circuit, extra = {}) => ({ graph: circuit, rules: ruleBookOf(level), rewrites: rewriteBookOf(level), backtrack: Boolean(level.backtrack), ...extra })

/** A machine part run on a proof state with a level's rule and rewrite books (chapter 14: a script's by). */
export const runTactic = (level, type, params, state) => MACHINE_PARTS[type].eval({ in: state }, { id: type, params }, ctxOf(level, { nodes: [], wires: [] }))

/** How a machine level runs and is judged, for the shared engine (../../engine/tests.js). */
export const MACHINE_TESTS = {
  runTest: (level, circuit, test) => {
    const run = runBoard(circuit, { parts: MACHINE_PARTS, bind: inputsOf(test), ctx: ctxOf(level, circuit) })
    return { ...run, outputs: { out: run.outputs.out } }
  },
  // The run of one test with every step it took, in order (../../engine/circuit.js trace): only what reaches the
  // result runs, so a card lying about unwired takes no step.
  trace: (level, circuit, test) => {
    const trace = []
    const run = runBoard(circuit, { parts: MACHINE_PARTS, bind: inputsOf(test), targets: ['out'], ctx: ctxOf(level, circuit, { trace }) })
    return { trace, run: { ...run, outputs: { out: run.outputs.out } } }
  },
  check: (level, test, outputs) => {
    const problem = judge(test.want ?? level.want, test, outputs.out, level)
    return [{ name: 'out', pass: !problem, reason: problem }]
  },
  score: (level, circuit) => ({ steps: circuit.nodes.filter((n) => n.type !== 'in' && n.type !== 'out').length }),
}
