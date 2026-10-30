import { useMemo, useState } from 'react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus, TestTabs, useBoardCases } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, SlotBoard } from '../../../circuit/index.js'
import { say } from '../notation.js'
import { DECL, derives, judgeCases, listText, propositionsOf, runIso, sentenceOf, wayOf, wayRule, wayText } from '../iso.js'
import Entries from '../../../shell/Entries.jsx'
import { WAY, isoPartsFor } from './IsoScreen.jsx'
import CaseTable, { setOut } from './IsoCases.jsx'

// Finding the fault in someone's declarations (the shared play 'audit', ../../../shell/useBoardCases.js): each test
// case is one of their boards, locked, put on the canvas by its tab; the player writes the test cases (检验条例) in the
// table under it (iso.js judgeCases, ui/IsoCases.jsx), each what is given, a goal and whether it should be derivable. A
// run goes through the boards: one passes when every expectation is what the requirement means and the board answers
// one of the cases otherwise (or, by the level's `want`, every one as expected, or every one otherwise). Fewer cases is
// the better score. The board may be the one the player wrote on an earlier level (`carry`), or that level's
// reference answer when they kept none.


export default function FaultScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone, progress }) {
  const kept = entry.source.carry && progress?.solved?.includes(entry.source.carry) && progress.data?.[entry.source.carry]
  const carried = kept?.nodes?.some((n) => n.id === DECL) ? kept : null
  const level = useMemo(() => (carried ? { ...entry.source, boards: [{ board: carried }] } : entry.source), [entry.source, carried])
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  const parts = useMemo(() => isoPartsFor(level, words), [level])
  const [row, setRow] = useState(0) // the case the board shows its answer to
  const judged = (cases) => judgeCases(level, cases, words)
  const boardCases = useBoardCases({
    level,
    // The cases are set out beforehand (the level's `slots`); a save with another number of them starts over.
    saved: saved?.work?.length === setOut(level).length ? saved : null,
    save,
    empty: setOut(level),
    judge: (k, cases) => L(judged(cases).judge(k) ?? ''),
    onSolve: () => solve({ steps: boardCases.work.length, unit: 'cases' }),
    lastRun,
    keepRun,
  })
  const cases = boardCases.work
  const board = boardCases.board
  const change = boardCases.setWork
  const choices = useMemo(() => propositionsOf(level), [level])
  const checked = useMemo(() => judged(cases), [level, cases])
  const current = cases[Math.min(row, cases.length - 1)]
  const view = useMemo(() => (current ? { ...runIso(level, board, current), ...derives(level, board, current) } : { values: new Map(), made: null, derived: null }), [level, board, current])

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
      ? tr(`已找出错误：${checked.caught.map((k, b) => `电路 ${b + 1} 在第 ${k + 1} 条条例上得出错误结论`).join('；')}。`, `Faults found: ${checked.caught.map((k, b) => `board ${b + 1} reaches a wrong conclusion on case ${k + 1}`).join('; ')}.`)
      : tr(`已找出错误：这份声明在第 ${checked.caught[0] + 1} 条条例上得出错误结论。`, `Fault found: this declaration reaches a wrong conclusion on case ${checked.caught[0] + 1}.`))
    : failed?.reason

  // What a card says for the case picked: an assumption its sentence, the declared card its ways and whether it is
  // proved.
  const text = (f) => L(say(f, level.notation))
  const ways = board.nodes.find((n) => n.id === DECL)?.params.ways ?? 0
  const ruleInto = (k) => {
    const wire = board.wires.find((w) => w.to === DECL && w.port === `c${k}`)
    return wire && runIso(level, board, { given: [] }).values.get(wire.from)
  }
  const body = (node) => {
    if (node.type === 'none') return null
    if (node.type === 'thing') return <div className="lg-card"><span className="lg-taken">{tr('任取的是', 'Taken:')} <b>{node.params.name}</b></span></div>
    if (node.type === 'hyp' || node.type === 'join') {
      const value = runIso(level, board, { given: [] }).values.get(node.id)
      return <div className="lg-card">{node.type === 'hyp' && <span className="lg-pick">{text(sentenceOf(level, node.params.name))}</span>}{value && <code className="lg-made">{listText(value, level, text)}</code>}</div>
    }
    return (
      <div className="lg-card">
        {ways > 0 && <Entries className="lg-clauses">{Array.from({ length: ways }, (_, k) => ruleInto(k + 1)).map((rule, k) => rule && <code key={k}>{`${WAY[k]}. ${wayText(wayRule(wayOf(rule), level), text)}`}</code>)}</Entries>}
        {current && (view.made ? <span className="lg-tv is-true">{tr(`由引入规则 ${WAY[view.made.way - 1]} 推导出`, `Derived by intro rule ${WAY[view.made.way - 1]}`)}</span> : view.derived ? <span className="lg-tv is-true">{tr('可推导', 'Derivable')}</span> : <i className="lg-mark">{tr('不可推导', 'Not derivable')}</i>)}
      </div>
    )
  }

  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  const ran = Boolean(states[boardCases.at])
  const rowClass = (k) => (k === row ? 'is-on' : '')
  // Once the run reaches the board on view, each case shows what it derives, marked where that catches it; a case
  // set out written in full shows it from the start.
  const whole = (c) => ['given', 'goal', 'make'].every((cell) => c?.fixed?.includes(cell))
  const result = (k) => {
    const r = checked.rows[k]
    if (!(ran || whole(cases[k])) || !r || r.derived[boardCases.at] === null) return null
    return { derived: r.derived[boardCases.at], wrong: r.right && r.derived[boardCases.at] !== r.wants }
  }
  const table = (
    <div className="lg-strip is-tables">
      <CaseTable phone={phone} cases={cases} words={words} level={level} choices={choices} edit={change} rowClass={rowClass} onPick={setRow} result={result} />
      {verdictText && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
    </div>
  )
  const dock = <RunDock {...playback.dock({ go: tr('运行检验条例', 'Run the test cases'), done: level.want === 'agree' ? tr('结果全部相符', 'All results agree') : tr('已找出错误', 'Fault found') })} />
  // The boards are the test cases: their tabs put one on the canvas.
  const tabs = (onPhone) => <TestTabs tests={boardCases.tests} states={states} index={boardCases.at} onSelect={boardCases.select} phone={onPhone} />

  if (phone) {
    return (
      <div className="level-phone is-split lg-phone">
        {tabs(true)}
        <div className="lg-scroll">
          <TaskCard>{brief}</TaskCard>
          <SlotBoard fixed dense key={boardCases.at} graph={board} parts={parts} nameOf={(n) => L(parts.label(n))} thumb={body} sinkBody={body} onNode={() => {}} onSlot={() => {}} onPort={() => {}} />
          {table}
        </div>
        <footer className="run-foot">{dock}</footer>
      </div>
    )
  }
  return (
    <CircuitLayout
      className="lg-level"
      brief={brief}
      canvas={
        <div className="lg-stage">
          <div className="lg-board">
            <CanvasEditor
              readOnly
              key={`${level.id}-${boardCases.at}`}
              scope={level.id}
              graph={board}
              onChange={() => {}}
              parts={parts}
              width={220}
              height={120}
              body={body}
              cardClass={() => 'lg-node'}
              wireState={(wire) => (view.values.get(wire.from) ? 'live' : 'dead')}
            />
          </div>
        </div>
      }
      tests={tabs(false)}
      status={<TestStatus states={states} />}
      outputsTitle={tr('检验条例', 'Test cases')}
      outputs={table}
      actions={<footer className="run-foot">{dock}</footer>}
    />
  )
}
