// The elimination-rule generator (《证明完毕》 chapter 3): a machine board whose wires carry rules themselves. Its inputs
// are a declaration, the sentence it declares (`it`, its letters as metavariables) and its introduction rules
// (`ways`); its result must be the declaration's elimination rule. The player builds the generator from parts that take
// rules apart and put them together, the step of Lean's kernel that makes a recursor from an inductive type's
// constructors (mk_rec_infos): every introduction rule, its conclusion put as any sentence ?R, is a case, and having
// the declared sentence and every case gives ?R:
//
//   ⟦?A ∧ ?B; ⟦?A; ?B⟧ ⟹ ?R⟧ ⟹ ?R      one way in, needing two
//   ⟦?A ∨ ?B; ⟦?A⟧ ⟹ ?R; ⟦?B⟧ ⟹ ?R⟧ ⟹ ?R      two ways in
//   ⟦⊥⟧ ⟹ ?R      no way in at all
//
//   value   { kind: 'sentence', f } | { kind: 'rule', rule } | { kind: 'list', items: [value] }
//   rule    { fixes: [variable], premises: [premise], conclusion } (schematic.js premises; a way that takes a thing,
//           ⋀x. ⟦?P(x)⟧ ⟹ ∃y. ?P(y), has it in `fixes`)
//   test    { it: sentence text, ways: [rule text], elim: [premise text] }   the elimination rule's premises; it
//           concludes ?R. A level with `single` hands its one way in as a rule, not a list.
import { PartError } from '../../engine/circuit.js'
import { meta } from './formula.js'
import { parseS, premiseOf, ruleText } from './schematic.js'

const T = (zh, en) => ({ zh, en })
const fail = (zh, en) => new PartError({ zh, en })

export const sentenceValue = (f) => ({ kind: 'sentence', f })
export const ruleValue = (rule) => ({ kind: 'rule', rule })
export const listValue = (items) => ({ kind: 'list', items })
/** Any sentence: the conclusion of an elimination rule. */
export const ANY = '?R'

/** A rule as written, ⋀x. ⟦A; B⟧ ⟹ C, as a value's rule. */
export function readRule(text) {
  const p = premiseOf(text)
  return { fixes: p.fixes, premises: p.hyps.map((show) => ({ fixes: [], hyps: [], show })), conclusion: p.show }
}
/** A rule written out, with the things it takes in front. */
export const genRuleText = (rule, say) => `${rule.fixes?.length ? `⋀${rule.fixes.join(' ')}. ` : ''}${ruleText(rule, say)}`

/** A test's inputs: the declared sentence, and its ways in (one rule, on a level with `single`). */
export function elimInputs(test, level) {
  const ways = test.ways.map((w) => ruleValue(readRule(w)))
  return { it: sentenceValue(parseS(test.it)), ways: level.single ? ways[0] : listValue(ways) }
}
/** The elimination rule a test wants. */
export const elimOf = (test) => ({ fixes: [], premises: test.elim.map(premiseOf), conclusion: meta(ANY) })

const count = (v) => (v.kind === 'list' ? T(`一串 ${v.items.length} 样`, `a list of ${v.items.length}`) : v.kind === 'rule' ? T('一条规则', 'a rule') : T('一句话', 'a sentence'))
const want = (v, kind, what) => {
  if (v?.kind !== kind) throw fail(`这里要${what.zh}，接进来的是${count(v).zh}`, `This needs ${what.en}; it got ${count(v).en}`)
  return v
}
const A_RULE = T('一条规则', 'a rule')
const A_SENTENCE = T('一句话', 'a sentence')
// A value as a premise of a rule: a sentence as it is; a rule, ⋀x. ⟦A; B⟧ ⟹ C, as a premise with assumptions of its own.
function premiseOfValue(v) {
  if (v.kind === 'sentence') return { fixes: [], hyps: [], show: v.f }
  if (v.kind === 'rule') {
    if (v.rule.premises.some((p) => p.hyps.length || p.fixes.length)) throw fail('当前提的规则，自己的前提只能是句子', 'A rule taken as a premise may have only sentences as its premises')
    return { fixes: v.rule.fixes ?? [], hyps: v.rule.premises.map((p) => p.show), show: v.rule.conclusion }
  }
  throw fail('前提要一串句子或规则，这里有一串套着一串', 'Premises are sentences or rules; here is a list inside a list')
}

/** The generator's parts that take rules apart and put them together (its frame, 每条, is machine.js's `eachOf`). */
export const GEN_PARTS = {
  // Any sentence ?R.
  anyR: { inputs: [], eval: () => sentenceValue(meta(ANY)) },
  // A rule with its conclusion put as the sentence wired in; what it takes and needs stay.
  swapConcl: {
    inputs: ['rule', 'to'],
    eval: ({ rule, to }) => ruleValue({ ...want(rule, 'rule', A_RULE).rule, conclusion: want(to, 'sentence', A_SENTENCE).f }),
  },
  // A thing put first in a list; with no list behind it, the two of them as one.
  consFront: {
    inputs: ['first', 'rest'],
    eval: ({ first, rest }) => listValue([first, ...(rest.kind === 'list' ? rest.items : [rest])]),
  },
  // A rule from its premises (a list, or one thing) and its conclusion.
  mkRule: {
    inputs: ['premises', 'conclusion'],
    eval: ({ premises, conclusion }) => ruleValue({ fixes: [], premises: (premises.kind === 'list' ? premises.items : [premises]).map(premiseOfValue), conclusion: want(conclusion, 'sentence', A_SENTENCE).f }),
  },
}

// A rule with its ?-letters named in the order they appear, so two rules compare whatever names they use.
const canonical = (rule) => {
  const names = new Map()
  return JSON.stringify([rule.fixes ?? [], rule.premises, rule.conclusion]).replace(/"name":"(\?[^"]+)"/g, (_, n) => {
    if (!names.has(n)) names.set(n, `?${names.size}`)
    return `"name":"${names.get(n)}"`
  })
}
/** Is the result the elimination rule the test wants? '' or why not. */
export function judgeElim(test, out) {
  if (!out) return T('还没有东西接到「结果」', 'Nothing reaches the result yet')
  if (out.kind !== 'rule') return T(`结果要一条规则，接进来的是${count(out).zh}`, `The result must be a rule; it got ${count(out).en}`)
  return canonical(out.rule) === canonical(elimOf(test)) ? '' : T('生成的规则和这份声明的消去规则不一样', 'The rule made is not this declaration’s elimination rule')
}
