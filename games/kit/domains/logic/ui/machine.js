// A machine level (《证明完毕》 chapter 8 on, ../machine.js) as the kernel's circuit screen plays it
// (../../../shell/CircuitScreen.jsx): its inputs down the left, the result on the right, the machine's parts (a game's
// pieces.json), the rule parts of its rule books (registered by the course) and the parts the player built (packed
// parts running the boards that built them). A run goes through every test step by step, each card computing a step;
// the results show the test's inputs, what it wants and what reaches the result. Values (equations, proof states,
// clause sets, rules) read as lines of text.
import { L, T, tr } from '../../../shell/i18n.js'
import { say, sayTerm } from '../notation.js'
import { withPreset } from '../../../circuit/model.js'
import { inputsOf, inputsOfLevel, parseGoal, ruleWritten, runMachine } from '../machine.js'
import { typeText } from '../datatype.js'
import { certificate, clauseFormula, refuted } from '../resolution.js'
import { elimOf } from '../elimgen.js'
import { equationText, ruleText, sideText, withBinders } from '../schematic.js'
import { presetFor } from '../course.js'

const textOf = (task) => (f) => L(say(f, task.notation))
const termOf = (task) => (t) => L(sayTerm(t, task.notation))
const goalText = (g, text) => withBinders(g.fixes, g.hyps.length ? `${g.hyps.map(text).join(tr('；'))} ⊢ ${text(g.goal)}` : text(g.goal))
// A generator value in one line: a value that takes things first reads as a rule does, ⋀x. in front.
const genValueText = (v, text) => (v.kind === 'sentence' ? text(v.f) : v.kind === 'rule' ? ruleText(v.rule, text) : v.kind === 'any' ? withBinders(v.vars, genValueText(v.body, text)) : v.items.map((x) => genValueText(x, text)).join(tr('；')))
const lines = (head, list) => [...head.filter(Boolean), ...list].join('\n')

/**
 * A value in words, a line each: a sentence, a rule, a list; the rules a rule part gives; a proof state's goals (or that
 * it is proved, or that the step failed, and why); equations; a clause set, once ⊥ is in only the clauses ⊥ comes from.
 */
function show(v, { task }) {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'string') return v
  const text = textOf(task)
  const term = termOf(task)
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
  elim: T('这份声明的消去规则'),
  clauses: T('拆成的子句'),
  refuted: T('推出空子句 ⊥'),
  decide: T('能推出 ⊥ 时推出 ⊥；否则饱和至不再产生新子句'),
  unify: T('解完的等式（能合一时），或者「失败」（不能时）'),
  answers: T('找出所有答案'),
  fails: T('证不出时停止，并报告证不出'),
  proved: T('证明完毕'),
}
/** What a test wants of the result, in words: the results a step makes, the elimination rule, or the level's want. */
function wantOf(task, test) {
  const text = textOf(task)
  if (test.becomes) return test.becomes.length ? `${tr('变成 ')}${test.becomes.map((r) => (r.length ? r.map((g) => goalText(parseGoal(g), text)).join(' | ') : tr('证完'))).join(tr('，或者 '))}` : tr('这一步失败', 'the step to fail')
  if (test.elim) return `${tr('消去规则 ')}${ruleText(elimOf(test), text)}`
  return L(WANT[test.want ?? task.want])
}

const runLevel = (task, board, _parts, { traced = true } = {}) => runMachine(task, board, { traced })

/** What the results show of a test: the types and definitions it reads, its inputs, what it wants, the result. */
const entries = ({ task, test, run }) => {
  if (!test) return []
  const term = termOf(task)
  const labels = new Map(inputsOfLevel(task).map((i) => [i.name, i.label]))
  return [
    ...(task.datatypes ? [{ of: 'types', label: T('类型'), shape: 'scalar', given: Object.entries(task.datatypes).map(([type, d]) => typeText(type, d, term)).join(tr('；')) }] : []),
    ...Object.entries(inputsOf(test, task)).map(([name, v]) => ({ of: name, label: labels.get(name) ?? T('输入', 'Input'), shape: 'scalar', given: v })),
    { of: 'want', label: T('要', 'Want'), shape: 'scalar', given: wantOf(task, test) },
    { of: 'out', label: T('结果', 'Result'), shape: 'scalar', got: run?.outputs?.out },
  ]
}

export const machineScreen = {
  course: (game) => game.logic.machineBoards,
  play: { runLevel, show, entries },
  context: (task) => ({ task, text: textOf(task), term: termOf(task) }),
  // A preset (a level's locked cards) stays on the board whatever is saved.
  ready: (board, _held, task) => withPreset(board, presetFor(task)),
  readouts: (task, _circuit, { score }) => [{ value: score.steps, label: T('元件', 'Parts') }, task.budget !== undefined && { value: task.budget, label: T('最多') }],
  says: { go: T('运行全部测试'), done: T('全部通过', 'All passed') },
  log: true,
  canvas: { height: 150, emptyNote: T('从上方元件栏选择元件放到板上，从「输入」连到「结果」。') },
}
