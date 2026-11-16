import { L, T } from '../../shell/i18n.js'
import { passedWork } from '../../shell/progress.js'
import { AUDIT_CASE_LIMIT, blankCase, restoreAuditCases, runAudit } from './audit-cases.js'
import { sentenceOf } from './iso.js'
import { say } from './notation.js'
import { checkDeclaration, linesOf, readRuleRows } from './ruleLines.js'
import { caseCells, DERIVABLE } from './auditCells.js'
import { declarationValues, ruleLines } from './rowValues.js'

export function audit(source, { game, progress, saved }) {
  const parent = game.byId[source.carry]?.source.tasks.findLast((task) => task.kind === 'logic:iso' && task.play !== 'logic:audit')
  const kept = passedWork(progress, parent)?.rules
  const carried = kept && !checkDeclaration(parent)(kept) ? linesOf(kept) : null
  const level = carried ? { ...source, boards: [{ rules: carried }] } : source
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  let lastWork, lastReport
  const report = (work) => {
    if (work !== lastWork) {
      lastReport = runAudit(level, work, words)
      lastWork = work
    }
    return lastReport
  }
  return {
    initial: restoreAuditCases(level, saved?.work),
    tabs: level.boards.map(({ label }, k) => ({ label: label ?? T(`声明 ${k + 1}`, `Declaration ${k + 1}`) })),
    judge: (k, work) => report(work).runs[k].fail?.why,
    stepsOf: (k, work) => report(work).runs[k].steps.map((step) => step.failed ? { failed: L(step.failed) } : step),
    rows: (k) => declarationValues(level, readRuleRows(level, level.boards[k].rules)),
    lines: (k, read) => ruleLines(level, level.boards[k].rules, read),
    score: (work) => ({ steps: work.length, unit: 'cases' }),
    result: (work, board, reached) => {
      const { rows } = report(work)
      return (k) => {
        const whole = ['given', 'goal', 'make'].every((cell) => work[k]?.fixed?.includes(cell))
        const r = rows[k]
        if (!(k < reached || whole) || !r || r.derived[board] === null) return null
        const derived = r.derived[board]
        return { text: L(DERIVABLE.find((option) => option.value === derived).label), tone: r.right && derived !== r.wants ? 'wrong' : 'right' }
      }
    },
    passed: (work) => {
      if (level.want === 'logic:want-agree') return T('每一条条例的预期都符合需求，这份声明的结果也都和预期相符。')
      if (level.want === 'logic:want-expose') return T('每一条条例的预期都符合需求，这份声明的结果都和预期不符。')
      const { caught } = report(work)
      return level.boards.length > 1
        ? T(`已找出错误：${caught.map((k, b) => `声明 ${b + 1} 在第 ${k + 1} 条条例上得出错误结论`).join('；')}。`, `Faults found: ${caught.map((k, b) => `declaration ${b + 1} reaches a wrong conclusion on case ${k + 1}`).join('; ')}.`)
        : T(`已找出错误：这份声明在第 ${caught[0] + 1} 条条例上得出错误结论。`, `Fault found: this declaration reaches a wrong conclusion on case ${caught[0] + 1}.`)
    },
    go: T('运行检验条例'),
    done: level.want === 'logic:want-agree' ? T('结果全部相符') : T('已找出错误'),
    checks: {
      cells: caseCells(level), resultLabel: T('结果', 'Result'), blank: () => blankCase(level), max: AUDIT_CASE_LIMIT, addLabel: T('添加条例'),
      formTitle: (k) => T(`第 ${k + 1} 条检验条例`, `Test case ${k + 1}`),
      empty: T('还没有条例。'), fixed: Boolean(level.slots), tip: T('点按一条条例即可修改。'),
    },
  }
}
