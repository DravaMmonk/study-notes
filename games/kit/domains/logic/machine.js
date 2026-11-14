// The machine board (《证明完毕》 chapter 8 on): a circuit whose wires carry equations, proof states, formulas or
// clause sets instead of proved judgments. Its sources (`in` cards, one per input the level names) give the test's
// inputs, its sink `out` is checked against what the level wants. A part is a rule of unification, a tactic, a frame
// that runs what it holds again and again (repeat, depth-first search, every goal) or tries several things (the
// alternatives frame), a rewrite, or a step on clauses (resolution.js); the level's parts come from the course as
// on every board. A part the player builds (the unifier, erule, frule, the introduction and elimination steps, auto,
// simp, the clause machines) runs the board that built it: the player's, as it last passed (builtMachine).
//
//   value   { kind: 'eqs', eqs: [equation], fail } (schematic.js) | { kind: 'state', … } (tactics.js)
//           | { kind: 'clauses', set, from?, endless? } (resolution.js) | { kind: 'rules', keys, entries }
//           | { kind: 'sentence' | 'rule' | 'list', … } (elimgen.js: the elimination-rule generator, chapter 12)
//   level   { kind: 'machine', want, inputs?: [{ name, label }] (default one, `in`),
//             rules?: { key: { name, premises: [text], conclusion: text } }, backtrack?,
//             tests: [{ eqs: [equation text] } | { goal, hyps?, answers?, becomes?, clauses?, budget? }
//             | { clauses: [clause text], budget? }, want?] }
//
// What a level wants of its output (`want`, or a test's own): 'elim' (the declaration's elimination rule, elimgen.js),
// 'unify' (the solved equations, when the input has a
// unifier, or a failure when it has none), 'proved' (no goal left), 'becomes' (the results the test lists, each its
// goals written '⋀a. h1; h2 ⊢ goal', its ?-letters named as the machine likes: none, for a step that must fail),
// 'answers' (every way of proving the goal, as a
// question's answers: the test's `answers`, the things its ?-letters become), 'fails' (the goal cannot be proved, and
// the machine says so, having stopped); on clauses (chapter 11), 'clauses' (the clause set the test lists, from a goal),
// 'refuted' (a clause set holding ⊥, within the test's `budget` of clauses when it has one) and 'decide' (⊥ when the
// clauses cannot all hold, saturated without it when they can).
//
// Rewriting (chapter 10, rewrite.js): the rewrite card uses one rule of the level's rewrite book (rewriteBookOf: laws
// proved both ways, the level's `defs`, the goal's hypotheses) once; simp, which the player builds, uses a list of
// them until none fits. Both rewrite the goal, or (chapter 11, the card's `at`) its hypotheses.
//
// Rules are parts (rulePartsOf): every rule of the level's books is given by a rule part, the part the rule belongs to
// (a kernel rule's proof-board part, a lemma, the level's own axiom, an equation given). Numbers and lists (chapter 12)
// are one part, the rule book of numbers (MATH): the rules the level's datatypes give, its definitions' equations and
// the equations proved so far (the course's facts, a level's `proven`). A rule part gives a list of rules: those wired into it (`before`), then its own (those
// added on it, `use`, in the order they were added, when it has several; its first until any is). A card that uses rules (rule, erule, frule, rw, simp) reads the list
// on its port `rules`: the first that applies, in order (with backtracking, each one's results in turn); simp the
// whole list, in order. A rule list is a constant: it may be wired into a frame from outside. Until a level says
// `backtrack`, a tactic gives only its first result; from then on, every result, and each card after it works on each
// of them in turn (tactics.js).
import { PartError } from '../../engine/circuit.js'
import { packed, runBoard } from '../../engine/boards.js'
import { all, fn, subst, tvar } from './formula.js'
import { KERNEL, answerOf, asValue, assumption, defer, depthFirst, resultsOf, rule, startState } from './tactics.js'
import { FULL, UNIFY_RULES, instantiate, lemmaRules, parseEquation, parseS, ruleOf, ruleText, sameSide, sideText, solveEqs, solved } from './schematic.js'
import { rewrite, rewriteBookOf, rewriteText, simplify } from './rewrite.js'
import { datatypesRules } from './datatype.js'
import { clausesOfState, oracleRound, parseClause, refuted, replay, resolveRound, saturate } from './resolution.js'
import { GEN_PARTS, anyValue, elimInputs, judgeElim, listValue } from './elimgen.js'
import { L, T } from '../../shell/i18n.js'
import { circuitBoard } from '../../engine/board-cards.js'
import { say } from './notation.js'

const fail = (zh, en) => new PartError({ zh, en })
export const clausesValue = (set, extra = {}) => ({ kind: 'clauses', set, ...extra })
export const eqsValue = (eqs, fail = null) => ({ kind: 'eqs', eqs, fail })

const books = new WeakMap()
/**
 * A level's rule book: every rule a card may name, by key: the kernel's, those its datatypes give (datatype.js), each
 * lemma's shapes, the equations proved it holds (`facts`, those in `proven`) and the level's own. A
 * level of a course (`holds`: the parts it can hold, `forms`: the shapes each lemma has there, course.js) has a kernel
 * rule once it holds its part, and a lemma once the lemma is built, in the shapes it has gained.
 */
export function ruleBookOf(level) {
  if (!books.has(level)) {
    const has = (p) => !level.holds || level.holds.includes(p)
    const own = Object.entries(level.rules ?? {}).map(([key, r]) => ({ ...ruleOf(key, r.name, r.premises ?? [], r.conclusion), own: true }))
    const shaped = (type, l) => (r) => !l.forms || !level.forms?.[type] || level.forms[type].includes(r.key.split('.')[1] ?? l.forms[0].key)
    const lemmas = Object.entries(level.lemmas ?? {}).filter(([type]) => has(type)).flatMap(([type, l]) => lemmaRules(type, l).filter(shaped(type, l)))
    const facts = factsOf(level).map(([type, f]) => ({ ...ruleOf(type, f.name, f.rule?.premises ?? [], f.rule?.conclusion ?? f.statement), fact: true }))
    books.set(level, Object.fromEntries([...Object.values(KERNEL).filter((r) => has(r.part)), ...datatypesRules(level.datatypes), ...lemmas, ...facts, ...own].map((r) => [r.key, r])))
  }
  return books.get(level)
}

/** A list of rules, by key in the level's books (rule parts give these), with each one's entry ({ book, rule }) to write it out. */
export const rulesValue = (entries) => ({ kind: 'rules', keys: entries.map((e) => e.key), entries })
const rulesIn = (v) => {
  if (v?.kind !== 'rules') throw fail('「规则」口要接规则元件', 'The rules port takes rule parts')
  return v
}
/** The equations proved that a level holds: [type, fact], those in its `proven` (every one, outside a course). */
export const factsOf = (level) => Object.entries(level.facts ?? {}).filter(([type]) => !level.proven || level.proven.includes(type))
/** The rule book of numbers: one part for every rule of the numbers and lists a level has. */
export const MATH = 'math'
// A rule part's type for a key: what part the rule belongs to.
const partOfRule = (r) => (r.datatype || r.fact ? MATH : r.part ?? r.lemma ?? r.key)
const partOfRewrite = (r) => (r.group === 'law' ? r.key.split('.')[0] : r.group === 'def' || r.group === 'fact' ? MATH : r.key)
// The rule book of numbers lists the declarations' rules, then the definitions, then the equations proved.
const mathRank = (e) => (e.rule.datatype ? 0 : e.rule.group === 'def' ? 1 : 2)
/**
 * The rule parts a level states for itself, its axioms: its own rules (`rules`), and the rule book of numbers when it
 * declares a datatype or defines something. They are parts of the level that states them (course.js, local).
 */
export const axiomPartsOf = (level) => [
  ...Object.keys(level.rules ?? {}),
  ...(level.datatypes || level.defs?.length ? [MATH] : []),
]
const partBooks = new WeakMap()
/**
 * The rule parts a level has: type → [{ key, book: 'rule' | 'rewrite', rule }], every rule of its rule book and its
 * rewrite book under the part it belongs to (a law proved both ways is a rule and a rewrite rule of the same part).
 */
export function rulePartsOf(level) {
  if (!partBooks.has(level)) {
    const out = new Map()
    const put = (type, entry) => {
      if (!out.has(type)) out.set(type, [])
      if (!out.get(type).some((e) => e.key === entry.key && e.book === entry.book)) out.get(type).push(entry)
    }
    for (const r of Object.values(ruleBookOf(level))) put(partOfRule(r), { key: r.key, book: 'rule', rule: r })
    for (const r of Object.values(rewriteBookOf(level))) put(partOfRewrite(r), { key: r.key, book: 'rewrite', rule: r })
    if (out.has(MATH)) out.set(MATH, out.get(MATH).map((e, i) => [e, i]).sort(([a, i], [b, j]) => mathRank(a) - mathRank(b) || i - j).map(([e]) => e))
    partBooks.set(level, out)
  }
  return partBooks.get(level)
}
/** The rule part a key of the level's books belongs to, and the choice on it that gives that key. */
export function rulePartOf(level, key) {
  for (const [type, entries] of rulePartsOf(level)) if (entries.some((e) => e.key === key)) return { type, use: choicesOfPart(entries).length > 1 ? [key] : null }
  return null
}
/** The keys a rule part offers to choose from (a law is one choice, rule and rewrite rule alike). */
export const choicesOfPart = (entries) => [...new Set(entries.map((e) => e.key))]
/** The keys a rule part gives of its own: those added on it (`use`), in that order; its first until any is. */
export const ownRules = (entries, use) => {
  const keys = choicesOfPart(entries)
  return use?.length ? use.filter((k) => keys.includes(k)) : keys.slice(0, 1)
}
/** A rule part: the list wired into it (`before`), then its own rules. */
const RULE_PART = {
  inputs: ['before'],
  eval: ({ before }, node, ctx) => {
    const entries = ctx.ruleParts?.get(node.type)
    if (!entries) throw fail('这一关没有这条规则', 'This level has no such rule')
    const own = ownRules(entries, node.params?.use).map((k) => entries.find((e) => e.key === k))
    if (!own.length) throw fail('这块规则元件没有加上规则', 'This rule part has no rule added')
    return rulesValue([...(before ? rulesIn(before).entries : []), ...own])
  },
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
// The rules wired into a card, from the book it uses: every one of them must be there.
function wired(v, book, misfit) {
  return rulesIn(v).keys.map((k) => {
    if (!book?.[k]) throw fail(...misfit)
    return book[k]
  })
}
const NOT_RULE = ['接进来的有一条不是推理规则（是改写用的等式）', 'One of the rules wired in is not an inference rule (it is an equation for rewriting)']
const NOT_REWRITE = ['接进来的有一条不能用来改写（只有等价、等式和定义能改写）', 'One of the rules wired in cannot rewrite (only equivalences, equations and definitions can)']
// A card that uses rules: each wired in, in order; the first that applies (with backtracking, each one's results).
function firstThatApplies(rules, ctx, apply) {
  const out = []
  let why = null
  for (const r of rules) {
    const got = apply(r)
    if (got.fail) why ??= got.fail
    else {
      out.push(...got.results)
      if (!ctx.backtrack) break
    }
  }
  return out.length ? { results: out } : { fail: why ?? T('没有一条规则用得上') }
}
// A tactic card reading its rules from the port `rules` as well as the state from `in`.
const usesRules = (t) => {
  const card = tactic((s, ctx, node) => t(s, ctx, node, ctx.wiredRules))
  return { inputs: ['in', 'rules'], eval: ({ in: v, rules }, node, ctx) => card.eval({ in: v }, node, { ...ctx, wiredRules: rules }) }
}
const ruleCard = (t) => usesRules((s, ctx, _node, rules) => firstThatApplies(wired(rules, ctx.rules ?? KERNEL, NOT_RULE), ctx, (r) => t(s, r)))
// Where a rewrite card rewrites: the goal, or the hypotheses.
const atOf = (node) => (node.params?.at === 'hyps' ? 'hyps' : 'goal')
// A step inside a part, for a traced run (../../engine/circuit.js): a round of it, or the card it applies (`sub`).
const inner = (ctx, node, value, extra) => ctx?.trace?.push({ id: node.id, key: null, inner: true, value, ...extra })
const clausesIn = (v) => {
  if (v.kind !== 'clauses') throw fail('这里要一组子句：先用析出子句把证明状态化为子句', 'This needs a clause set: split the proof state into clauses first')
  return v
}
const eqsIn = (v) => {
  if (v.kind !== 'eqs') throw fail('这里要一组等式', 'This needs a set of equations')
  return v
}
// A unification rule card: the rule once, where it first applies; a set already failed passes through.
const unifyCard = (r) => ({ inputs: ['in'], eval: ({ in: v }) => { const e = eqsIn(v); if (e.fail) return e; const next = UNIFY_RULES[r](e.eqs, {}); return next ? eqsValue(next.eqs, next.fail ?? null) : e } })

/**
 * The repeat frame: what its region makes from the value it opens with is fed back in, again and again, until it
 * stops changing (or a clause set holds ⊥, an equation set fails, no goal is left, or a tactic fails: then the round
 * before stands). On proof states it follows the first result only. Its region shows the first round; the frame gives
 * the last.
 */
const repeat = {
  inputs: ['in', 'body'],
  eval: ({ in: v, body }, node, ctx, key) => {
    if (key) return v
    const round = ctx.region('body')
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
  inputs: ['in'],
  eval: ({ in: v }, node, ctx, key) => {
    if (key) return v
    const s = stateIn(v)
    if (s.error) return s
    const round = ctx.region('body')
    const depth = Number(node.params?.depth) || Infinity
    let k = 0
    // A traced run sees each step of the search: what the frame hands its region, then the region's cards.
    const expand = (x) => {
      ctx.trace?.push({ id: node.id, key: 'body', value: x, round: ++k })
      const out = round(x)
      return out.error ? [] : resultsOf(out)
    }
    const { found, stopped } = depthFirst(resultsOf(s), expand, { depth, limit: LIMIT, most: 60 })
    // A search that has not stopped gives what it found so far (the first is enough to prove a goal), and says it goes
    // on: asking for every answer then never ends.
    const none = stopped ? T(`搜了 ${LIMIT} 步还没停下来：有一条路走不到头`, `Searched ${LIMIT} steps without stopping: one path never ends`)
      : depth < Infinity ? T(`${depth} 层以内都搜遍了，也没有证完`, `Searched everything within ${depth} levels without finishing`) : T('都搜遍了，也没有证完')
    const out = asValue(found, { ...firstOf(s), error: none })
    return stopped ? { ...out, endless: true } : out
  },
}

/** Every goal: the region run on each goal of the state in turn, each on its own (Isabelle's ALLGOALS, Lean's <;>). */
const each = {
  inputs: ['in'],
  eval: ({ in: v }, node, ctx, key) => {
    if (key) return v
    const s = stateIn(v)
    if (s.error) return s
    const round = ctx.region('body')
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

/**
 * For each (the generator's frame, chapter 12): the region run on every item of the list it is handed, in order, each
 * result an item of the list it gives. Its region shows the first item's run.
 */
const eachOf = {
  inputs: ['in'],
  eval: ({ in: v }, node, ctx, key) => {
    if (v?.kind !== 'list') throw fail('这里要一串：框对其中的每一样各做一遍', 'This needs a list: the frame works on each of its items')
    if (key) {
      if (!v.items.length) throw fail('这一串是空的：框里一次也不做', 'The list is empty: nothing inside runs')
      return v.items[0]
    }
    const round = ctx.region('body')
    return listValue(v.items.map((item, k) => {
      ctx.trace?.push({ id: node.id, key: 'body', value: item, round: k + 1 })
      return round(item)
    }))
  },
}

/**
 * Keep ⋀ (the generator's frame, chapter 6): a value's bound variables set aside, its region run on the rule after
 * them, and the same bound variables put back in front of what comes out; a value with none runs through as it is.
 */
const keepBound = {
  inputs: ['in'],
  eval: ({ in: v }, node, ctx, key) => {
    if (!v) throw fail('这里要接进一样东西', 'Something has to be wired in here')
    const inner = v.kind === 'any' ? v.body : v
    if (key) return inner
    ctx.trace?.push({ id: node.id, key: 'body', value: inner, round: 1 })
    const out = ctx.region('body')(inner)
    return v.kind === 'any' ? anyValue(v.vars, out) : out
  },
}

// Alternatives (Isabelle's APPEND, ORELSE when only the first result is followed): every region opens with the value;
// every result of the first region, then every result of the next, those that failed left out. How many regions is
// the card's setting.
const WAYS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']
export const waysOf = (node) => WAYS.slice(0, Math.min(WAYS.length, Math.max(2, Number(node?.params?.ways) || 2)))
/**
 * Alternatives: each region in turn gets the state the frame does, and only when the ones before it failed: the first
 * that does not fail gives the result (ORELSE), and the regions after it are not tried. Once the level backtracks,
 * every region is tried, and every result of each, in order, is the frame's (APPEND). Every region failing, the first
 * one's failure is the frame's.
 */
const append = {
  inputs: ['in'],
  eval: ({ in: v }, node, ctx, key) => {
    if (key || v?.error) return v
    const got = []
    for (const way of waysOf(node)) {
      // A traced run sees each region tried: what it opens with, then its cards.
      ctx.trace?.push({ id: node.id, key: way, value: v })
      const out = ctx.region(way)(v)
      got.push(out)
      if (!out.error && !ctx.backtrack) break
    }
    const ok = got.filter((x) => !x.error)
    return ok.length ? asValue(ok.flatMap(resultsOf)) : got[0]
  },
}

// The machine board's parts, each as what it runs on: its inputs (a frame's own; repeat's region gives it its first
// round) and how it computes.
const BODIES = {
  // The elimination-rule generator (chapter 12, elimgen.js): rules taken apart and put together, and for each.
  ...GEN_PARTS,
  eachOf,
  keepBound,
  // Unification (chapter 8): its rules, and patterns.
  uDelete: unifyCard('delete'),
  uDecompose: unifyCard('decompose'),
  uConflict: unifyCard('conflict'),
  uSwap: unifyCard('swap'),
  uCheck: unifyCard('check'),
  uEliminate: unifyCard('eliminate'),
  uPattern: unifyCard('pattern'),
  repeat,
  // Tactics (chapters 8 and 9).
  rule: ruleCard(rule),
  assumption: tactic(assumption),
  defer: tactic(defer),
  append,
  search,
  each,
  // Rewriting (chapter 10): one rule once, on the goal or the hypotheses.
  rw: usesRules((s, ctx, node, rules) => firstThatApplies(wired(rules, ctx.rewrites, NOT_REWRITE), ctx, (r) => rewrite(s, r, atOf(node)))),
  // Clauses (chapter 11, resolution.js): ∃ out of the hypotheses, a state split into clauses, a round of resolution,
  // someone else's prover, and the certificate replayed in the kernel.
  skolem: tactic(skolemStep),
  toClauses: { inputs: ['in'], eval: ({ in: v }) => toClauses(v) },
  resolve: { inputs: ['in'], eval: ({ in: v }, node) => { const c = clausesIn(v); return { ...c, set: resolveRound(c.set, { unit: node.params?.unit === 'unit' }) } } },
  oracle: { inputs: ['in'], eval: ({ in: v }, node, ctx) => saturated(clausesIn(v), node, ctx, oracleRound) },
  replay: { inputs: ['in'], eval: ({ in: v }) => replayed(clausesIn(v)) },
  // A rule part: the rules wired in before it, then its own (machine.js rulePieces).
  rules: RULE_PART,
}
const ABOUT = {
  anyR: T('任意结论', 'Any conclusion'), swapConcl: T('替换结论', 'Swap conclusion'), consFront: T('添加首项', 'Put first'), mkRule: T('构造规则', 'Make a rule'),
  eachOf: T('逐项处理', 'For each'), keepBound: T('保留⋀', 'Keep ⋀'), repeat: T('重复框', 'Repeat frame'),
  uDelete: T('删除', 'Delete'), uDecompose: T('分解', 'Decompose'), uConflict: T('冲突', 'Conflict'), uSwap: T('定向', 'Orient'),
  uCheck: T('出现检查', 'Occurs check'), uEliminate: T('消元', 'Eliminate'), uPattern: T('模式合一', 'Pattern unification'),
  rule: T('逆用规则', 'Rule'), assumption: T('由假设得证', 'Assumption'), defer: T('目标后移', 'Defer'), append: T('依次尝试', 'Alternatives'),
  search: T('回溯搜索', 'Search'), each: T('逐个目标', 'Every goal'), rw: T('改写', 'Rewrite'), skolem: T('Skolem 化', 'Skolemise'),
  toClauses: T('析出子句', 'Into clauses'), resolve: T('一轮归结', 'A round of resolution'), oracle: T('外部证明器', 'Someone else’s prover'),
  replay: T('重放', 'Replay'), rules: T('规则元件：给出它的规则', 'A rule part: the rules it gives'),
}
/**
 * The machine board's parts as engine resources (a game's parts.json makes each a part, games/DESIGN.md 6.8): a
 * resource's arguments are its part's inputs, in order; the card it runs on, the region whose value it gives and the
 * regions to run come with ctx (../../engine/parts/define.js).
 */
export const MACHINE_PARTS = Object.fromEntries(Object.entries(BODIES).map(([type, b]) => [type, {
  about: ABOUT[type],
  args: b.inputs.map((name) => ({ name })),
  run: (values, _named, ctx) => b.eval(Object.fromEntries(b.inputs.map((name, k) => [name, values[k]])), ctx.node, ctx, ctx.key ?? undefined),
}]))

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
  if (!g) return { fail: T('已经没有目标了') }
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
export function inputsOf(test, level) {
  if (test.ways) return elimInputs(test, level)
  // A level that builds a part taking rules gives them as an input of its own: the test's rules (`rules`, keys).
  const rules = test.rules ? { rules: rulesValue(test.rules.map((key) => rulePartsOf(level).get(rulePartOf(level, key).type).find((e) => e.key === key))) } : {}
  if (test.goal) return { in: startState(parseS(test.goal), (test.hyps ?? []).map(parseS)), ...rules }
  if (test.eqs) return { in: eqsValue(test.eqs.map(parseEquation)) }
  return { in: clausesValue(clauseSetOf(test.clauses)) }
}
const clauseSetOf = (texts) => [...new Map(texts.map((c) => parseClause(c, parseS)).map((c) => [c.key, c])).values()]
/** The names and labels of a level's inputs. */
export const inputsOfLevel = (level) => level.inputs ?? [{ name: 'in', label: { zh: '输入', en: 'Input' } }]

/** A machine board: an `in` card for each of a level's inputs on the left, the result `out` on the right. */
export const MACHINE_BOARD = circuitBoard({
  cards: [
    { type: 'in', side: 'left', of: (task) => inputsOfLevel(task) },
    { type: 'out', side: 'right', of: () => [{ name: 'out', label: T('结果', 'Result') }] },
  ],
  right: 900,
  gap: 130,
})
/** The board a machine level starts from: its inputs and its result. */
export const startMachine = (level) => MACHINE_BOARD.startBoard(level)

/** The ports of the parts the player builds, as a blueprint names them (each runs the board of the level building it). */
export const BUILT_PORTS = {
  elimGen: ['it', 'ways'], unifier: ['in'], erule: ['in', 'rules'], frule: ['in', 'rules'], introRules: ['in'], elimRules: ['in'],
  auto: ['in'], simp: ['in', 'rules'], saturate: ['in'], clausify: ['in'], metis: ['in'],
}

/* ---------- rule parts ---------- */

// A sentence in the level's words, in each language, for names made of it.
const inWords = (level, write) => T(write((f) => say(f, level.notation).zh), write((f) => say(f, level.notation).en))
// A definition as the level writes it, in the level's words: 'c ⟹ l = r'.
function defText(d, text) {
  const [cond, eq] = d.includes('⟹') ? d.split('⟹') : [null, d]
  return `${cond ? `${cond.split(';').map((c) => text(parseS(c.trim()))).join('; ')} ⟹ ` : ''}${text(parseS(eq.trim()))}`
}
const MATH_NAME = T('数理规则书')
/** A rule part's name: the rule book of numbers, the proof-board part or lemma it is, or its rule's own name. */
function rulePartName(level, type) {
  if (type === MATH) return MATH_NAME
  const r = rulePartsOf(level).get(type)[0].rule
  if (r.part || level.lemmas?.[type]) return level.lemmas?.[type]?.name ?? level.partDefs?.[type]?.name ?? T(type, type)
  return r.group === 'def' ? inWords(level, (text) => defText(r.text, text)) : r.name
}
/** A rule of a rule part's, written out: an inference rule, or a rewrite rule (an equation given goes by its name). */
export const ruleWritten = (e, text) => (e.book === 'rule' ? ruleText(e.rule, text) : rewriteText(e.rule, text) || L(e.rule.name))
const AFTER = T('接入其他规则元件时，本元件的规则排在它们之后。')
const joined = (a, b) => T(`${a.zh}${b.zh}`, `${a.en} ${b.en}`)
/** A rule part as every one is (machine.js RULE_PART): the rules wired in before it, then those added on it. */
export const RULE_PIECE = {
  name: T('规则元件', 'Rule part'),
  desc: joined(T('给出这个元件的规则。在元件上添加要给出的规则，按添加顺序排列。'), AFTER),
  icon: 'GitFork',
  family: 'rule',
  inputs: [{ name: 'before', label: T('前面'), optional: true }],
  settings: [{ key: 'use', control: 'list', label: T('给出的规则', 'Its rules'), from: 'ruleChoices()' }],
  bare: true,
  compute: 'rules(before)',
}
/**
 * The rule parts a level holds, as the course registers them beside parts.json's: one for each part its rule books'
 * rules belong to (rulePartsOf), named after it, giving the rules added on it.
 */
export function rulePieces(level) {
  return Object.fromEntries([...rulePartsOf(level).keys()].map((type) => {
    const several = choicesOfPart(rulePartsOf(level).get(type)).length > 1
    const desc = type === MATH ? joined(T('给出这一关的数与列表规则：类型声明生成的规则、定义中的等式和已证出的等式。在元件上添加要给出的规则，按添加顺序排列。'), AFTER)
      : several ? RULE_PIECE.desc : joined(T('给出这个元件的规则。'), AFTER)
    return [type, { ...RULE_PIECE, name: rulePartName(level, type), desc }]
  }))
}
/** The rules a rule part offers to add, each written out in the test's words (ctx: the task, its text, the card). */
export const RULE_CHOICES = {
  about: T('规则元件能给出的规则', 'The rules a rule part can give'),
  args: [],
  run: (_v, _n, ctx) => {
    const entries = rulePartsOf(ctx.task).get(ctx.node?.type) ?? []
    return choicesOfPart(entries).map((key) => ({ value: key, label: ruleWritten(entries.find((e) => e.key === key), ctx.text) }))
  },
}

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
  const input = inputsOf(test, level).in
  if (!out) return T('还没有东西接到「结果」')
  if (want === 'elim') return judgeElim(test, out)
  if (want === 'proved') {
    if (out.kind !== 'state') return T('结果要一个证明状态')
    if (out.error) return out.error
    return out.goals.length ? T(`还剩 ${out.goals.length} 个目标没证完`, `${out.goals.length} goal${out.goals.length === 1 ? '' : 's'} still open`) : ''
  }
  if (want === 'becomes') {
    if (out.kind !== 'state') return T('结果要一个证明状态')
    if (!test.becomes.length) return out.error ? '' : T('这一步应该做不了，证明助手却做了')
    if (out.error) return out.error
    const got = resultsOf(out).map((r) => canonical(r.goals))
    const wanted = test.becomes.map((r) => canonical(r.map(parseGoal)))
    if (got.length !== wanted.length) return T(`要 ${wanted.length} 种结果，得到 ${got.length} 种`, `${wanted.length} result${wanted.length === 1 ? '' : 's'} wanted, ${got.length} made`)
    const k = got.findIndex((g, i) => g !== wanted[i])
    return k < 0 ? '' : T(wanted.length > 1 ? `第 ${k + 1} 种结果的目标和要的不一样` : '得到的目标和要的不一样', wanted.length > 1 ? `Result ${k + 1} has other goals than wanted` : 'The goals made are not the ones wanted')
  }
  if (want === 'fails') {
    if (out.kind !== 'state') return T('结果要一个证明状态')
    if (out.endless) return out.error ?? T('搜索停不下来')
    if (!out.error) return out.goals.length ? T('这一句证不出来，证明助手却还没有说「证不出来」') : T('这一句不该证得出来')
    return ''
  }
  if (want === 'answers') {
    if (out.kind !== 'state') return T('结果要一个证明状态')
    if (out.endless) return T('要找出所有答案，可搜索停不下来：有一条路走不到头')
    if (out.error) return out.error
    const got = answersIn(out)
    const wanted = [...new Set(test.answers)].sort()
    if (got.join(';') === wanted.join(';')) return ''
    const list = (xs) => (xs.length ? xs.join('、') : '没有')
    const listEn = (xs) => (xs.length ? xs.join(', ') : 'none')
    return T(`找到的答案是 ${list(got)}，应该是 ${list(wanted)}`, `The answers found are ${listEn(got)}; they should be ${listEn(wanted)}`)
  }
  if (want === 'unify') {
    if (out.kind !== 'eqs') return T('结果要一组等式')
    const ref = solveEqs(input.eqs, { rules: FULL })
    if (ref.fail) return out.fail ? '' : T('这组等式其实合一不了，结果却没有说「失败」')
    if (out.fail) return T('这组等式能合一，结果却说失败了')
    if (!solved(out.eqs)) return T('还没解完：要每个等式左边都是一个 ?，右边里没有这些 ?')
    const σ = Object.fromEntries(out.eqs.map((e) => [e.s.name, e.t]))
    return input.eqs.every((e) => sameSide(instantiate(e.s, σ), instantiate(e.t, σ))) ? '' : T('结果代回去，原来的等式两边还不一样')
  }
  if (out.kind !== 'clauses') return T('结果要一组子句')
  if (want === 'clauses') {
    const wanted = clauseSetOf(test.clauses).map((c) => c.key).sort()
    const got = out.set.map((c) => c.key).sort()
    return wanted.join(';') === got.join(';') ? '' : T('拆出的子句和要的不一样')
  }
  const has = refuted(out.set)
  if (want === 'refuted') {
    if (!has) return T('结果里还没有空子句 ⊥')
    return test.budget && out.set.length > test.budget ? T(`推出 ⊥ 用了 ${out.set.length} 条子句，最多只能有 ${test.budget} 条`, `Reaching ⊥ took ${out.set.length} clauses; at most ${test.budget} are allowed`) : ''
  }
  // decide: ⊥ when the clauses cannot all hold; when they can, saturated without it.
  const start = input.kind === 'clauses' ? input.set : clausify(input, ctxOf(level, { nodes: [], wires: [] })).set
  const unsat = refuted(saturate(start).set)
  if (unsat) return has ? '' : T('结果里还没有空子句 ⊥')
  if (has) return T('结果里有 ⊥，可这组子句是可满足的：证明助手「证」出了假话')
  if (out.endless) return T('一直推出新子句，停不下来')
  return resolveRound(out.set).length === out.set.length ? '' : T('结果还能再归结出新子句：还没饱和')
}

const merged = (a = new Map(), b = new Map()) => new Map([...a, ...b])
// The settings a part the player builds takes beyond its board's (simp works on the goal or the hypotheses).
const BUILT_SETTINGS = { simp: ['at'] }
/** A packed machine part reads the work and rules of its selected builder. */
export function builtMachine(type, builder, reference, ownBoard) {
  const circuit = () => ownBoard(builder().taskId) ?? builder().solution
  const part = packed({
    circuit,
    inputs: inputsOfLevel(reference).map((i) => i.name),
    outputs: ['out'],
    inside: (ctx) => {
      const b = builder()
      return { ...ctx, rules: { ...ruleBookOf(b), ...ctx.rules }, rewrites: { ...rewriteBookOf(b), ...ctx.rewrites }, ruleParts: merged(rulePartsOf(b), ctx.ruleParts), backtrack: ctx.backtrack || Boolean(b.backtrack) }
    },
  })
  return { ...part, built: true, params: BUILT_SETTINGS[type] ?? [], eval: failsAsState(part.eval), opens: () => ({ circuit: circuit(), level: builder() }) }
}
// A tactic that cannot go on gives the state it was handed with what went wrong, as every tactic does (a frame reads
// it), and a state that failed already passes through.
const failsAsState = (run) => (ins, node, ctx) => {
  if (ins.in?.kind === 'state' && ins.in.error) return ins.in
  try {
    return run(ins, node, ctx)
  } catch (e) {
    if (e instanceof PartError && ins.in?.kind === 'state') return { ...firstOf(ins.in), error: e.label }
    throw e
  }
}

// What a machine runs with: the level's books and rule parts, whether it backtracks, and the board input that is a
// constant (a level's rules, for a frame's region: ../../circuit/frames.js runRegion).
const ctxOf = (level, circuit, extra = {}) => ({ graph: circuit, rules: ruleBookOf(level), rewrites: rewriteBookOf(level), ruleParts: rulePartsOf(level), backtrack: Boolean(level.backtrack), constants: ['rules'], ...extra })

/** A machine part run on a proof state with a level's rule and rewrite books (chapter 15: a script's by), the rules
 *  `keys` wired in when it uses rules. */
export const runTactic = (level, type, state, keys = null) => level.parts(type).eval({ in: state, ...(keys ? { rules: rulesValue(keys.map((key) => ({ key }))) } : {}) }, { id: type, params: {} }, ctxOf(level, { nodes: [], wires: [] }, { engine: { parts: level.parts } }))

/** How a machine level runs and is judged, for the shared engine (../../engine/test-run.js). */
export const MACHINE_TESTS = {
  runTest: (level, circuit, test) => {
    const run = runBoard(circuit, { parts: level.parts, bind: inputsOf(test, level), ctx: ctxOf(level, circuit) })
    return { ...run, outputs: { out: run.outputs.out } }
  },
  // The run of one test with every step it took, in order (../../engine/circuit.js trace): only what reaches the
  // result takes a step, so a card lying about unwired takes none. The board once the run is over is the whole board
  // run, as before it: the inputs, and a card that reaches nothing with what it gives or lacks.
  trace: (level, circuit, test) => {
    const trace = []
    runBoard(circuit, { parts: level.parts, bind: inputsOf(test, level), targets: ['out'], ctx: ctxOf(level, circuit, { trace }) })
    return { trace, run: MACHINE_TESTS.runTest(level, circuit, test) }
  },
  check: (level, test, outputs) => {
    const problem = judge(test.want ?? level.want, test, outputs.out, level)
    return [{ name: 'out', pass: !problem, reason: problem }]
  },
  // Rule parts are what the cards read, not steps of the machine.
  score: (level, circuit) => ({ steps: circuit.nodes.filter((n) => n.type !== 'in' && n.type !== 'out' && !rulePartsOf(level).has(n.type)).length }),
}
