import { useMemo, useState } from 'react'
import { Brief, PhonePage, RunDock, TestTabs, Workbench, useBoardCases } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { say } from '../notation.js'
import { judgeCases, sentenceOf, waysIn } from '../iso.js'
import { DeclRules } from './IsoScreen.jsx'
import CaseTable, { setOut } from './IsoCases.jsx'
import RuleTable, { rulesOf } from './RuleTable.jsx'
import { boardOf, linesOf, problemsOf } from '../ruleLines.js'

// Finding the fault in someone's declarations (the shared play 'audit', ../../../shell/useBoardCases.js): each test
// case is one of their declarations, its rules on the rule table (RuleTable.jsx, read only), picked by its tab; the
// player writes the test cases (检验条例) in the table under it (iso.js judgeCases, ui/IsoCases.jsx), each what is given, a goal and whether it should be derivable. A
// run goes through the boards: one passes when every expectation is what the requirement means and the board answers
// one of the cases otherwise (or, by the level's `want`, every one as expected, or every one otherwise). Fewer cases is
// the better score. The declaration may be the one the player wrote on an earlier level (`carry`).


export default function FaultScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone, progress }) {
  // The declaration the player wrote on an earlier level (`carry`), once it is one; else the level's own.
  const kept = entry.source.carry && progress?.solved?.includes(entry.source.carry) ? progress.data?.[entry.source.carry]?.rules : null
  const carried = kept && !problemsOf(entry.source, kept).length ? boardOf(linesOf(kept)) : null
  const level = useMemo(() => (carried ? { ...entry.source, boards: [{ board: carried }] } : entry.source), [entry.source, carried])
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  const [row, setRow] = useState(0) // the case the board shows its answer to
  const judged = (cases) => judgeCases(level, cases, words)
  const boardCases = useBoardCases({
    level,
    // The cases are set out beforehand (the level's `slots`); a save with another number of them starts over.
    saved: saved?.work?.length === setOut(level).length ? saved : null,
    save,
    empty: setOut(level),
    judge: (k, cases) => L(judged(cases).judge(k) ?? ''),
    // A run goes down the table one case a step, stopping at the case that fails the board.
    stepsOf: (b, cases) => {
      const j = judged(cases)
      const stop = (k) => {
        if (!j.rows[k].right) return j.wrong
        if (level.want === 'agree' && j.rows[k].derived[b] !== j.rows[k].wants) return j.judge(b)
        if (level.want === 'expose' && j.rows[k].derived[b] === j.rows[k].wants) return j.judge(b)
        return null
      }
      const steps = []
      for (let k = 0; k < cases.length; k++) {
        const why = stop(k)
        steps.push(why ? { failed: L(why) } : {})
        if (why) break
      }
      return steps
    },
    onSolve: () => solve({ steps: boardCases.work.length, unit: 'cases' }),
    lastRun,
    keepRun,
  })
  const cases = boardCases.work
  const board = boardCases.board
  const change = boardCases.setWork
  const checked = useMemo(() => judged(cases), [level, cases])

  const { playback } = boardCases
  const run = playback.run
  const states = playback.states
  const verdict = run?.over ? { pass: playback.passed } : null
  const failed = run?.over && !playback.passed ? run.results.at(-1) : null
  const many = level.boards.length > 1
  const verdictText = !verdict ? null : verdict.pass
    ? (level.want === 'agree' ? tr('每一条条例的预期都符合需求，这份声明的结果也都和预期相符。', 'Every expectation meets the requirement, and this declaration’s results all agree with them.')
      : level.want === 'expose' ? tr('每一条条例的预期都符合需求，这份声明的结果都和预期不符。', 'Every expectation meets the requirement, and this declaration’s results all disagree with them.')
      : many
      ? tr(`已找出错误：${checked.caught.map((k, b) => `声明 ${b + 1} 在第 ${k + 1} 条条例上得出错误结论`).join('；')}。`, `Faults found: ${checked.caught.map((k, b) => `declaration ${b + 1} reaches a wrong conclusion on case ${k + 1}`).join('; ')}.`)
      : tr(`已找出错误：这份声明在第 ${checked.caught[0] + 1} 条条例上得出错误结论。`, `Fault found: this declaration reaches a wrong conclusion on case ${checked.caught[0] + 1}.`))
    : failed?.reason

  const ways = waysIn(board)

  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  // The cases the run has reached on the board on view.
  const reached = playback.shown(boardCases.at).list.length
  const rowClass = (k) => (k === row ? 'is-on' : '')
  // As the run reaches each case on the board on view, the case shows what it derives, marked where that catches it;
  // a case set out written in full shows it from the start.
  const whole = (c) => ['given', 'goal', 'make'].every((cell) => c?.fixed?.includes(cell))
  const result = (k) => {
    const r = checked.rows[k]
    if (!(k < reached || whole(cases[k])) || !r || r.derived[boardCases.at] === null) return null
    return { derived: r.derived[boardCases.at], wrong: r.right && r.derived[boardCases.at] !== r.wants }
  }
  const table = (
    <div className="lg-strip is-tables">
      <DeclRules level={level} ways={ways} />
      <CaseTable phone={phone} cases={cases} words={words} level={level} edit={change} rowClass={rowClass} onPick={setRow} result={result} />
      {verdictText && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
    </div>
  )
  const dock = <RunDock {...playback.dock({ go: tr('运行检验条例', 'Run the test cases'), done: level.want === 'agree' ? tr('结果全部相符', 'All results agree') : tr('已找出错误', 'Fault found') })} />
  // The declarations are the test cases: their tabs put one on the table.
  const named = boardCases.tests.map((t, k) => ({ ...t, label: level.boards[k].label ?? { zh: `声明 ${k + 1}`, en: `Declaration ${k + 1}` } }))
  const tabs = (onPhone) => <TestTabs tests={named} states={states} index={boardCases.at} onSelect={boardCases.select} phone={onPhone} />
  const stage = (
    <div className="fo-stage">
      {tabs(phone)}
      <RuleTable level={level} rules={rulesOf(level, ways)} />
      {table}
      <footer className="run-foot">{dock}</footer>
    </div>
  )
  if (phone) return <PhonePage brief={brief} className="fo-level lg-level">{stage}</PhonePage>
  return <Workbench className="fo-level lg-level" brief={brief} stage={stage} scroll />
}
