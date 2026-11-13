import { L, T } from '../../shell/i18n.js'
import { blankCase, judgeCases, sentenceOf, setOut, waysIn } from './iso.js'
import { say } from './notation.js'
import { boardOf, linesOf, problemsOf } from './ruleLines.js'
import { caseCells, DERIVABLE } from './auditCells.js'
import { declarationValues, ruleLines } from './rowValues.js'

export function audit(source, { progress, saved }) {
  const kept = source.carry && progress.solved.includes(source.carry) ? progress.data[source.carry]?.rules : null
  const carried = kept && !problemsOf(source, kept).length ? boardOf(linesOf(kept)) : null
  const level = carried ? { ...source, boards: [{ board: carried }] } : source
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  const report = (work) => judgeCases(level, work, words)
  const empty = setOut(level)
  return {
    level, empty,
    saved: saved?.work?.length === empty.length ? saved : null,
    label: (k) => level.boards[k].label ?? T(`声明 ${k + 1}`, `Declaration ${k + 1}`),
    judge: (k, work) => report(work).judge(k),
    stepsOf: (k, work) => {
      const j = report(work)
      const steps = []
      for (const row of j.rows) {
        const wrong = !row.right ? j.wrong
          : level.want === 'agree' && row.derived[k] !== row.wants ? j.judge(k)
          : level.want === 'expose' && row.derived[k] === row.wants ? j.judge(k) : null
        steps.push(wrong ? { failed: L(wrong) } : {})
        if (wrong) break
      }
      return steps
    },
    rows: (board) => declarationValues(level, waysIn(board).map((way) => ({ binds: way.binds, needs: way.needs.map((need) => sentenceOf(level, need)) }))),
    lines: (board, read) => ruleLines(level, waysIn(board), read),
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
      if (level.want === 'agree') return T('每一条条例的预期都符合需求，这份声明的结果也都和预期相符。')
      if (level.want === 'expose') return T('每一条条例的预期都符合需求，这份声明的结果都和预期不符。')
      const { caught } = report(work)
      return level.boards.length > 1
        ? T(`已找出错误：${caught.map((k, b) => `声明 ${b + 1} 在第 ${k + 1} 条条例上得出错误结论`).join('；')}。`, `Faults found: ${caught.map((k, b) => `declaration ${b + 1} reaches a wrong conclusion on case ${k + 1}`).join('; ')}.`)
        : T(`已找出错误：这份声明在第 ${caught[0] + 1} 条条例上得出错误结论。`, `Fault found: this declaration reaches a wrong conclusion on case ${caught[0] + 1}.`)
    },
    go: T('运行检验条例'),
    done: level.want === 'agree' ? T('结果全部相符') : T('已找出错误'),
    checks: {
      cells: caseCells(level), resultLabel: T('结果', 'Result'), blank: () => blankCase(level), max: 8, addLabel: T('添加条例'),
      formTitle: (k) => T(`第 ${k + 1} 条检验条例`, `Test case ${k + 1}`),
      empty: T('还没有条例。'), fixed: Boolean(level.slots), tip: T('点按一条条例即可修改。'),
    },
  }
}
