// Proofs as circuits (《证明完毕》). A wire carries a proved judgment:
//
//   { formula, hyps: Map(hypothesis id → formula) }   the formula, proved from the hypotheses still open
//
// A part is an inference rule: its inputs are premises, its output the conclusion. A rule that opens an assumption is
// a frame (../../circuit/frames.js framePart) with a region for each assumption: the region's output `<box>#<region>` gives the
// assumption, as a judgment resting on its own hypothesis (hypId), and what the cards inside prove comes back
// through the box's input of the same name; the box's conclusion closes the hypothesis. Each of those outputs reads
// only the box's other inputs (../../engine/circuit.js `reads`), so a box can read back what was made from it. A
// proof is a circuit whose sources are the level's premises and whose sink `goal` must be the goal, with no
// hypotheses open but the premises: which region a card sits in is how the editor keeps it tidy, while the hypotheses
// on every judgment are what make a proof sound. A rule that does not fit throws a PartError saying what it needed
// and what reached it.
import { PartError } from '../../engine/circuit.js'
import { framePart } from '../../circuit/frames.js'
import { runBoard, sink, source } from '../../engine/boards.js'
import { BOT, all, and, bin, eq, freeVars, imp, occurrences, or, parse, replaceAtoms, replaceTerm, same, show, subst, tvar } from './formula.js'
import { say, sayTerm } from './notation.js'
import { clauseFormula } from './clauses.js'

/** A judgment: `formula` from `hyps`. */
export const proved = (formula, hyps = new Map()) => ({ formula, hyps })
const union = (...js) => new Map(js.flatMap((j) => [...j.hyps]))
// What a port needed (a formula, or a SHAPE) and the formula that reached it, written in the level's notation.
const need = (ctx, what, got) => {
  const [w, g] = [what.op ? say(what, ctx.notation) : what, say(got, ctx.notation)]
  return new PartError({ zh: `这里要 ${w.zh}，接进来的是 ${g.zh}`, en: `This needs ${w.en}; it got ${g.en}` })
}
const T = (zh, en) => ({ zh, en })
const SHAPE = {
  imp: T('一句「若…则…」', 'an “if … then …”'),
  and: T('一句「…并且…」', 'an “… and …”'),
  or: T('一句「…或者…」', 'an “… or …”'),
  bot: T('矛盾 ⊥', 'a contradiction ⊥'),
  nn: T('一句「并非并非…」', 'a “not not …”'),
  all: T('一句「对所有 x…」', 'a “for all x …”'),
  ex: T('一句「存在 x…」', 'a “there is an x …”'),
  eq: T('一个等式', 'an equation'),
  fits: T('一句这块元件接得上的话', 'a sentence this part accepts'),
  clause: T('一条子句（几个字母或它们的否定用「或」连起来）', 'a clause (letters or their negations joined by or)'),
}
const sayIn = (ctx, f) => say(f, ctx.notation)
const fail = (zh, en) => new PartError({ zh, en })
// A formula chosen on a card. Cards hold the level's schema (its letters), and a test case fills the letters in
// (ctx.subst: A := it rains), so one proof runs on every case; the level's constants come through ctx.consts.
const param = (node, key, ctx = {}) => {
  const text = node.params?.[key]
  if (typeof text !== 'string' || !text.trim()) throw fail('先在卡片上选好句子', 'Choose the sentences on the card first')
  return replaceAtoms(parse(text, { consts: ctx.consts ?? [] }), ctx.subst ?? {})
}
// The term a card names (params.t).
function termOf(node, ctx = {}) {
  const text = node.params?.t
  if (!text) throw fail('先填一个项', 'Fill in a term first')
  return parse(`${text} = ${text}`, { consts: ctx.consts ?? [] }).args[0]
}
// ¬A is A → ⊥ to the rules, and A ↔ B is (A → B) ∧ (B → A).
const asImp = (f) => (f.op === '¬' ? imp(f.a, BOT) : f)
const asAnd = (f) => (f.op === '↔' ? and(imp(f.a, f.b), imp(f.b, f.a)) : f)
// A clause's literals in the order written ('A', '¬A'), [] for ⊥; null when it is not a clause.
function literals(f) {
  if (f.op === '⊥') return []
  if (f.op === 'atom') return [show(f)]
  if (f.op === '¬' && f.a.op === 'atom') return [`¬${show(f.a)}`]
  if (f.op !== '∨') return null
  const [a, b] = [literals(f.a), literals(f.b)]
  return a && b ? [...new Set([...a, ...b])] : null
}
const flip = (l) => (l.startsWith('¬') ? l.slice(1) : `¬${l}`)
const without = (hyps, id) => new Map([...hyps].filter(([k]) => k !== id))

/** The hypothesis id of the assumption a box's region opens. */
export const hypId = (node, region) => `${node.id}/${region}`
const assumed = (node, region, formula) => proved(formula, new Map([[hypId(node, region), formula]]))
export const RULES = {
  // The proof's own ends: a premise, and the goal.
  premise: source(),
  goal: sink(),

  // ---- the rule that uses an “if … then …” up: modus ponens ----
  mp: {
    inputs: ['imp', 'a'],
    eval: ({ imp: i, a }, _n, ctx) => {
      const f = asImp(i.formula)
      if (f.op !== '→') throw need(ctx, SHAPE.imp, i.formula)
      if (!same(f.a, a.formula)) throw need(ctx, f.a, a.formula)
      return proved(f.b, union(i, a))
    },
  },

  // ---- natural deduction ----
  impI: {
    ...framePart([], [{ name: 'body', opens: true }]),
    params: ['A'],
    eval: ({ body }, node, ctx, key) => {
      const A = param(node, 'A', ctx)
      return key ? assumed(node, key, A) : proved(imp(A, body.formula), without(body.hyps, hypId(node, 'body')))
    },
  },
  andI: { inputs: ['a', 'b'], eval: ({ a, b }) => proved(and(a.formula, b.formula), union(a, b)) },
  // A ↔ B is (A → B) ∧ (B → A) to the rules, so splitting it gives its two directions.
  andE: {
    inputs: ['ab'],
    outputs: () => ['left', 'right'],
    eval: ({ ab }, _n, ctx, key) => {
      const f = asAnd(ab.formula)
      if (f.op !== '∧') throw need(ctx, SHAPE.and, ab.formula)
      return proved(key === 'right' ? f.b : f.a, ab.hyps)
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
    ...framePart(['ab'], [{ name: 'left', opens: true }, { name: 'right', opens: true }]),
    eval: ({ ab, left: l, right: r }, node, ctx, key) => {
      if (ab.formula.op !== '∨') throw need(ctx, SHAPE.or, ab.formula)
      if (key) return assumed(node, key, key === 'left' ? ab.formula.a : ab.formula.b)
      if (!same(l.formula, r.formula)) { const [a, b] = [sayIn(ctx, l.formula), sayIn(ctx, r.formula)]; throw fail(`两种情况证出的不一样：${a.zh}；${b.zh}`, `The two cases prove different things: ${a.en}; ${b.en}`) }
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

  // ---- clauses: resolution (chapter 4) ----
  // From two clauses with exactly one complementary pair of letters, the clause of everything else (⊥ when nothing is
  // left). With two pairs the resolvent would be a tautology, so the part refuses: one pair at a time.
  res: {
    inputs: ['a', 'b'],
    eval: ({ a, b }, _n, ctx) => {
      const [c, d] = [literals(a.formula), literals(b.formula)]
      if (!c) throw need(ctx, SHAPE.clause, a.formula)
      if (!d) throw need(ctx, SHAPE.clause, b.formula)
      const pairs = c.filter((l) => d.includes(flip(l)))
      if (!pairs.length) throw fail('这两句里没有一对能消掉的文字（一个是 A，另一个是 ¬A）', 'These two have no pair to cancel (A in one, ¬A in the other)')
      if (pairs.length > 1) throw fail('能消的不止一对：归结一次只消一对，同时消两对得到的不是它们的推论', 'More than one pair cancels: resolution removes one pair at a time, and removing two at once does not follow')
      // What is left of the first clause, then what is new of the second, in the order written.
      const left = [...new Set([...c.filter((l) => l !== pairs[0]), ...d.filter((l) => l !== flip(pairs[0]))])]
      return proved(clauseFormula(left), union(a, b))
    },
  },

  // ---- quantifiers and equality ----
  allI: {
    ...framePart([], [{ name: 'body', opens: false }]),
    params: ['x'],
    eval: ({ body }, node, ctx) => {
      const x = node.params?.x
      if (!x) throw fail('先给新变量起个名字', 'Name the new variable first')
      for (const h of body.hyps.values()) if (freeVars(h).has(x)) throw fail(`${x} 出现在还开着的假设 ${sayIn(ctx, h).zh} 里，不能对它说「任取」`, `${x} occurs in the open hypothesis ${sayIn(ctx, h).en}, so it is not arbitrary`)
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
    ...framePart(['ex'], [{ name: 'body', opens: true }]),
    params: ['x'],
    eval: ({ ex: e, body }, node, ctx, key) => {
      if (e.formula.op !== '∃') throw need(ctx, SHAPE.ex, e.formula)
      const y = node.params?.x
      if (!y) throw fail('先给见证起个名字', 'Name the witness first')
      if (key) return assumed(node, key, subst(e.formula.body, e.formula.v, tvar(y)))
      if (freeVars(body.formula).has(y)) throw fail(`结论里不能有见证 ${y}`, `The conclusion may not mention the witness ${y}`)
      const open = without(body.hyps, hypId(node, 'body'))
      for (const h of open.values()) if (freeVars(h).has(y)) throw fail(`${y} 出现在还开着的假设 ${sayIn(ctx, h).zh} 里`, `${y} occurs in the open hypothesis ${sayIn(ctx, h).en}`)
      return proved(body.formula, new Map([...e.hyps, ...open]))
    },
  },
  refl: { inputs: [], params: ['t'], eval: (_, node, ctx) => { const t = termOf(node, ctx); return proved(eq(t, t)) } },
  // From s = t and a proof of φ, φ with the occurrences of s the card marks (params.at, their places in order) replaced
  // by t. The card shows φ with each s in a box to tick (ui/boards.jsx).
  rewrite: {
    inputs: ['eq', 'p'],
    eval: ({ eq: e, p }, node, ctx) => {
      const f = e.formula
      if (f.op !== 'atom' || f.pred !== '=') throw need(ctx, SHAPE.eq, f)
      const [s, t] = f.args
      const n = occurrences(p.formula, s)
      if (!n) { const [a, b] = [sayTerm(s, ctx.notation), sayIn(ctx, p.formula)]; throw fail(`「${b.zh}」里没有 ${a.zh}`, `“${b.en}” does not mention ${a.en}`) }
      const at = (node.params?.at ?? []).filter((k) => k < n)
      if (!at.length) throw fail('在卡片上点框，选出要换掉的那几处', 'Tick the boxes on the card to choose which to replace')
      return proved(replaceTerm(p.formula, s, t, (k) => at.includes(k)), union(e, p))
    },
  },
}

/* ---------- lemmas: rules the player proved ---------- */

// Match a schema (with schematic letters) against a formula, extending `bind`; false when they do not fit.
function match(schema, f0, bind) {
  if (schema.op === 'meta') {
    if (bind[schema.name]) return same(bind[schema.name], f0)
    bind[schema.name] = f0
    return true
  }
  // ¬A is A → ⊥ and A ↔ B is (A → B) ∧ (B → A) here too, whichever side writes it which way.
  if (schema.op === '↔') return match(asAnd(schema), f0, bind)
  const f = schema.op === '→' ? asImp(f0) : schema.op === '∧' ? asAnd(f0) : f0
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
  if (!judgment) return { zh: '没有证到终点', en: 'Nothing reaches the goal' }
  if (!same(judgment.formula, goal)) { const [got, want] = [say(judgment.formula, notation), say(goal, notation)]; return { zh: `证出的是「${got.zh}」，要的是「${want.zh}」`, en: `It proves “${got.en}”; the goal is “${want.en}”` } }
  const open = [...judgment.hyps].filter(([id]) => !premiseIds.includes(id)).map(([, f]) => say(f, notation))
  if (open.length) return { zh: `还开着假设「${open.map((f) => f.zh).join('」「')}」`, en: `Hypotheses still open: ${open.map((f) => `“${f.en}”`).join(', ')}` }
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
