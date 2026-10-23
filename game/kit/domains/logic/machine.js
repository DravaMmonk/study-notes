// The machine board (《证明完毕》 chapter 4 on): a circuit whose wires carry formulas or clause sets instead of proved
// judgments. Its sources (`in` cards, one per input the level names) give the test's inputs, its sink `out` is
// checked against what the level wants. A part is a law card, a normal form, resolution or a repeat frame
// (clauses.js); the level's parts come from the course as on every board.
//
//   value   { kind: 'formula', f } | { kind: 'clauses', set }
//   level   { kind: 'machine', want, inputs?: [{ name, label }] (default one, `in`),
//             tests: [{ in: formula text } | { clauses: [clause text] } | { inputs: { name: formula text } }, want?] }
//
// What a level wants of its output (`want`, or a test's own): a formula equivalent to the input with no ¬¬
// ('noDneg'), no → or ↔ ('noArrow'), in NNF ('nnf') or CNF ('cnf'); a clause set holding ⊥ ('refuted'); 'decide':
// ⊥ when the input cannot be satisfied, and otherwise a set closed under resolution without ⊥; and 'entails', for
// inputs `goal` and any others (what is known): ⊥ when the others entail the goal, and otherwise a saturated set.
import { PartError, evaluate } from '../../engine/circuit.js'
import { runBoard, sink, source } from '../../engine/boards.js'
import { framePart } from '../../circuit/frames.js'
import { and, parse } from './formula.js'
import { say } from './notation.js'
import { LAWS, clauseOf, clauseSet, clausesOf, closed, cnf, equivalent, hasArrow, hasDneg, isCnf, isNnf, nnf, refuted, resolveRound, saturate, toEnd } from './clauses.js'

const T = (zh, en) => ({ zh, en })
const fail = (zh, en) => new PartError({ zh, en })
export const formulaValue = (f) => ({ kind: 'formula', f })
export const clausesValue = (set) => ({ kind: 'clauses', set })

const formulaIn = (v) => {
  if (v.kind !== 'formula') throw fail('这里要一句公式，接进来的是一组子句', 'This needs a formula; it got a clause set')
  return v.f
}
const clausesIn = (v) => {
  if (v.kind !== 'clauses') throw fail('这里要一组子句，接进来的是一句公式：先拆成子句', 'This needs a clause set; it got a formula: split it into clauses first')
  return v.set
}
const twoFormulas = (a, b) => [formulaIn(a), formulaIn(b)]
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
    const inside = graph.nodes.filter((n) => n.in === `${node.id}/body`)
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
      if (cur.kind === 'clauses' && refuted(cur.set)) return cur
      const next = step(cur)
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
  dm: law(LAWS.dm),
  dist: law(LAWS.dist),
  neg: { inputs: ['in'], eval: ({ in: v }) => formulaValue({ op: '¬', a: formulaIn(v) }) },
  conj: { inputs: ['a', 'b'], eval: ({ a, b }) => formulaValue(and(...twoFormulas(a, b))) },
  nnf: { inputs: ['in'], eval: ({ in: v }) => formulaValue(nnf(formulaIn(v))) },
  cnf: { inputs: ['in'], eval: ({ in: v }) => formulaValue(cnf(formulaIn(v))) },
  toClauses: {
    inputs: ['in'],
    eval: ({ in: v }) => {
      const set = clausesOf(formulaIn(v))
      if (!set) throw fail('这句还不是合取范式（一串「或」用「与」连起来），拆不成子句', 'This is not in CNF yet (ors joined by ands), so it does not split into clauses')
      return clausesValue(set)
    },
  },
  res: { inputs: ['in'], eval: ({ in: v }) => clausesValue(resolveRound(clausesIn(v))) },
  repeat,
  saturate: { inputs: ['in'], eval: ({ in: v }) => clausesValue(saturate(clausesIn(v))) },
}

/** A test's inputs as values, by name. */
export function inputsOf(test) {
  if (test.clauses) return { in: clausesValue(clauseSet(test.clauses.map((c) => clauseOf(parse(c))))) }
  if (test.inputs) return Object.fromEntries(Object.entries(test.inputs).map(([name, text]) => [name, formulaValue(parse(text))]))
  return { in: formulaValue(parse(test.in)) }
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
  if (out.kind !== 'clauses') return T('结果要一组子句', 'The result must be a clause set')
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
    const run = runBoard(circuit, { parts: MACHINE_PARTS, bind: inputsOf(test), ctx: { graph: circuit } })
    return { ...run, outputs: { out: run.outputs.out } }
  },
  check: (level, test, outputs) => {
    const problem = judge(test.want ?? level.want, test, outputs.out, level.notation)
    return [{ name: 'out', pass: !problem, reason: problem }]
  },
  score: (level, circuit) => ({ steps: circuit.nodes.filter((n) => n.type !== 'in' && n.type !== 'out').length }),
}
