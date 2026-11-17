import { sameJson } from 'kernel'
import { reportRuns } from 'kernel'
import { T } from 'kernel'
import { derives, givenText } from './iso.js'

/** Judge the written cases once and record where each declaration's replay stops. */
export function runAudit(level, cases, words) {
  const name = level.declare
  const boards = level.boards.map((b) => b.rules)
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
    if (level.want === 'logic:want-agree') {
      const k = mismatch(board, false)
      return k < 0 ? null : atRow(k, T(`第 ${k + 1} 条条例上，这份声明的结果与预期不符。`, `On case ${k + 1}, this declaration’s result disagrees with the expectation.`))
    }
    if (level.want === 'logic:want-expose') {
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

export const AUDIT_CASE_LIMIT = 8

function openCase(level, slot) {
  const fixed = slot?.fixed ?? []
  const goal = level.caseGoal ?? (fixed.includes('goal') ? slot.goal : '')
  return {
    given: fixed.includes('given') ? slot.given ?? [] : slot?.keep ?? [],
    goal,
    make: fixed.includes('make') ? slot.make ?? null : null,
    fixed: level.caseGoal !== undefined && !fixed.includes('goal') ? [...fixed, 'goal'] : fixed,
    ...(slot?.keep ? { keep: slot.keep } : {}),
  }
}

/** A blank audit case or the editable cases set out by a level. */
export const blankCase = (level) => openCase(level)
const setOut = (level) => Array.isArray(level.slots)
  ? level.slots.map((slot) => openCase(level, slot))
  : Array.from({ length: level.slots }, () => blankCase(level))

/** Keep only editable values from a save. The task supplies the locks and required premises. */
export function restoreAuditCases(level, saved) {
  const slots = setOut(level)
  if (!Array.isArray(saved)) return slots
  if (level.slots === undefined ? saved.length > AUDIT_CASE_LIMIT : saved.length !== slots.length) return slots
  return saved.map((row, k) => {
    const slot = slots[k] ?? blankCase(level)
    if (!row || !Array.isArray(row.given)) return slot
    return {
      ...slot,
      given: slot.fixed.includes('given') ? slot.given : [...new Set([...(slot.keep ?? []), ...row.given])],
      goal: slot.fixed.includes('goal') ? slot.goal : row.goal,
      make: !slot.fixed.includes('make') && typeof row.make === 'boolean' ? row.make : slot.make,
    }
  })
}

/** Author cases must be expressible in the same form as a player's cases. */
export function auditCaseProblems(level, cases) {
  const slots = setOut(level)
  const problems = []
  if (level.slots !== undefined && cases.length !== slots.length) problems.push(`the reference answer has ${cases.length} cases for ${slots.length} set out`)
  if (level.slots === undefined && cases.length > AUDIT_CASE_LIMIT) problems.push(`the reference answer has more than ${AUDIT_CASE_LIMIT} cases`)
  if (slots.some((slot, k) => (slot.keep ?? []).some((s) => !cases[k]?.given.includes(s)))) problems.push('a reference case drops a premise its case keeps')
  const value = (row, cell) => cell === 'goal' ? row?.goal ?? level.target : row?.[cell]
  if (slots.some((slot, k) => slot.fixed.some((cell) => (cell !== 'goal' || level.caseGoal === undefined)
    && !sameJson(value(slot, cell), value(cases[k], cell))))) problems.push('a reference case changes a cell its case fixes')
  if (level.caseGoal !== undefined && cases.some((row) => value(row, 'goal') !== level.caseGoal)) problems.push('a reference case breaks the goal the level fixes')
  return problems
}
