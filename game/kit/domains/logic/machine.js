// The machine board (《证明完毕》 chapter 4 on): a circuit whose wires carry formulas or clause sets instead of proved
// judgments. Its sources (`in` cards, one per input the level names) give the test's inputs, its sink `out` is
// checked against what the level wants. A part is a law card, a normal form, resolution or a repeat frame
// (clauses.js); the level's parts come from the course as on every board.
//
//   value   { kind: 'formula', f } | { kind: 'clauses', set } | { kind: 'eqs', eqs: [[s, t]], fail } (unify.js)
//           | { kind: 'state', goals, error? } (tactics.js)
//   level   { kind: 'machine', want, inputs?: [{ name, label }] (default one, `in`),
//             tests: [{ in: formula text } | { clauses: [clause text] } | { inputs: { name: formula text } }, want?] }
//
// What a level wants of its output (`want`, or a test's own): a formula equivalent to the input with no ¬¬
// ('noDneg'), no → or ↔ ('noArrow'), in NNF ('nnf') or CNF ('cnf'); a clause set holding ⊥ ('refuted'); 'decide':
// ⊥ when the input cannot be satisfied, and otherwise a set closed under resolution without ⊥; and 'entails', for
// inputs `goal` and any others (what is known): ⊥ when the others entail the goal, and otherwise a saturated set.
// First-order (chapter 7): 'unify' (a solved equation set that unifies the input, or a failure when none does),
// 'prenex', 'skolem' and 'clauseForm' (the input's own, as unify.js makes them), and 'refuted' on clauses with
// variables. Test inputs are read with unify.js's convention (u … z variables, other lower-case names constants).
// Tactics (chapter 8): a test { goal, hyps? } starts a proof state, and 'proved' wants no goal left.
// Theories (chapter 9): a test { eq, hyps? } starts a proof state on an equation (theory.js), and simp rewrites with the
// level's `defs`, handed to every card in the run's ctx.
import { PartError, evaluate } from '../../engine/circuit.js'
import { runBoard, sink, source } from '../../engine/boards.js'
import { framePart, within } from '../../circuit/frames.js'
import { and, same } from './formula.js'
import { say } from './notation.js'
import { LAWS, clauseOf, clauseSet, clausesOf, closed, cnf, equivalent, hasArrow, hasDneg, isCnf, isNnf, nnf, refuted, resolveRound, saturate, toEnd } from './clauses.js'
import { assumption, auto, elim, intro, startState } from './tactics.js'
import { THEORY_LEMMAS, addRule, cases, induct, parseTh, simp } from './theory.js'
import { UNIFY_RULES, applyT, clauseFormOf, factorRound, foClausesOf, foNnf, foResolveRound, foSet, hasExists, isPrenex, matrixOf, mgu, parseFo, parseTerm, prenex, sameTerm, skolem, solved } from './unify.js'

const T = (zh, en) => ({ zh, en })
const fail = (zh, en) => new PartError({ zh, en })
export const formulaValue = (f) => ({ kind: 'formula', f })
export const clausesValue = (set) => ({ kind: 'clauses', set })

const stateIn = (v) => {
  if (v.kind !== 'state') throw fail('这里要一个证明状态（还没证完的目标）', 'This needs a proof state (the goals still open)')
  return v
}
// A tactic card: one step on the state; a failure is the state with what went wrong (the next ORELSE or REPEAT reads it).
const tactic = (t) => ({ inputs: ['in'], eval: ({ in: v }, _node, ctx) => { const s = stateIn(v); return s.error ? s : t({ ...s, error: undefined }, ctx) } })
const formulaIn = (v) => {
  if (v.kind !== 'formula') throw fail('这里要一句公式，接进来的是一组子句', 'This needs a formula; it got a clause set')
  return v.f
}
const clausesIn = (v) => {
  if (v.kind !== 'clauses') throw fail('这里要一组子句，接进来的是一句公式：先拆成子句', 'This needs a clause set; it got a formula: split it into clauses first')
  return v.set
}
const twoFormulas = (a, b) => [formulaIn(a), formulaIn(b)]
export const eqsValue = (eqs, fail = null) => ({ kind: 'eqs', eqs, fail })
const eqsIn = (v) => {
  if (v.kind !== 'eqs') throw fail('这里要一组等式', 'This needs a set of equations')
  return v
}
// A unification rule card: the rule once, where it first applies; a set already failed passes through.
const rule = (r) => ({ inputs: ['in'], eval: ({ in: v }) => { const e = eqsIn(v); if (e.fail) return e; const next = UNIFY_RULES[r](e.eqs); return next ? eqsValue(next.eqs, next.fail ?? null) : e } })
// A first-order formula's ∀ prefix kept while a card works on what is under it.
const underAll = (f, g) => (f.op === '∀' ? { ...f, body: underAll(f.body, g) } : g(f))
const law = (rewrite) => ({ inputs: ['in'], eval: ({ in: v }) => formulaValue(toEnd(formulaIn(v), rewrite)) })

/**
 * The repeat frame: what its region makes from the value it opens with is fed back in, again and again, until it
 * stops changing (or a clause set holds ⊥). Only what the region opens can be read inside it. Its region shows the
 * first round; the frame gives the last.
 */
const repeat = {
  ...framePart(['in'], [{ name: 'body', opens: true }]),
  eval: ({ in: v, body }, node, ctx, key) => {
    if (key) return v
    const graph = ctx.graph
    // Everything inside the frame, frames inside it with their own cards too.
    const deep = within(graph, node.id)
    const inside = graph.nodes.filter((n) => deep.has(n.id))
    const ids = new Set(inside.map((n) => n.id))
    const back = graph.wires.find((w) => w.to === node.id && w.port === 'body')
    if (!back) throw fail('框里还没有接到「结果」上', 'Nothing inside is wired to the result yet')
    for (const w of graph.wires.filter((x) => ids.has(x.to))) {
      if (!ids.has(w.from.split('#')[0]) && w.from !== `${node.id}#body`) throw fail('重复框里只能用框开出来的东西', 'Inside the repeat frame, only what the frame opens can be used')
    }
    const OPEN = '__open'
    const sub = {
      nodes: [{ id: OPEN, type: '__open' }, ...inside.map(({ in: _, ...n }) => n)],
      wires: graph.wires.filter((w) => ids.has(w.to)).map((w) => (w.from === `${node.id}#body` ? { ...w, from: OPEN } : w)),
    }
    const parts = ctx.engine.parts
    const step = (value) => {
      const { values, errors } = evaluate(sub, { parts: (type) => (type === '__open' ? { inputs: [], eval: () => value } : parts[type]), ctx })
      const out = values.get(back.from)
      if (out === undefined) throw fail('框里有一张卡片算不出来', 'A card inside cannot compute')
      return out
    }
    const key2 = (x) => JSON.stringify(x)
    let cur = body
    for (let k = 0; k < 60; k++) {
      if ((cur.kind === 'clauses' && refuted(cur.set)) || (cur.kind === 'eqs' && cur.fail)) return cur
      if (cur.kind === 'state' && !cur.goals.length) return cur
      const next = step(cur)
      // A tactic that fails ends the repeat with the state before it (REPEAT).
      if (next.kind === 'state' && next.error) return cur
      if (key2(next) === key2(cur)) return cur
      cur = next
    }
    throw fail('转了 60 圈还没停下来', 'Still changing after 60 rounds')
  },
}

/** The machine board's parts. */
export const MACHINE_PARTS = {
  in: source(),
  out: sink(),
  dneg: law(LAWS.dneg),
  impOr: law(LAWS.impOr),
  dmLaw: law(LAWS.dm),
  dist: law(LAWS.dist),
  neg: { inputs: ['in'], eval: ({ in: v }) => formulaValue({ op: '¬', a: formulaIn(v) }) },
  conj: { inputs: ['a', 'b'], eval: ({ a, b }) => formulaValue(and(...twoFormulas(a, b))) },
  // On a first-order formula the normal forms reach through quantifiers: ¬∀ is ∃¬, and CNF is made under the ∀s.
  nnf: { inputs: ['in'], eval: ({ in: v }) => formulaValue(hasQuantifier(formulaIn(v)) ? foNnf(v.f) : nnf(v.f)) },
  cnf: { inputs: ['in'], eval: ({ in: v }) => formulaValue(underAll(formulaIn(v), cnf)) },
  toClauses: {
    inputs: ['in'],
    eval: ({ in: v }) => {
      const f = formulaIn(v)
      if (hasExists(f) || !isPrenex(f)) throw fail('这句还有 ∃，或者量词不在最前面：先化前束范式、Skolem 化', 'This still has ∃, or quantifiers not at the front: prenex and Skolemise first')
      if (f.op === '∀' || hasVars(f)) {
        const fo = foClausesOf(matrixOf(f))
        if (!fo) throw fail('∀ 后面还不是合取范式，拆不成子句', 'Under the ∀s it is not CNF yet, so it does not split into clauses')
        return clausesValue(fo)
      }
      const set = clausesOf(f)
      if (!set) throw fail('这句还不是合取范式（一串「或」用「与」连起来），拆不成子句', 'This is not in CNF yet (ors joined by ands), so it does not split into clauses')
      return clausesValue(set)
    },
  },
  res: { inputs: ['in'], eval: ({ in: v }) => clausesValue(resolveRound(clausesIn(v))) },
  repeat,
  saturate: { inputs: ['in'], eval: ({ in: v }) => clausesValue(saturate(clausesIn(v))) },
  // Unification (chapter 7): the six rules, and the unifier built from them.
  uDelete: rule('delete'),
  uDecompose: rule('decompose'),
  uConflict: rule('conflict'),
  uSwap: rule('swap'),
  uCheck: rule('check'),
  uEliminate: rule('eliminate'),
  unifier: {
    inputs: ['in'],
    eval: ({ in: v }) => {
      const e = eqsIn(v)
      const σ = e.fail ? null : mgu(e.eqs)
      return σ ? eqsValue(Object.entries(σ).map(([x, t]) => [{ t: 'var', name: x }, t])) : eqsValue(e.eqs, e.fail ?? { zh: '没有合一子', en: 'No unifier' })
    },
  },
  // Clause form (chapter 7).
  prenex: {
    inputs: ['in'],
    eval: ({ in: v }) => {
      if (!isFoNnf(formulaIn(v))) throw fail('先化否定范式：→ 和 ¬ 会挡住量词', 'To NNF first: → and ¬ stand in the quantifiers’ way')
      return formulaValue(prenex(v.f))
    },
  },
  skolem: {
    inputs: ['in'],
    eval: ({ in: v }) => {
      if (!isPrenex(formulaIn(v))) throw fail('先化前束范式：量词都要在最前面', 'To prenex form first: every quantifier at the front')
      return formulaValue(skolem(v.f))
    },
  },
  clauseForm: { inputs: ['in'], eval: ({ in: v }) => clausesValue(clauseFormOf(formulaIn(v))) },
  // First-order resolution (unit resolution with unification) and factoring.
  fores: { inputs: ['in'], eval: ({ in: v }) => clausesValue(foResolveRound(clausesIn(v))) },
  // Tactics (chapter 8).
  assumption: tactic(assumption),
  intro: tactic(intro),
  elim: tactic(elim),
  auto: tactic(auto),
  // ORELSE: both regions open with the state; the first region's result unless it failed, else the second's.
  orElse: {
    ...framePart(['in'], [{ name: 'first', opens: true }, { name: 'second', opens: true }]),
    eval: ({ in: v, first, second }, _node, _ctx, key) => {
      if (key) return v
      if (first && !first.error) return first
      if (second) return second
      throw fail('两个框都还没接到结果上', 'Neither region is wired to its result yet')
    },
  },
  factor: { inputs: ['in'], eval: ({ in: v }) => clausesValue(factorRound(clausesIn(v))) },
  // Theories (chapter 9): simplification, induction, splitting an if, and a card for each lemma proved.
  simp: tactic((s, ctx) => simp(s, ctx?.defs ?? [])),
  induct: tactic(induct),
  cases: tactic(cases),
  ...Object.fromEntries(Object.entries(THEORY_LEMMAS).map(([type, text]) => [type, tactic((s) => addRule(s, text))])),
}
const hasQuantifier = (f) => f.op === '∀' || f.op === '∃' || (f.op === '¬' ? hasQuantifier(f.a) : f.a ? hasQuantifier(f.a) || hasQuantifier(f.b) : false)
const hasVars = (f) => f.op === 'atom' ? f.args.some(function vars(t) { return t.t === 'var' || t.args.some(vars) }) : f.op === '¬' ? hasVars(f.a) : f.a ? hasVars(f.a) || hasVars(f.b) : false
const isFoNnf = (f) => (f.op === '∀' || f.op === '∃' ? isFoNnf(f.body) : f.op === '∧' || f.op === '∨' ? isFoNnf(f.a) && isFoNnf(f.b) : f.op === 'atom' || f.op === '⊥' || (f.op === '¬' && f.a.op === 'atom'))

/** A test's inputs as values, by name. */
export function inputsOf(test) {
  if (test.goal) return { in: startState(parseFo(test.goal), (test.hyps ?? []).map(parseFo)) }
  if (test.eq) return { in: startState(parseTh(test.eq), (test.hyps ?? []).map(parseTh)) }
  if (test.eqs) return { in: eqsValue(test.eqs.map((e) => e.split(' = ').map(parseTerm))) }
  if (test.clauses) {
    const cs = test.clauses.map((c) => c.split(' ∨ ').map((l) => l.trim()))
    return { in: clausesValue(cs.some((c) => c.some((l) => /\(/.test(l))) ? foSet(cs) : clauseSet(test.clauses.map((c) => clauseOf(parseFo(c))))) }
  }
  if (test.inputs) return Object.fromEntries(Object.entries(test.inputs).map(([name, text]) => [name, formulaValue(parseFo(text))]))
  return { in: formulaValue(parseFo(test.in)) }
}
/** The names and labels of a level's inputs. */
export const inputsOfLevel = (level) => level.inputs ?? [{ name: 'in', label: { zh: '输入', en: 'Input' } }]

const WANTS = {
  noDneg: [T('没有 ¬¬', 'no ¬¬'), (f) => !hasDneg(f)],
  noArrow: [T('没有 → 和 ↔', 'no → or ↔'), (f) => !hasArrow(f)],
  nnf: [T('¬ 只在字母上（否定范式）', '¬ only on letters (NNF)'), (f) => isNnf(f)],
  cnf: [T('合取范式', 'CNF'), (f) => isCnf(f)],
}

/** Is the output what the test wants? '' or why not. */
export function judge(want, test, out, notation) {
  const inputs = inputsOf(test)
  const input = inputs.in
  if (!out) return T('还没有东西接到「结果」', 'Nothing reaches the result yet')
  if (WANTS[want]) {
    if (out.kind !== 'formula') return T('结果要一句公式', 'The result must be a formula')
    const [label, ok] = WANTS[want]
    if (!equivalent(out.f, input.f)) return T('结果和原来的公式不等价了', 'The result is no longer equivalent to the formula')
    if (!ok(out.f)) { const s = say(out.f, notation); return T(`得到「${s.zh}」，还不是要的形状：${label.zh}`, `It gives “${s.en}”, not yet the shape wanted: ${label.en}`) }
    return ''
  }
  if (want === 'proved') {
    if (out.kind !== 'state') return T('结果要一个证明状态', 'The result must be a proof state')
    if (out.error) return out.error
    return out.goals.length ? T(`还剩 ${out.goals.length} 个目标没证完`, `${out.goals.length} goal${out.goals.length === 1 ? '' : 's'} still open`) : ''
  }
  if (want === 'unify') {
    if (out.kind !== 'eqs') return T('结果要一组等式', 'The result must be a set of equations')
    const σ = mgu(input.eqs)
    if (!σ) return out.fail ? '' : T('这组等式其实合一不了，结果却没有说「失败」', 'These equations have no unifier, yet the result does not say it failed')
    if (out.fail) return T('这组等式能合一，结果却说失败了', 'These equations can be unified, yet the result says it failed')
    if (!solved(out.eqs)) return T('还没解完：要每个等式左边都是一个变量，右边里没有这些变量', 'Not solved yet: each equation must have a variable on the left, and none of those variables on any right side')
    const θ = Object.fromEntries(out.eqs.map(([x, t]) => [x.name, t]))
    return input.eqs.every(([s, t]) => sameTerm(applyT(s, θ), applyT(t, θ))) ? '' : T('结果代回去，原来的等式两边还不一样', 'Put back into the equations, the result does not make both sides equal')
  }
  if (want === 'prenex' || want === 'skolem') {
    if (out.kind !== 'formula') return T('结果要一句公式', 'The result must be a formula')
    const ref = want === 'prenex' ? prenex(foNnf(input.f)) : skolem(prenex(foNnf(input.f)))
    if (want === 'prenex' && !isPrenex(out.f)) return T('量词还没有都挪到最前面', 'Not every quantifier is at the front yet')
    if (want === 'skolem' && hasExists(out.f)) return T('结果里还有 ∃', 'The result still has ∃')
    return same(out.f, ref) ? '' : T('结果和照规矩一步步做出来的不一样', 'The result differs from the one made by the rules step by step')
  }
  if (out.kind !== 'clauses') return T('结果要一组子句', 'The result must be a clause set')
  if (want === 'clauseForm') {
    const ref = clauseFormOf(input.f)
    return ref.length === out.set.length && ref.every((c, k) => c.join() === out.set[k].join()) ? '' : T('结果和这句话的子句形式不一样', 'The result is not this sentence’s clause form')
  }
  if (want === 'foRefuted') return refuted(out.set) ? '' : T('结果里还没有空子句 ⊥', 'The result has no empty clause ⊥ yet')
  if (want === 'entails') {
    const known = Object.entries(inputs).filter(([name]) => name !== 'goal').map(([, v]) => v.f)
    const both = [...known, { op: '¬', a: inputs.goal.f }].reduce((acc, f) => (acc ? and(acc, f) : f), null)
    const follows = refuted(saturate(clausesOf(cnf(both))))
    if (follows) return refuted(out.set) ? '' : T('结果里还没有空子句 ⊥：这一组是推得出来的', 'The result has no empty clause ⊥ yet, and this one does follow')
    if (refuted(out.set)) return T('结果里有 ⊥，可这一组其实推不出来：机器"证"出了假话', 'The result holds ⊥, yet this one does not follow: the machine “proved” something false')
    return closed(out.set) ? '' : T('结果还能再归结出新子句：还没饱和', 'The result still resolves into new clauses: not saturated yet')
  }
  const unsat = refuted(saturate(input.kind === 'clauses' ? input.set : clausesOf(cnf(input.f))))
  if (want === 'refuted' || (want === 'decide' && unsat)) return refuted(out.set) ? '' : T('结果里还没有空子句 ⊥', 'The result has no empty clause ⊥ yet')
  if (refuted(out.set)) return T('结果里有 ⊥，可这组子句是可满足的', 'The result holds ⊥, yet these clauses can be satisfied')
  return closed(out.set) ? '' : T('结果还能再归结出新子句：还没饱和', 'The result still resolves into new clauses: not saturated yet')
}

/** How a machine level runs and is judged, for the shared engine (../../engine/tests.js). */
export const MACHINE_TESTS = {
  runTest: (level, circuit, test) => {
    const run = runBoard(circuit, { parts: MACHINE_PARTS, bind: inputsOf(test), ctx: { graph: circuit, defs: level.defs ?? [] } })
    return { ...run, outputs: { out: run.outputs.out } }
  },
  check: (level, test, outputs) => {
    const problem = judge(test.want ?? level.want, test, outputs.out, level.notation)
    return [{ name: 'out', pass: !problem, reason: problem }]
  },
  score: (level, circuit) => ({ steps: circuit.nodes.filter((n) => n.type !== 'in' && n.type !== 'out').length }),
}
