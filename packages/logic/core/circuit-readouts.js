// Case inputs and values as the circuit screen and text play show them.
import { L, T, tr } from 'kernel'
import { parse } from './formula.js'
import { inputsOf, inputsOfLevel, parseGoal, ruleWritten } from './machine.js'
import { say, sayTerm } from './notation.js'
import { printTerm } from './pterm.js'
import { typeText } from './datatype.js'
import { certificate, clauseFormula, refuted } from './resolution.js'
import { elimOf } from './elimgen.js'
import { equationText, ruleText, sideText, withBinders } from './schematic.js'

// The words a test reads in: its last test (the bare letters) in the letters' own words.
const wordsOf = (task, test) => (test?.symbolic ? { ...task.notation, words: task.symbolicWords ?? null, propertyWords: false } : task.notation)
export const proofTextOf = (task, test) => (f) => L(say(f, wordsOf(task, test)))

/** A value in words: a formula with its proof term when the task shows proof terms. */
function showProof(v, { task, test }) {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'string') return v
  const f = say(v.formula ?? v, wordsOf(task, test))
  if (!task.terms || !v.term) return f
  const term = printTerm(v.term)
  return T(`${f.zh} · ${term}`, `${f.en} · ${term}`)
}

/** A test's premises and the goal for its output card. */
const proofEntries = ({ task, test, run }) => {
  const consts = task.consts ?? []
  return [
    ...Object.entries(test?.premises ?? {}).map(([name, text], k, all) => ({ of: name, label: all.length > 1 ? T(`已知 ${k + 1}`, `Given ${k + 1}`) : T('已知', 'Given'), shape: 'scalar', given: parse(text, { consts }) })),
    ...(test ? [{ of: 'goal', label: T('目标', 'Goal'), shape: 'scalar', want: parse(test.goal, { consts }), got: run?.outputs?.goal?.formula }] : []),
  ]
}

export const machineTextOf = (task) => (f) => L(say(f, task.notation))
export const machineTermOf = (task) => (t) => L(sayTerm(t, task.notation))
const goalText = (g, text) => withBinders(g.fixes, g.hyps.length ? `${g.hyps.map(text).join(tr('；'))} ⊢ ${text(g.goal)}` : text(g.goal))
// A generator value in one line: a value that takes things first reads as a rule does, ⋀x. in front.
const genValueText = (v, text) => (v.kind === 'sentence' ? text(v.f) : v.kind === 'rule' ? ruleText(v.rule, text) : v.kind === 'any' ? withBinders(v.vars, genValueText(v.body, text)) : v.items.map((x) => genValueText(x, text)).join(tr('；')))
const lines = (head, list) => [...head.filter(Boolean), ...list].join('\n')

/**
 * A value in words, a line each: a sentence, a rule, a list; the rules a rule part gives; a proof state's goals (or that
 * it is proved, or that the step failed, and why); equations; a clause set, once ⊥ is in only the clauses ⊥ comes from.
 */
function showMachine(v, { task }) {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'string') return v
  const text = machineTextOf(task)
  const term = machineTermOf(task)
  if (v.kind === 'sentence' || v.kind === 'rule' || v.kind === 'any') return genValueText(v, text)
  if (v.kind === 'list') return lines([], v.items.map((x, k) => `${k + 1}. ${genValueText(x, text)}`))
  if (v.kind === 'rules') return lines([], v.entries.map((e, k) => `${k + 1}. ${ruleWritten(e, text, term)}`))
  if (v.kind === 'state') {
    const others = v.more?.length ?? 0
    return lines([
      v.error && `${tr('这一步失败', 'Step failed')}：${L(v.error)}`,
      !v.goals.length && tr('证明完毕'),
      others > 0 && tr(`第 1 种结果，共 ${others + 1} 种`, `result 1 of ${others + 1}`),
    ], v.goals.map((g) => goalText(g, text)))
  }
  if (v.kind === 'eqs') return lines([v.fail && `${tr('合一失败')}：${L(v.fail)}`, !v.eqs.length && tr('没有等式了')], v.eqs.map((e) => equationText(e, (side) => sideText(side, text, term))))
  const shown = certificate(v.set) ?? v.set.map((_, i) => i)
  return lines([refuted(v.set) && tr('推出了空子句 ⊥'), v.endless && tr('仍在增加', 'still growing')], shown.map((i) => `${i + 1}. ${text(clauseFormula(v.set[i]))}${v.set[i].from ? ` ← ${v.set[i].from.map((k) => k + 1).join(tr('、'))}` : ''}`))
}

const WANT = {
  'logic:want-elim': T('这份声明的消去规则'),
  'logic:want-clauses': T('拆成的子句'),
  'logic:want-refuted': T('推出空子句 ⊥'),
  'logic:want-decide': T('能推出 ⊥ 时推出 ⊥；否则饱和至不再产生新子句'),
  'logic:want-unify': T('解完的等式（能合一时），或者「失败」（不能时）'),
  'logic:want-answers': T('找出所有答案'),
  'logic:want-fails': T('证不出时停止，并报告证不出'),
  'logic:want-proved': T('证明完毕'),
}
/** What a test wants of the result, in words: the results a step makes, the elimination rule, or the level's want. */
function wantOf(task, test) {
  const text = machineTextOf(task)
  if (test.becomes) return test.becomes.length ? `${tr('变成 ')}${test.becomes.map((r) => (r.length ? r.map((g) => goalText(parseGoal(g), text)).join(' | ') : tr('证完'))).join(tr('，或者 '))}` : tr('这一步失败', 'the step to fail')
  if (test.elim) return `${tr('消去规则 ')}${ruleText(elimOf(test), text)}`
  return L(WANT[test.want ?? task.want])
}

/** What the results show of a test: the types and definitions it reads, its inputs, what it wants, the result. */
const machineEntries = ({ task, test, run }) => {
  if (!test) return []
  const term = machineTermOf(task)
  const labels = new Map(inputsOfLevel(task).map((i) => [i.name, i.label]))
  return [
    ...(task.datatypes ? [{ of: 'types', label: T('类型'), shape: 'scalar', given: Object.entries(task.datatypes).map(([type, d]) => typeText(type, d, term)).join(tr('；')) }] : []),
    ...Object.entries(inputsOf(test, task)).map(([name, v]) => ({ of: name, label: labels.get(name) ?? T('输入', 'Input'), shape: 'scalar', given: v })),
    { of: 'want', label: T('要', 'Want'), shape: 'scalar', given: wantOf(task, test) },
    { of: 'out', label: T('结果', 'Result'), shape: 'scalar', got: run?.outputs?.out },
  ]
}

export const proofReadout = { show: showProof, entries: proofEntries }
export const machineReadout = { show: showMachine, entries: machineEntries }
