// Proofs as circuits (《证明完毕》). A wire carries a proved judgment:
//
//   { formula, hyps: Map(hypothesis id → formula) }   the formula, proved from the hypotheses still open
//
// A part is an inference rule: its inputs are premises, its output the conclusion. A rule that opens an assumption is
// a frame (../../circuit/frames.js) with a region for each assumption: the region's output `<box>#<region>` gives the
// assumption, as a judgment resting on its own hypothesis (hypId), and what the cards inside prove comes back
// through the box's input of the same name; the box's conclusion closes the hypothesis. Each of those outputs reads
// only the box's other inputs (../../engine/circuit.js `reads`), so a box can read back what was made from it. A
// proof is a circuit whose sources are the level's premises and whose sink `goal` must be the goal, with no
// hypotheses open but the premises: which region a card sits in is how the editor keeps it tidy, while the hypotheses
// on every judgment are what make a proof sound. A rule that does not fit throws a PartError saying what it needed
// and what reached it.
import { PartError } from '../../engine/circuit.js'
import { runBoard, sink, source } from '../../engine/boards.js'
import { BOT, all, and, bin, eq, freeVars, imp, or, parse, replaceAtoms, same, show, subst, tvar } from './formula.js'
import { say } from './notation.js'

/** A judgment: `formula` from `hyps`. */
export const proved = (formula, hyps = new Map()) => ({ formula, hyps })
const union = (...js) => new Map(js.flatMap((j) => [...j.hyps]))
// What a port needed (a formula, or a SHAPE) and the formula that reached it, written in the level's notation.
const need = (ctx, what, got) => {
  const [w, g] = [what.op ? say(what, ctx.notation) : what, say(got, ctx.notation)]
  return new PartError({ zh: `所需输入：${w.zh}；实际输入：${g.zh}`, en: `This needs ${w.en}; it got ${g.en}` })
}
const T = (zh, en) => ({ zh, en })
const SHAPE = {
  imp: T('条件命题「如果……那么……」', 'an “if … then …”'),
  and: T('合取命题「……并且……」', 'an “… and …”'),
  or: T('析取命题「……或者……」', 'an “… or …”'),
  bot: T('矛盾 ⊥', 'a contradiction ⊥'),
  nn: T('双重否定命题 ¬¬A', 'a “not not …”'),
  iff: T('双条件命题「……当且仅当……」', 'an “… if and only if …”'),
  all: T('全称命题「对所有 x，……」', 'a “for all x …”'),
  ex: T('存在命题「存在 x，使得……」', 'a “there is an x …”'),
  eq: T('一个等式', 'an equation'),
  fits: T('符合此规则输入要求的命题', 'a sentence this part accepts'),
}
const sayIn = (ctx, f) => say(f, ctx.notation)
const fail = (zh, en) => new PartError({ zh, en })
// A formula chosen on a card. Cards hold the level's schema (its letters), and a test case fills the letters in
// (ctx.subst: A := it rains), so one proof runs on every case; the level's constants come through ctx.consts.
const param = (node, key, ctx = {}) => {
  const text = node.params?.[key]
  if (typeof text !== 'string' || !text.trim()) throw fail('请先在卡片上选择命题', 'Choose the sentences on the card first')
  return replaceAtoms(parse(text, { consts: ctx.consts ?? [] }), ctx.subst ?? {})
}
// The term a card names (params.t).
function termOf(node, ctx = {}) {
  const text = node.params?.t
  if (!text) throw fail('请先填写一个项', 'Fill in a term first')
  return parse(`${text} = ${text}`, { consts: ctx.consts ?? [] }).args[0]
}
// ¬A is A → ⊥ to the rules.
const asImp = (f) => (f.op === '¬' ? imp(f.a, BOT) : f)
const without = (hyps, id) => new Map([...hyps].filter(([k]) => k !== id))

/** The hypothesis id of the assumption a box's region opens. */
export const hypId = (node, region) => `${node.id}/${region}`
const assumed = (node, region, formula) => proved(formula, new Map([[hypId(node, region), formula]]))
// A box's regions, its inputs (its own, then one per region: what was proved there) and its outputs (its conclusion,
// then each region's assumption, which reads the box's own inputs alone).
const box = (own, regions) => ({
  inputs: [...own, ...regions.map((r) => r.name)],
  frames: () => regions,
  outputs: () => [null, ...regions.filter((r) => r.opens).map((r) => r.name)],
  reads: (_node, key) => (key ? own : undefined),
})
export const RULES = {
  // The proof's own ends: a premise, and the goal.
  premise: source(),
  goal: sink(),

  // ---- Hilbert: modus ponens and the axioms K, S (instances set on the card) ----
  mp: {
    inputs: ['imp', 'a'],
    eval: ({ imp: i, a }, _n, ctx) => {
      const f = asImp(i.formula)
      if (f.op !== '→') throw need(ctx, SHAPE.imp, i.formula)
      if (!same(f.a, a.formula)) throw need(ctx, f.a, a.formula)
      return proved(f.b, union(i, a))
    },
  },
  axK: { inputs: [], params: ['A', 'B'], eval: (_, node, ctx) => { const [A, B] = [param(node, 'A', ctx), param(node, 'B', ctx)]; return proved(imp(A, imp(B, A))) } },
  axS: { inputs: [], params: ['A', 'B', 'C'], eval: (_, node, ctx) => { const [A, B, C] = [param(node, 'A', ctx), param(node, 'B', ctx), param(node, 'C', ctx)]; return proved(imp(imp(A, imp(B, C)), imp(imp(A, B), imp(A, C)))) } },

  // ---- natural deduction ----
  impI: {
    ...box([], [{ name: 'body', opens: true }]),
    params: ['A'],
    eval: ({ body }, node, ctx, key) => {
      const A = param(node, 'A', ctx)
      return key ? assumed(node, key, A) : proved(imp(A, body.formula), without(body.hyps, hypId(node, 'body')))
    },
  },
  andI: { inputs: ['a', 'b'], eval: ({ a, b }) => proved(and(a.formula, b.formula), union(a, b)) },
  andE: {
    inputs: ['ab'],
    outputs: () => ['left', 'right'],
    eval: ({ ab }, _n, ctx, key) => {
      if (ab.formula.op !== '∧') throw need(ctx, SHAPE.and, ab.formula)
      return proved(key === 'right' ? ab.formula.b : ab.formula.a, ab.hyps)
    },
  },
  orI: {
    inputs: ['a'],
    params: ['other'],
    eval: ({ a }, node, ctx) => {
      const other = param(node, 'other', ctx)
      return proved(node.params?.side === 'left' ? or(other, a.formula) : or(a.formula, other), a.hyps)
    },
  },
  orE: {
    ...box(['ab'], [{ name: 'left', opens: true }, { name: 'right', opens: true }]),
    eval: ({ ab, left: l, right: r }, node, ctx, key) => {
      if (ab.formula.op !== '∨') throw need(ctx, SHAPE.or, ab.formula)
      if (key) return assumed(node, key, key === 'left' ? ab.formula.a : ab.formula.b)
      if (!same(l.formula, r.formula)) { const [a, b] = [sayIn(ctx, l.formula), sayIn(ctx, r.formula)]; throw fail(`两个分支的结论不一致：${a.zh}；${b.zh}`, `The two cases prove different things: ${a.en}; ${b.en}`) }
      return proved(l.formula, new Map([...ab.hyps, ...without(l.hyps, hypId(node, 'left')), ...without(r.hyps, hypId(node, 'right'))]))
    },
  },
  botE: {
    inputs: ['bot'],
    params: ['C'],
    eval: ({ bot }, node, ctx) => {
      if (bot.formula.op !== '⊥') throw need(ctx, SHAPE.bot, bot.formula)
      return proved(param(node, 'C', ctx), bot.hyps)
    },
  },
  // Classical: from ¬¬A, A.
  raa: {
    inputs: ['nna'],
    eval: ({ nna }, _n, ctx) => {
      const f = asImp(nna.formula)
      const inner = f.op === '→' && same(f.b, BOT) ? asImp(f.a) : null
      if (!inner || inner.op !== '→' || !same(inner.b, BOT)) throw need(ctx, SHAPE.nn, nna.formula)
      return proved(inner.a, nna.hyps)
    },
  },
  // A ↔ B gives A → B and B → A.
  iffE: {
    inputs: ['iff'],
    outputs: () => ['ltr', 'rtl'],
    eval: ({ iff }, _n, ctx, key) => {
      const f = iff.formula
      if (f.op !== '↔') throw need(ctx, SHAPE.iff, f)
      return proved(key === 'rtl' ? imp(f.b, f.a) : imp(f.a, f.b), iff.hyps)
    },
  },

  // ---- quantifiers and equality ----
  allI: {
    ...box([], [{ name: 'body', opens: false }]),
    params: ['x'],
    eval: ({ body }, node, ctx) => {
      const x = node.params?.x
      if (!x) throw fail('请先设置新变量的名称', 'Name the new variable first')
      for (const h of body.hyps.values()) if (freeVars(h).has(x)) throw fail(`${x} 自由出现于未解除的假设「${sayIn(ctx, h).zh}」中，不能应用全称引入`, `${x} occurs in the open hypothesis ${sayIn(ctx, h).en}, so it is not arbitrary`)
      return proved(all(x, body.formula), body.hyps)
    },
  },
  allE: {
    inputs: ['all'],
    params: ['t'],
    eval: ({ all: a }, node, ctx) => {
      if (a.formula.op !== '∀') throw need(ctx, SHAPE.all, a.formula)
      return proved(subst(a.formula.body, a.formula.v, termOf(node, ctx)), a.hyps)
    },
  },
  exI: {
    inputs: ['a'],
    params: ['target', 't'],
    eval: ({ a }, node, ctx) => {
      const target = param(node, 'target', ctx)
      if (target.op !== '∃') throw need(ctx, SHAPE.ex, target)
      const instance = subst(target.body, target.v, termOf(node, ctx))
      if (!same(instance, a.formula)) throw need(ctx, instance, a.formula)
      return proved(target, a.hyps)
    },
  },
  exE: {
    ...box(['ex'], [{ name: 'body', opens: true }]),
    params: ['x'],
    eval: ({ ex: e, body }, node, ctx, key) => {
      if (e.formula.op !== '∃') throw need(ctx, SHAPE.ex, e.formula)
      const y = node.params?.x
      if (!y) throw fail('请先设置见证变量的名称', 'Name the witness first')
      if (key) return assumed(node, key, subst(e.formula.body, e.formula.v, tvar(y)))
      if (freeVars(body.formula).has(y)) throw fail(`见证变量 ${y} 不能自由出现于结论中`, `The conclusion may not mention the witness ${y}`)
      const open = without(body.hyps, hypId(node, 'body'))
      for (const h of open.values()) if (freeVars(h).has(y)) throw fail(`见证变量 ${y} 自由出现于其他未解除的假设「${sayIn(ctx, h).zh}」中`, `${y} occurs in the open hypothesis ${sayIn(ctx, h).en}`)
      return proved(body.formula, new Map([...e.hyps, ...open]))
    },
  },
  refl: { inputs: [], params: ['t'], eval: (_, node, ctx) => { const t = termOf(node, ctx); return proved(eq(t, t)) } },
  // From s = t and a proof of φ, φ with s replaced by t wherever the card's pattern puts x.
  rewrite: {
    inputs: ['eq', 'p'],
    params: ['pattern'],
    eval: ({ eq: e, p }, node, ctx) => {
      const f = e.formula
      if (f.op !== 'atom' || f.pred !== '=') throw need(ctx, SHAPE.eq, f)
      const [s, t] = f.args
      const x = node.params?.x ?? 'x'
      const pattern = param(node, 'pattern', ctx)
      if (!same(subst(pattern, x, s), p.formula)) throw need(ctx, subst(pattern, x, s), p.formula)
      return proved(subst(pattern, x, t), union(e, p))
    },
  },
}

/* ---------- lemmas: rules the player proved ---------- */

// Match a schema (with schematic letters) against a formula, extending `bind`; false when they do not fit.
function match(schema, f, bind) {
  if (schema.op === 'meta') {
    if (bind[schema.name]) return same(bind[schema.name], f)
    bind[schema.name] = f
    return true
  }
  const g = schema.op === '¬' && f.op === '→' && same(f.b, BOT) ? { op: '→', a: schema.a, b: BOT } : schema
  if (g.op !== f.op) return false
  if (g.op === 'atom') return same(g, f)
  if (g.op === '⊥') return true
  if (g.op === '¬') return match(g.a, f.a, bind)
  if (g.op === '∀' || g.op === '∃') return same(g, f)
  return match(g.a, f.a, bind) && match(g.b, f.b, bind)
}
function instantiate(f, bind) {
  if (f.op === 'meta') return bind[f.name]
  if (f.op === '¬') return { op: '¬', a: instantiate(f.a, bind) }
  if (f.op === '∀' || f.op === '∃') return { ...f, body: instantiate(f.body, bind) }
  if (f.a) return bin(f.op, instantiate(f.a, bind), instantiate(f.b, bind))
  return f
}
const metasIn = (f, out = new Set()) => {
  if (f.op === 'meta') out.add(f.name)
  else if (f.op === '¬') metasIn(f.a, out)
  else if (f.body) metasIn(f.body, out)
  else if (f.a) { metasIn(f.a, out); metasIn(f.b, out) }
  return out
}

/**
 * A lemma the player proved, as a rule: from `premises` (schemas, one input each) to `statement`, with schematic
 * letters `metas`. The letters the premises fix come from what is wired in; the others are set on the card. It is
 * sound because the level that built it checked the proof.
 */
export function lemma({ statement, premises = [], metas }) {
  const conclusion = parse(statement, { metas })
  const schemas = premises.map((p) => parse(p, { metas }))
  const fixed = new Set(schemas.flatMap((s) => [...metasIn(s)]))
  const open = [...metasIn(conclusion)].filter((m) => !fixed.has(m))
  return {
    inputs: schemas.map((_, k) => `p${k}`),
    params: open,
    lemma: { statement, premises },
    eval: (ins, node, ctx) => {
      const bind = {}
      schemas.forEach((s, k) => {
        const j = ins[`p${k}`]
        if (!match(s, j.formula, bind)) throw need(ctx, SHAPE.fits, j.formula)
      })
      for (const m of open) bind[m] = param(node, m, ctx)
      return proved(instantiate(conclusion, bind), union(...schemas.map((_, k) => ins[`p${k}`])))
    },
  }
}

/**
 * Does one use of a lemma, wired straight from `givens` (formulas), give `goal`? A level that a lemma it carries
 * proves in one step teaches nothing new: `npm run check` reports it.
 */
export function lemmaGives({ statement, premises = [], metas }, givens, goal) {
  const schemas = premises.map((p) => parse(p, { metas }))
  const fit = (k, bind) => k === schemas.length || givens.some((g) => {
    const next = { ...bind }
    return match(schemas[k], g, next) && fit(k + 1, next)
  })
  const bind = {}
  return match(parse(statement, { metas }), goal, bind) && fit(0, bind)
}

/**
 * Does a judgment prove `goal` from the `premises` alone (by hypothesis id)? '' or what is wrong, as { zh, en }, in
 * the level's notation.
 */
export function closes(judgment, goal, premiseIds, notation = null) {
  if (!judgment) return { zh: '尚未向目标提供证明结论', en: 'Nothing reaches the goal' }
  if (!same(judgment.formula, goal)) { const [got, want] = [say(judgment.formula, notation), say(goal, notation)]; return { zh: `当前结论为「${got.zh}」；待证命题为「${want.zh}」`, en: `It proves “${got.en}”; the goal is “${want.en}”` } }
  const open = [...judgment.hyps].filter(([id]) => !premiseIds.includes(id)).map(([, f]) => say(f, notation))
  if (open.length) return { zh: `仍依赖未解除的临时假设「${open.map((f) => f.zh).join('」「')}」`, en: `Hypotheses still open: ${open.map((f) => `“${f.en}”`).join(', ')}` }
  return ''
}

/** The rules a level can use: every rule, and its lemmas ({ type: { statement, premises, metas } }). */
export const rulesOf = (lemmas = {}) => ({ ...RULES, ...Object.fromEntries(Object.entries(lemmas).map(([type, l]) => [type, lemma(l)])) })

/** A test's premises as judgments, each its own hypothesis (named by the premise). */
export function premisesOf(test, consts = []) {
  return Object.fromEntries(Object.entries(test.premises ?? {}).map(([name, text]) => {
    const f = parse(text, { consts })
    return [name, proved(f, new Map([[name, f]]))]
  }))
}

/**
 * How a proof level runs and is judged, for the shared engine (../../engine/tests.js). A test is
 * { premises: { name: formula text }, goal: formula text }; the level may name its constants (consts) and its lemmas.
 */
export const LOGIC_TESTS = {
  runTest: (level, circuit, test) => {
    const consts = level.consts ?? []
    const run = runBoard(circuit, { parts: rulesOf(level.lemmas), bind: premisesOf(test, consts), ctx: { consts, notation: level.notation, subst: test.subst } })
    return { ...run, outputs: { goal: run.outputs.goal } }
  },
  check: (level, test, outputs) => {
    const goal = parse(test.goal, { consts: level.consts ?? [] })
    const problem = closes(outputs.goal, goal, Object.keys(test.premises ?? {}), level.notation)
    return [{ name: 'goal', pass: !problem, reason: problem }]
  },
  // A shorter proof is a better one.
  score: (level, circuit) => ({ steps: countSteps(circuit) }),
}
const countSteps = (circuit) => circuit.nodes.filter((node) => node.type !== 'premise' && node.type !== 'goal').length
