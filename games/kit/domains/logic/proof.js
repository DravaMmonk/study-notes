// Proofs as circuits (《证明完备》). A wire carries a proved judgment:
//
//   { formula, hyps: Map(hypothesis id → formula) }   the formula, proved from the hypotheses still open
//
// A part is an inference rule: its inputs are premises, its output the conclusion. A rule that opens an assumption is
// a part with a board inside (../../engine/boards.js): the board's source `assume` gives the assumption, its sink
// `out` what was proved under it, and the part's conclusion closes the assumption. A proof is a circuit whose sources
// are the level's premises and whose sink `goal` must be the goal, with no hypotheses open but the premises.
// A rule that does not fit throws a PartError saying what it needed and what reached it.
import { PartError } from '../../engine/circuit.js'
import { runBoard, runInner, sink, source } from '../../engine/boards.js'
import { BOT, all, and, bin, eq, freeVars, imp, or, parse, same, show, subst, tvar } from './formula.js'

/** A judgment: `formula` from `hyps`. */
export const proved = (formula, hyps = new Map()) => ({ formula, hyps })
const union = (...js) => new Map(js.flatMap((j) => [...j.hyps]))
const need = (what, got) => new PartError({ zh: `这里要 ${what}，接进来的是 ${got}`, en: `This needs ${what}; it got ${got}` })
const fail = (zh, en) => new PartError({ zh, en })
// A formula typed on a card; the level's constants come through ctx.consts.
const param = (node, key, ctx = {}) => {
  const text = node.params?.[key]
  if (typeof text !== 'string' || !text.trim()) throw fail(`先填 ${key}`, `Fill in ${key} first`)
  try {
    return parse(text, { consts: ctx.consts ?? [] })
  } catch {
    throw fail(`${key} 写得不对：${text}`, `${key} does not parse: ${text}`)
  }
}
// ¬A is A → ⊥ to the rules.
const asImp = (f) => (f.op === '¬' ? imp(f.a, BOT) : f)

/** Open an assumption inside `node`'s board `name` and run it: [what the board proved, the hypothesis id]. */
function underAssumption(ctx, node, name, formula, extra = {}) {
  const id = `${node.id}/${name}`
  const assumption = proved(formula, new Map([[id, formula]]))
  // Inside, the assumption is `assume`; boxes further in reach it by its id, as they reach the premises by name.
  const { outputs } = runInner(ctx, node, name, { assume: assumption, [id]: assumption, ...extra })
  if (!outputs.out) throw fail('框里还没证出结论', 'The box has not proved anything yet')
  return [outputs.out, id]
}
const without = (hyps, id) => new Map([...hyps].filter(([k]) => k !== id))

export const RULES = {
  // The proof's own ends: a premise, and the goal.
  premise: source(),
  goal: sink(),
  // Inside a box: the assumption it opens, and what it proves.
  assume: source(),
  out: sink(),

  // ---- Hilbert: modus ponens and the axioms K, S (instances set on the card) ----
  mp: {
    inputs: ['imp', 'a'],
    eval: ({ imp: i, a }) => {
      const f = asImp(i.formula)
      if (f.op !== '→') throw need('A → B', show(i.formula))
      if (!same(f.a, a.formula)) throw need(show(f.a), show(a.formula))
      return proved(f.b, union(i, a))
    },
  },
  axK: { inputs: [], eval: (_, node, ctx) => { const [A, B] = [param(node, 'A', ctx), param(node, 'B', ctx)]; return proved(imp(A, imp(B, A))) } },
  axS: { inputs: [], eval: (_, node, ctx) => { const [A, B, C] = [param(node, 'A', ctx), param(node, 'B', ctx), param(node, 'C', ctx)]; return proved(imp(imp(A, imp(B, C)), imp(imp(A, B), imp(A, C)))) } },

  // ---- natural deduction ----
  impI: {
    inputs: [],
    boards: () => [{ name: 'body', sources: ['assume'], sinks: ['out'] }],
    eval: (_, node, ctx) => {
      const A = param(node, 'A', ctx)
      const [body, id] = underAssumption(ctx, node, 'body', A)
      return proved(imp(A, body.formula), without(body.hyps, id))
    },
  },
  andI: { inputs: ['a', 'b'], eval: ({ a, b }) => proved(and(a.formula, b.formula), union(a, b)) },
  andE: {
    inputs: ['ab'],
    outputs: () => ['left', 'right'],
    eval: ({ ab }, _n, _c, key) => {
      if (ab.formula.op !== '∧') throw need('A ∧ B', show(ab.formula))
      return proved(key === 'right' ? ab.formula.b : ab.formula.a, ab.hyps)
    },
  },
  orI: {
    inputs: ['a'],
    eval: ({ a }, node, ctx) => {
      const other = param(node, 'other', ctx)
      return proved(node.params?.side === 'right' ? or(other, a.formula) : or(a.formula, other), a.hyps)
    },
  },
  orE: {
    inputs: ['ab'],
    boards: () => [{ name: 'left', sources: ['assume'], sinks: ['out'] }, { name: 'right', sources: ['assume'], sinks: ['out'] }],
    eval: ({ ab }, node, ctx) => {
      if (ab.formula.op !== '∨') throw need('A ∨ B', show(ab.formula))
      const [l, li] = underAssumption(ctx, node, 'left', ab.formula.a)
      const [r, ri] = underAssumption(ctx, node, 'right', ab.formula.b)
      if (!same(l.formula, r.formula)) throw fail(`两种情况证出的不一样：${show(l.formula)}，${show(r.formula)}`, `The two cases prove different things: ${show(l.formula)}, ${show(r.formula)}`)
      return proved(l.formula, new Map([...ab.hyps, ...without(l.hyps, li), ...without(r.hyps, ri)]))
    },
  },
  botE: {
    inputs: ['bot'],
    eval: ({ bot }, node, ctx) => {
      if (bot.formula.op !== '⊥') throw need('⊥', show(bot.formula))
      return proved(param(node, 'C', ctx), bot.hyps)
    },
  },
  // Classical: from ¬¬A, A.
  raa: {
    inputs: ['nna'],
    eval: ({ nna }) => {
      const f = asImp(nna.formula)
      const inner = f.op === '→' && same(f.b, BOT) ? asImp(f.a) : null
      if (!inner || inner.op !== '→' || !same(inner.b, BOT)) throw need('¬¬A', show(nna.formula))
      return proved(inner.a, nna.hyps)
    },
  },

  // ---- quantifiers and equality ----
  allI: {
    inputs: [],
    boards: () => [{ name: 'body', sources: [], sinks: ['out'] }],
    eval: (_, node, ctx) => {
      const x = node.params?.x
      if (!x) throw fail('先给新变量起个名字', 'Name the new variable first')
      const { outputs } = runInner(ctx, node, 'body', {})
      const body = outputs.out
      if (!body) throw fail('框里还没证出结论', 'The box has not proved anything yet')
      for (const h of body.hyps.values()) if (freeVars(h).has(x)) throw fail(`${x} 出现在还开着的假设 ${show(h)} 里，不能对它说「任取」`, `${x} occurs in the open hypothesis ${show(h)}, so it is not arbitrary`)
      return proved(all(x, body.formula), body.hyps)
    },
  },
  allE: {
    inputs: ['all'],
    eval: ({ all: a }, node, ctx) => {
      if (a.formula.op !== '∀') throw need('∀x. P(x)', show(a.formula))
      return proved(subst(a.formula.body, a.formula.v, termOf(node, ctx)), a.hyps)
    },
  },
  exI: {
    inputs: ['a'],
    eval: ({ a }, node, ctx) => {
      const target = param(node, 'target', ctx)
      if (target.op !== '∃') throw need('∃x. P(x)', show(target))
      const instance = subst(target.body, target.v, termOf(node, ctx))
      if (!same(instance, a.formula)) throw need(show(instance), show(a.formula))
      return proved(target, a.hyps)
    },
  },
  exE: {
    inputs: ['ex'],
    boards: () => [{ name: 'body', sources: ['assume'], sinks: ['out'] }],
    eval: ({ ex: e }, node, ctx) => {
      if (e.formula.op !== '∃') throw need('∃x. P(x)', show(e.formula))
      const y = node.params?.x
      if (!y) throw fail('先给见证起个名字', 'Name the witness first')
      const [body, id] = underAssumption(ctx, node, 'body', subst(e.formula.body, e.formula.v, tvar(y)))
      if (freeVars(body.formula).has(y)) throw fail(`结论里不能有见证 ${y}`, `The conclusion may not mention the witness ${y}`)
      const open = without(body.hyps, id)
      for (const h of open.values()) if (freeVars(h).has(y)) throw fail(`${y} 出现在还开着的假设 ${show(h)} 里`, `${y} occurs in the open hypothesis ${show(h)}`)
      return proved(body.formula, new Map([...e.hyps, ...open]))
    },
  },
  refl: { inputs: [], eval: (_, node, ctx) => { const t = termOf(node, ctx); return proved(eq(t, t)) } },
  // From s = t and a proof of φ, φ with s replaced by t wherever the card's pattern puts x.
  rewrite: {
    inputs: ['eq', 'p'],
    eval: ({ eq: e, p }, node, ctx) => {
      const f = e.formula
      if (f.op !== 'atom' || f.pred !== '=') throw need('s = t', show(f))
      const [s, t] = f.args
      const x = node.params?.x ?? 'x'
      const pattern = param(node, 'pattern', ctx)
      if (!same(subst(pattern, x, s), p.formula)) throw need(show(subst(pattern, x, s)), show(p.formula))
      return proved(subst(pattern, x, t), union(e, p))
    },
  },
}

// The term a card names (params.t).
function termOf(node, ctx = {}) {
  const text = node.params?.t
  if (!text) throw fail('先填一个项', 'Fill in a term first')
  return parse(`${text} = ${text}`, { consts: ctx.consts ?? [] }).args[0]
}

/**
 * A lemma the player proved, as a rule: its statement with schematic letters, instantiated on its card
 * (params: { A: '…', B: '…' }). It is sound because the level that built it checked the proof.
 */
export function lemma({ statement, metas }) {
  const schema = parse(statement, { metas })
  const instantiate = (f, node, ctx) => {
    if (f.op === 'meta') return param(node, f.name, ctx)
    if (f.op === '¬') return { op: '¬', a: instantiate(f.a, node, ctx) }
    if (f.op === '∀' || f.op === '∃') return { ...f, body: instantiate(f.body, node, ctx) }
    if (f.a) return bin(f.op, instantiate(f.a, node, ctx), instantiate(f.b, node, ctx))
    return f
  }
  return { inputs: [], eval: (_, node, ctx) => proved(instantiate(schema, node, ctx)) }
}

/** Does a judgment prove `goal` from the `premises` alone (by hypothesis id)? '' or what is wrong, as { zh, en }. */
export function closes(judgment, goal, premiseIds) {
  if (!judgment) return { zh: '没有证到终点', en: 'Nothing reaches the goal' }
  if (!same(judgment.formula, goal)) return { zh: `证出的是 ${show(judgment.formula)}，要的是 ${show(goal)}`, en: `It proves ${show(judgment.formula)}; the goal is ${show(goal)}` }
  const open = [...judgment.hyps].filter(([id]) => !premiseIds.includes(id))
  if (open.length) return { zh: `还开着假设 ${open.map(([, f]) => show(f)).join('、')}`, en: `Hypotheses still open: ${open.map(([, f]) => show(f)).join(', ')}` }
  return ''
}

/**
 * How a proof level runs and is judged, for the shared engine (../../engine/tests.js). A test is
 * { premises: { name: formula text }, goal: formula text }; the level may name its constants (consts).
 */
export const LOGIC_TESTS = {
  runTest: (level, circuit, test) => {
    const consts = level.consts ?? []
    const bind = Object.fromEntries(Object.entries(test.premises ?? {}).map(([name, text]) => {
      const f = parse(text, { consts })
      return [name, proved(f, new Map([[name, f]]))]
    }))
    const run = runBoard(circuit, { parts: RULES_OF(level), bind, ctx: { consts } })
    return { ...run, outputs: { goal: run.outputs.goal } }
  },
  check: (level, test, outputs) => {
    const goal = parse(test.goal, { consts: level.consts ?? [] })
    const problem = closes(outputs.goal, goal, Object.keys(test.premises ?? {}))
    return [{ name: 'goal', pass: !problem, reason: problem }]
  },
  // A shorter proof is a better one.
  score: (level, circuit) => ({ steps: circuit.nodes.filter((n) => !['premise', 'goal', 'assume', 'out'].includes(n.type)).length }),
}

/** The rules a level can use: every rule, and its lemmas ({ type: { statement, metas } }) as rules of their own. */
const RULES_OF = (level) => (level.lemmas ? { ...RULES, ...Object.fromEntries(Object.entries(level.lemmas).map(([type, l]) => [type, lemma(l)])) } : RULES)
