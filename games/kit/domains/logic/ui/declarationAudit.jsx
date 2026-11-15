import { L, tr, T } from '../../../shell/i18n.js'
import NamedLines from '../../../shell/NamedLines.jsx'
import { say } from '../notation.js'
import { sentenceOf, waysIn } from '../iso.js'
import { checkCasesOf } from '../playJudges.js'
import { boardOf, linesOf, problemsOf } from '../ruleLines.js'
import { ruleLines } from './rows.jsx'
import CaseTable, { setOut } from './IsoCases.jsx'
import RuleTable, { rulesOf } from './RuleTable.jsx'

const wordsOf = (level) => (sentence) => say(sentenceOf(level, sentence), level.notation)

function prepare(level, progress) {
  const kept = level.carry && progress?.solved?.includes(level.carry) ? progress.data?.[level.carry]?.rules : null
  const carried = kept && !problemsOf(level, kept).length ? boardOf(linesOf(kept)) : null
  return carried ? { ...level, boards: [{ board: carried }] } : level
}

function steps(level, judged, board) {
  const stop = (k) => {
    if (!judged.rows[k].right) return judged.wrong
    if (level.want === 'agree' && judged.rows[k].derived[board] !== judged.rows[k].wants) return judged.judge(board)
    if (level.want === 'expose' && judged.rows[k].derived[board] === judged.rows[k].wants) return judged.judge(board)
    return null
  }
  const steps = []
  for (let k = 0; k < judged.rows.length; k++) {
    const why = stop(k)
    steps.push(why ? { failed: L(why) } : {})
    if (why) break
  }
  return steps
}

function verdict(level, judged) {
  if (level.want === 'agree') return tr('每一条条例的预期都符合需求，这份声明的结果也都和预期相符。')
  if (level.want === 'expose') return tr('每一条条例的预期都符合需求，这份声明的结果都和预期不符。')
  if (level.boards.length > 1) return tr(
    `已找出错误：${judged.caught.map((k, b) => `声明 ${b + 1} 在第 ${k + 1} 条条例上得出错误结论`).join('；')}。`,
    `Faults found: ${judged.caught.map((k, b) => `declaration ${b + 1} reaches a wrong conclusion on case ${k + 1}`).join('; ')}.`,
  )
  const row = judged.caught[0] + 1
  return tr(`已找出错误：这份声明在第 ${row} 条条例上得出错误结论。`, `Fault found: this declaration reaches a wrong conclusion on case ${row}.`)
}

function sections({ source: level, checked, at, work: cases, change, reached, row, setRow, phone }) {
  const ways = waysIn(level.boards[at].board)
  const rowClass = (k) => (k === row ? 'is-on' : '')
  // As the run reaches each case on the board on view, the case shows what it derives, marked where that catches it;
  // a case set out written in full shows it from the start.
  const whole = (c) => ['given', 'goal', 'make'].every((cell) => c?.fixed?.includes(cell))
  const result = (k) => {
    const r = checked.rows[k]
    if (!(k < reached || whole(cases[k])) || !r || r.derived[at] === null) return null
    return { derived: r.derived[at], wrong: r.right && r.derived[at] !== r.wants }
  }
  return {
    declaration: <RuleTable level={level} rules={rulesOf(level, ways)} />,
    preview: <NamedLines lines={ruleLines(level, ways)} />,
    checks: <CaseTable phone={phone} cases={cases} words={wordsOf(level)} level={level} edit={change} rowClass={rowClass} onPick={setRow} result={result} />,
  }
}

export const declarationAudit = {
  prepare,
  open: setOut,
  judge: checkCasesOf,
  steps,
  verdict,
  label: (k) => T(`声明 ${k + 1}`, `Declaration ${k + 1}`),
  score: (work) => ({ steps: work.length, unit: 'cases' }),
  sections,
}
