// A proved judgment, and what every rule needs to make one (proof.js, declare.js):
//
//   { formula, hyps: Map(hypothesis id → formula) }   the formula, proved from the hypotheses still open
//
// with the errors a rule throws when what reaches it does not fit, in the level's notation.
import { PartError } from '../../engine/circuit.js'
import { BOT, and, imp, parse, replaceAtoms } from './formula.js'
import { say } from './notation.js'

/** A judgment: `formula` from `hyps`. */
export const proved = (formula, hyps = new Map()) => ({ formula, hyps })
export const union = (...js) => new Map(js.flatMap((j) => [...j.hyps]))
// What a port needed (a formula, or a SHAPE) and the formula that reached it, written in the level's notation.
export const need = (ctx, what, got) => {
  const [w, g] = [what.op ? say(what, ctx.notation) : what, say(got, ctx.notation)]
  return new PartError({ zh: `这里要 ${w.zh}，接进来的是 ${g.zh}`, en: `This needs ${w.en}; it got ${g.en}` })
}
export const T = (zh, en) => ({ zh, en })
export const SHAPE = {
  imp: T('一句「如果…那么…」', 'an “if … then …”'),
  and: T('一句「…并且…」', 'an “… and …”'),
  or: T('一句「…或者…」', 'an “… or …”'),
  bot: T('矛盾 ⊥', 'a contradiction ⊥'),
  nn: T('一句「并非并非…」', 'a “not not …”'),
  all: T('一句「对所有 x…」', 'a “for all x …”'),
  ex: T('一句「存在 x…」', 'a “there is an x …”'),
  eq: T('一个等式', 'an equation'),
  fits: T('一句这块元件接得上的话', 'a sentence this part accepts'),
}
export const sayIn = (ctx, f) => say(f, ctx.notation)
export const fail = (zh, en) => new PartError({ zh, en })
// A formula chosen on a card. Cards hold the level's schema (its letters), and a test case fills the letters in
// (ctx.subst: A := it rains), so one proof runs on every case; the level's constants come through ctx.consts.
export const param = (node, key, ctx = {}) => {
  const text = node.params?.[key]
  if (typeof text !== 'string' || !text.trim()) throw fail('先在卡片上选好句子', 'Choose the sentences on the card first')
  return replaceAtoms(parse(text, { consts: ctx.consts ?? [] }), ctx.subst ?? {})
}
// ¬A is A → ⊥ to the rules, and A ↔ B is (A → B) ∧ (B → A).
export const asImp = (f) => (f.op === '¬' ? imp(f.a, BOT) : f)
export const asAnd = (f) => (f.op === '↔' ? and(imp(f.a, f.b), imp(f.b, f.a)) : f)
export const without = (hyps, id) => new Map([...hyps].filter(([k]) => k !== id))

/** The hypothesis id of the assumption a box's region opens. */
export const hypId = (node, region) => `${node.id}/${region}`
export const assumed = (node, region, formula) => proved(formula, new Map([[hypId(node, region), formula]]))
