import { reportRuns } from '../../engine/test-run.js'
import { T } from '../../shell/i18n.js'
import { derives, givenText } from './iso.js'

/** Judge the written cases once and record where each declaration's replay stops. */
export function runAudit(level, cases, words) {
  const name = level.declare
  const boards = level.boards.map((b) => b.board)
  const open = (c) => c.goal === '' || c.make === null
  const rows = cases.map((c) => {
    if (open(c)) return { right: false, wants: null, derived: boards.map(() => null) }
    const wants = derives(level, level.solution, c).derived
    return { right: wants === c.make, wants, derived: boards.map((board) => derives(level, board, c).derived) }
  })
  const caught = boards.map((_, b) => rows.findIndex((r) => r.right && r.derived[b] !== r.wants))
  const bad = rows.findIndex((r) => !r.right)
  const goal = (c) => (c.goal ? words(c.goal) : name)
  const may = (yes) => (yes ? T('可推导', 'derivable') : T('不可推导', 'not derivable'))
  // A case whose expectation is fixed: the cells the player fills in are what has to change.
  const reconsider = (k) => {
    const c = cases[k]
    if (c.goal === '') return T(`第 ${k + 1} 条条例还没有填目标。`, `Case ${k + 1} has no goal yet.`)
    if (c.make === null) return T(`第 ${k + 1} 条条例还没有填预期。`, `Case ${k + 1} has no expectation yet.`)
    const at = givenText(c, words)
    if (c.fixed?.includes('make')) return T(`第 ${k + 1} 条条例：按需求，${at.zh}时「${goal(c).zh}」${may(rows[k].wants).zh}，和这一条的预期不同。请改写这一条空着的部分。`, `Case ${k + 1}: according to the requirement, ${at.en}, “${goal(c).en}” is ${may(rows[k].wants).en}, unlike this case’s expectation. Rewrite the part of it left for you.`)
    return T(`第 ${k + 1} 条条例的预期与需求不符。请重新考虑：${at.zh}时，按需求「${goal(c).zh}」是否可推导？`, `The expectation of case ${k + 1} does not agree with the requirement. Reconsider: ${at.en}, is “${goal(c).en}” derivable according to the requirement?`)
  }
  const wrong = !cases.length ? T('还没有条例。请添加一条，写明前提、目标，以及目标是否应当可推导。')
    : bad >= 0 ? reconsider(bad)
    : null
  const mismatch = (board, agrees) => rows.findIndex((r) => (r.derived[board] === r.wants) === agrees)
  const atRow = (row, why) => ({ at: { row }, why })
  const failure = (board) => {
    if (wrong) return bad < 0 ? { why: wrong } : atRow(bad, wrong)
    if (level.want === 'agree') {
      const k = mismatch(board, false)
      return k < 0 ? null : atRow(k, T(`第 ${k + 1} 条条例上，这份声明的结果与预期不符。`, `On case ${k + 1}, this declaration’s result disagrees with the expectation.`))
    }
    if (level.want === 'expose') {
      const k = mismatch(board, true)
      return k < 0 ? null : atRow(k, T(`第 ${k + 1} 条条例上，这份声明的结果与预期相符，没有暴露它的错误。`, `On case ${k + 1}, this declaration’s result agrees with the expectation and does not reveal its fault.`))
    }
    return caught[board] >= 0 ? null : { why: T('各条条例的预期都正确，但这份声明在每一条上都得出了正确结论，还没有暴露它的错误。') }
  }
  const runs = boards.map((_, board) => {
    const fail = failure(board)
    const stop = fail?.at?.row
    const steps = rows.slice(0, stop === undefined ? rows.length : stop + 1)
      .map((_, row) => row === stop ? { failed: fail.why } : {})
    return { fail, pass: !fail, steps }
  })
  return { ...reportRuns(runs), rows, caught }
}

/** A blank audit case or the editable cases set out by a level. */
export const blankCase = (level) => ({ given: [], goal: level.caseGoal ?? '', make: level.caseMake ?? null })
export const setOut = (level) => Array.isArray(level.slots)
  ? level.slots.map((c) => ({
    given: c.fixed.includes('given') ? c.given : c.keep ?? [],
    ...(c.keep ? { keep: c.keep } : {}),
    goal: c.fixed.includes('goal') ? c.goal : '',
    make: c.fixed.includes('make') ? c.make : null,
    fixed: c.fixed,
  }))
  : Array.from({ length: level.slots }, () => blankCase(level))
