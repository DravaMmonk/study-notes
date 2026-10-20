// Proofs as circuits (《证明完毕》). A wire carries a proved judgment:
//
//   { formula, hyps: Map(hypothesis id → formula) }   the formula, proved from the hypotheses still open
//
// A part is an inference rule: its inputs are premises, its output the conclusion. A rule that opens an assumption is
// a part with boards inside (../../engine/boards.js). Its `scope(node, ins, board, ctx)` says what a board inside may
// use besides what the board around it may: the assumption it opens (as `assume`, and under its hypothesis id for
// boxes further in). The board's sink `out` is what was proved there, and the part's conclusion closes the
// assumption. A proof is a circuit whose sources are the level's premises and whose sink `goal` must be the goal,
// with no hypotheses open but the premises. A rule that does not fit throws a PartError saying what it needed and
// what reached it.
import { BROKEN, PartError } from '../../engine/circuit.js'
import { runBoard, runInner, sink, source } from '../../engine/boards.js'
import { BOT, all, and, bin, eq, freeVars, imp, or, parse, replaceAtoms, same, show, subst, tvar } from './formula.js'
import { say } from './notation.js'

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
  imp: T('一句「如果…那么…」', 'an “if … then …”'),
  and: T('一句「…并且…」', 'an “… and …”'),
  or: T('一句「…或者…」', 'an “… or …”'),
  bot: T('矛盾 ⊥', 'a contradiction ⊥'),
  nn: T('一句「并非并非…」', 'a “not not …”'),
  iff: T('一句「…当且仅当…」', 'an “… if and only if …”'),
  all: T('一句「对所有 x…」', 'a “for all x …”'),
  ex: T('一句「存在 x…」', 'a “there is an x …”'),
  eq: T('一个等式', 'an equation'),
  fits: T('一句这块元件接得上的话', 'a sentence this part accepts'),
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
// ¬A is A → ⊥ to the rules.
const asImp = (f) => (f.op === '¬' ? imp(f.a, BOT) : f)
const without = (hyps, id) => new Map([...hyps].filter(([k]) => k !== id))

/** The hypothesis id of the assumption a box's board opens. */
export const hypId = (node, board) => `${node.id}/${board}`
// What a box brings in from outside: anything proved there, wired into its ports in1 … in3, seen inside by those
// names (premises and the assumptions of the boxes around it are seen anyway).
export const CARRY = ['in1', 'in2', 'in3']
const carried = (ins) => Object.fromEntries(CARRY.filter((k) => ins[k]).map((k) => [k, ins[k]]))
const box = (inputs = []) => ({ inputs: [...inputs, ...CARRY], optional: CARRY, bare: true })
// What a board inside sees when it opens `formula`: `assume`, and the same under its id.
const opening = (node, board, formula, ins = {}) => {
  const j = proved(formula, new Map([[hypId(node, board), formula]]))
  return { ...carried(ins), assume: j, [hypId(node, board)]: j }
}
// Run a box's board with its scope; what it proved, or a PartError when nothing reached its `out`.
function inside(part, ctx, node, ins, board) {
  const { outputs } = runInner(ctx, node, board, part.scope(node, ins, board, ctx))
  if (!outputs.out) throw fail('框里还没证出结论', 'The box has not proved anything yet')
  return outputs.out
}

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
    ...box(),
    params: ['A'],
    boards: () => [{ name: 'body', assumes: true }],
    scope: (node, ins, board, ctx) => opening(node, board, param(node, 'A', ctx), ins),
    eval(ins, node, ctx) {
      const body = inside(this, ctx, node, ins, 'body')
      return proved(imp(param(node, 'A', ctx), body.formula), without(body.hyps, hypId(node, 'body')))
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
    ...box(['ab']),
    boards: () => [{ name: 'left', assumes: true }, { name: 'right', assumes: true }],
    scope: (node, ins, board, ctx) => {
      const { ab } = ins
      if (!ab) throw fail('先接进一句「…或者…」', 'Wire in an “… or …” first')
      if (ab.formula.op !== '∨') throw need(ctx, SHAPE.or, ab.formula)
      return opening(node, board, board === 'left' ? ab.formula.a : ab.formula.b, ins)
    },
    eval(ins, node, ctx) {
      const l = inside(this, ctx, node, ins, 'left')
      const r = inside(this, ctx, node, ins, 'right')
      if (!same(l.formula, r.formula)) { const [a, b] = [sayIn(ctx, l.formula), sayIn(ctx, r.formula)]; throw fail(`两种情况证出的不一样：${a.zh}；${b.zh}`, `The two cases prove different things: ${a.en}; ${b.en}`) }
      return proved(l.formula, new Map([...ins.ab.hyps, ...without(l.hyps, hypId(node, 'left')), ...without(r.hyps, hypId(node, 'right'))]))
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
    ...box(),
    params: ['x'],
    boards: () => [{ name: 'body', assumes: false }],
    scope: (node, ins) => carried(ins),
    eval(ins, node, ctx) {
      const x = node.params?.x
      if (!x) throw fail('先给新变量起个名字', 'Name the new variable first')
      const body = inside(this, ctx, node, ins, 'body')
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
    ...box(['ex']),
    params: ['x'],
    boards: () => [{ name: 'body', assumes: true }],
    scope: (node, ins, board, ctx) => {
      const e = ins.ex
      if (!e) throw fail('先接进一句「存在 x…」', 'Wire in a “there is an x …” first')
      if (e.formula.op !== '∃') throw need(ctx, SHAPE.ex, e.formula)
      const y = node.params?.x
      if (!y) throw fail('先给见证起个名字', 'Name the witness first')
      return opening(node, board, subst(e.formula.body, e.formula.v, tvar(y)), ins)
    },
    eval(ins, node, ctx) {
      const y = node.params.x
      const body = inside(this, ctx, node, ins, 'body')
      if (freeVars(body.formula).has(y)) throw fail(`结论里不能有见证 ${y}`, `The conclusion may not mention the witness ${y}`)
      const open = without(body.hyps, hypId(node, 'body'))
      for (const h of open.values()) if (freeVars(h).has(y)) throw fail(`${y} 出现在还开着的假设 ${sayIn(ctx, h).zh} 里`, `${y} occurs in the open hypothesis ${sayIn(ctx, h).en}`)
      return proved(body.formula, new Map([...ins.ex.hyps, ...open]))
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
const FIXED = new Set(['premise', 'goal', 'assume', 'out'])
const countSteps = (circuit) => circuit.nodes.reduce((n, node) => n + (FIXED.has(node.type) ? 0 : 1 + Object.values(node.boards ?? {}).reduce((m, b) => m + countSteps(b), 0)), 0)

/* ---------- a board inside a proof, for the editor ---------- */

const EMPTY = { nodes: [], wires: [] }

/**
 * The board at `path` (../../circuit/nested.js) run as the proof runs it, on the level's first test: { values, errors,
 * bind } with what its sources read, or { scopeError } when the box around it cannot open yet (分情况 with no A ∨ B
 * wired in).
 */
export function runAt(level, circuit, path, test = level.tests[0]) {
  const consts = level.consts ?? []
  const parts = rulesOf(level.lemmas)
  const ctx = { consts, notation: level.notation, subst: test.subst }
  let bind = premisesOf(test, consts)
  let board = circuit
  let run = runBoard(board, { parts, bind, ctx })
  for (const { node: id, board: name } of path) {
    const node = board.nodes.find((n) => n.id === id)
    const ins = Object.fromEntries(board.wires.filter((w) => w.to === id && run.values.get(w.from) !== undefined).map((w) => [w.port, run.values.get(w.from)]))
    try {
      bind = { ...bind, ...parts[node.type].scope(node, ins, name, ctx) }
    } catch (e) {
      return { values: new Map(), errors: new Map(), bind, scopeError: e.label ?? BROKEN }
    }
    board = node.boards?.[name] ?? EMPTY
    run = runBoard(board, { parts, bind, ctx })
  }
  return { ...run, bind }
}

/**
 * What the board at `path` reads from outside, as its fixed source cards: the premises, the assumptions of the boxes
 * around it (by hypothesis id), and what its own box brings in (in1 … in3, those wired); `assumes` when its box opens
 * an assumption of its own (the card `assume`).
 */
export function seenAt(level, circuit, path) {
  const parts = rulesOf(level.lemmas)
  const names = Object.keys(level.tests[0].premises ?? {})
  let board = circuit
  let assumes = false
  path.forEach(({ node: id, board: name }, k) => {
    const node = board.nodes.find((n) => n.id === id)
    const spec = parts[node.type].boards(node).find((b) => b.name === name)
    if (k < path.length - 1) { if (spec.assumes) names.push(hypId(node, name)) }
    else {
      names.push(...CARRY.filter((p) => board.wires.some((w) => w.to === id && w.port === p)))
      assumes = spec.assumes
    }
    board = node.boards?.[name] ?? EMPTY
  })
  return { names, assumes }
}
