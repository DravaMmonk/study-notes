// A machine level (《证明完毕》 chapter 8 on, ../machine.js) as the kernel's circuit screen plays it
// (../../../shell/CircuitScreen.jsx): its inputs down the left, the result on the right, the machine's parts (a game's
// parts.json), the rule parts of its rule books (registered by the course) and the parts the player built (packed
// parts running the boards that built them). A run goes through every test step by step, each card computing a step;
// the results show the test's inputs, what it wants and what reaches the result. Values (equations, proof states,
// clause sets, rules) read as lines of text.
import { L, T, tr } from '../../../shell/i18n.js'
import { fn, tvar } from '../formula.js'
import { say } from '../notation.js'
import { withPreset } from '../../../circuit/model.js'
import { MACHINE_TESTS, inputsOf, inputsOfLevel, parseGoal, ruleWritten } from '../machine.js'
import { constructorsOf } from '../datatype.js'
import { certificate, clauseFormula, refuted } from '../resolution.js'
import { elimOf, genRuleText } from '../elimgen.js'
import { presetFor } from '../course.js'

const textOf = (task) => (f) => L(say(f, task.notation))
// A side of an equation (a sentence, a thing, or what a pattern's letter stands for), an equation and a goal, written
// in the level's words: ⋀ for the variables bound around an equation and the things a goal has fixed.
const sideOf = (x, text) => ('t' in x ? text({ op: 'atom', pred: '=', args: [x, x] }).split(' = ')[0] : x.op === 'lam' ? `fun ${x.params.join(' ')} => ${text(x.body)}` : text(x))
const eqText = (e, text) => `${e.bound.length ? `⋀${e.bound.join(' ')}. ` : ''}${sideOf(e.s, text)} ≐ ${sideOf(e.t, text)}`
const goalText = (g, text) => `${g.fixes?.length ? `⋀${g.fixes.join(' ')}. ` : ''}${g.hyps.length ? `${g.hyps.map(text).join(tr('；'))} ⊢ ` : ''}${text(g.goal)}`
// A generator value in one line: a value that takes things first reads as a rule does, ⋀x. in front.
const genValueText = (v, text) => (v.kind === 'sentence' ? text(v.f) : v.kind === 'rule' ? genRuleText(v.rule, text) : v.kind === 'any' ? `⋀${v.vars.join(' ')}. ${genValueText(v.body, text)}` : v.items.map((x) => genValueText(x, text)).join(tr('；')))
const lines = (head, list) => [...head.filter(Boolean), ...list].join('\n')

/**
 * A value in words, a line each: a sentence, a rule, a list; the rules a rule part gives; a proof state's goals (or that
 * it is proved, or that the step failed, and why); equations; a clause set, once ⊥ is in only the clauses ⊥ comes from.
 */
function show(v, { task }) {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'string') return v
  const text = textOf(task)
  if (v.kind === 'sentence' || v.kind === 'rule' || v.kind === 'any') return genValueText(v, text)
  if (v.kind === 'list') return lines([], v.items.map((x, k) => `${k + 1}. ${genValueText(x, text)}`))
  if (v.kind === 'rules') return lines([], v.entries.map((e, k) => `${k + 1}. ${ruleWritten(e, text)}`))
  if (v.kind === 'state') {
    const others = v.more?.length ?? 0
    return lines([
      v.error && `${tr('这一步失败', 'Step failed')}：${L(v.error)}`,
      !v.goals.length && tr('证明完毕'),
      others > 0 && tr(`第 1 种结果，共 ${others + 1} 种`, `result 1 of ${others + 1}`),
    ], v.goals.map((g) => goalText(g, text)))
  }
  if (v.kind === 'eqs') return lines([v.fail && `${tr('合一失败')}：${L(v.fail)}`, !v.eqs.length && tr('没有等式了')], v.eqs.map((e) => eqText(e, text)))
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
  if (test.elim) return `${tr('消去规则 ')}${genRuleText(elimOf(test), text)}`
  return L(WANT[test.want ?? task.want])
}

/** Every test run step by step: its trace, its values, and why the result is not what it wants, if it is not. */
const runLevel = (task, circuit) => ({
  runs: task.tests.map((test) => {
    const { trace, run } = MACHINE_TESTS.trace(task, circuit, test)
    const [check] = MACHINE_TESTS.check(task, test, run.outputs)
    return { ...run, trace, ...(check.pass ? {} : { fail: { why: check.reason } }) }
  }),
})

/** What the results show of a test: the types and definitions it reads, its inputs, what it wants, the result. */
const entries = ({ task, test, run }) => {
  if (!test) return []
  const text = textOf(task)
  const labels = new Map(inputsOfLevel(task).map((i) => [i.name, i.label]))
  const thing = (c) => text({ op: 'atom', pred: '=', args: [fn(c.f, c.args.map(tvar)), fn(c.f, c.args.map(tvar))] }).split(' = ')[0]
  return [
    ...(task.datatypes ? [{ of: 'types', label: T('类型'), shape: 'scalar', given: Object.entries(task.datatypes).map(([type, d]) => `${type} = ${constructorsOf(d).map(thing).join(' | ')}`).join(tr('；')) }] : []),
    ...Object.entries(inputsOf(test, task)).map(([name, v]) => ({ of: name, label: labels.get(name) ?? T('输入', 'Input'), shape: 'scalar', given: v })),
    { of: 'want', label: T('要', 'Want'), shape: 'scalar', given: wantOf(task, test) },
    { of: 'out', label: T('结果', 'Result'), shape: 'scalar', got: run?.outputs?.out },
  ]
}

export const machineScreen = {
  course: (game) => game.logic.machineBoards,
  play: { runLevel, show, entries },
  context: (task, test) => ({ task, text: textOf(task, test) }),
  // A preset (a level's locked cards) stays on the board whatever is saved.
  ready: (board, _held, task) => withPreset(board, presetFor(task)),
  score: (task, circuit) => MACHINE_TESTS.score(task, circuit),
  readouts: (task, circuit) => [{ value: MACHINE_TESTS.score(task, circuit).steps, label: T('元件', 'Parts') }, task.budget !== undefined && { value: task.budget, label: T('最多') }],
  says: { go: T('运行全部测试'), done: T('全部通过', 'All passed') },
  log: true,
  canvas: { height: 150, emptyNote: T('从上方元件栏选择元件放到板上，从「输入」连到「结果」。') },
}
