import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus, TestTabs, useBoardCases } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, SlotBoard } from '../../../circuit/index.js'
import { say } from '../notation.js'
import { DECL, caseTest, judgeCases, runIso, sentenceOf, wayOf, wayRule, wayText } from '../iso.js'
import Entries from '../../../shell/Entries.jsx'
import { PROOF } from './boards.jsx'
import { WAY, isoPartsFor } from './IsoScreen.jsx'

// Finding the fault in someone's declarations (the shared play 'audit', ../../../shell/useBoardCases.js): each test
// case is one of their boards, locked, put on the canvas by its tab; the player writes the situations in the table
// under it (iso.js judgeCases), each the proofs at hand and whether the declared sentence should then be proved. A run
// goes through the boards: one passes when every expectation is what the requirement means and the board answers one
// of the situations otherwise. Fewer situations is the better score.

const MOST = 8
const blank = () => ({ have: [], make: true })

export default function FaultScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  const parts = useMemo(() => isoPartsFor(level, words), [level])
  const [row, setRow] = useState(0) // the situation the board shows its answer to
  const judged = (cases) => judgeCases(level, cases, words)
  const boardCases = useBoardCases({
    level,
    saved,
    save,
    empty: [],
    judge: (k, cases) => L(judged(cases).judge(k) ?? ''),
    onSolve: () => solve({ steps: boardCases.work.length, unit: 'cases' }),
    lastRun,
    keepRun,
  })
  const cases = boardCases.work
  const board = boardCases.board
  const change = boardCases.setWork
  const edit = (k, c) => change(cases.map((x, j) => (j === k ? c : x)))
  // A sentence held keeps the level's order, so its number (#1, #2) reads the same in every row.
  const toggle = (k, s) => {
    const c = cases[k]
    const have = c.have.includes(s) ? c.have.filter((x) => x !== s) : level.sentences.filter((x) => x === s || c.have.includes(x))
    edit(k, { ...c, have })
  }
  const checked = useMemo(() => judged(cases), [level, cases])
  const current = cases[Math.min(row, cases.length - 1)]
  const view = useMemo(() => (current ? runIso(level, board, caseTest(current)) : { values: new Map(), made: null }), [level, board, current])

  const { playback } = boardCases
  const run = playback.run
  const states = playback.states
  const verdict = run?.over ? { pass: playback.passed } : null
  const failed = run?.over && !playback.passed ? run.results.at(-1) : null
  const many = level.boards.length > 1
  const verdictText = !verdict ? null : verdict.pass
    ? (many
      ? tr(`已找出错误：${checked.caught.map((k, b) => `电路 ${b + 1} 在第 ${k + 1} 条条例上得出错误结论`).join('；')}。`, `Faults found: ${checked.caught.map((k, b) => `board ${b + 1} reaches a wrong conclusion on case ${k + 1}`).join('; ')}.`)
      : tr(`已找出错误：这份声明在第 ${checked.caught[0] + 1} 条条例上得出错误结论。`, `Fault found: this declaration reaches a wrong conclusion on case ${checked.caught[0] + 1}.`))
    : failed?.reason

  // What a card says for the case picked: an assumption its sentence, the declared card its ways and whether it is
  // proved.
  const text = (f) => L(say(f, level.notation))
  const Value = ({ f }) => <PROOF.Value v={{ formula: f, hyps: new Map() }} text={text} />
  const ways = board.nodes.find((n) => n.id === DECL)?.params.ways ?? 0
  const ruleInto = (k) => {
    const wire = board.wires.find((w) => w.to === DECL && w.port === `c${k}`)
    return wire && runIso(level, board, { have: {} }).values.get(wire.from)
  }
  const body = (node) => {
    if (node.type === 'none') return null
    if (node.type === 'thing') return <div className="lg-card"><span className="lg-taken">{tr('任取的是', 'Taken:')} <b>{node.params.name}</b></span></div>
    if (node.type === 'hyp') return <div className="lg-card"><Value f={sentenceOf(level, node.params.name)} /></div>
    return (
      <div className="lg-card">
        {ways > 0 && <Entries className="lg-clauses">{Array.from({ length: ways }, (_, k) => ruleInto(k + 1)).map((rule, k) => rule && <code key={k}>{`${WAY[k]}. ${wayText(wayRule(wayOf(rule), level), text)}`}</code>)}</Entries>}
        {current && (view.made ? <span className="lg-tv is-true">{tr(`证得出：引入规则 ${WAY[view.made.way - 1]}`, `Proved by intro rule ${WAY[view.made.way - 1]}`)}</span> : <i className="lg-mark">{tr('证不出', 'Not proved')}</i>)}
      </div>
    )
  }

  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  const ran = Boolean(states[boardCases.at])
  const rowClass = (k) => (k === row ? 'is-on' : '')
  const result = (made) => (made ? tr(`证得出：${WAY[made.way - 1]}`, `Proved: ${WAY[made.way - 1]}`) : tr('证不出', 'Not proved'))
  const table = (
    <div className="lg-strip is-tables">
      <div className="lg-scroll-x">
        <table className="lg-rows lg-cases">
          <thead>
            <tr>
              <th>#</th>
              {level.sentences.map((l) => <th key={l}>{tr(`已知「${words(l).zh}」`, `Given “${words(l).en}”`)}</th>)}
              <th>{tr(`预期：「${level.declare.zh}」`, `Expected: “${level.declare.en}”`)}</th>
              <th className="lg-result">{many ? L(boardCases.tests[boardCases.at].label) : tr('这份声明', 'This declaration')}</th>
              <th aria-label={tr('删去', 'Remove')} />
            </tr>
          </thead>
          <tbody>
            {cases.map((c, k) => (
              <tr key={k} className={rowClass(k)} onClick={() => setRow(k)}>
                <td>{k + 1}</td>
                {level.sentences.map((s) => (
                  <td key={s}>
                    <button type="button" className={`lg-pick ${c.have.includes(s) ? 'is-on' : ''}`} onClick={(e) => { e.stopPropagation(); toggle(k, s) }}>
                      {c.have.includes(s) ? `#${c.have.indexOf(s) + 1}` : '—'}
                    </button>
                  </td>
                ))}
                <td>
                  <button type="button" className={`lg-pick ${c.make ? 'is-on' : ''}`} onClick={(e) => { e.stopPropagation(); edit(k, { ...c, make: !c.make }) }}>
                    {c.make ? tr('证得出', 'Proved') : tr('证不出', 'Not proved')}
                  </button>
                </td>
                {(() => {
                  const r = checked.rows[k]
                  const caught = ran && r.right && Boolean(r.made[boardCases.at]) !== r.wants
                  return <td className={`lg-result ${caught ? 'is-caught' : ''}`}>{ran ? result(r.made[boardCases.at]) : ''}</td>
                })()}
                <td>
                  <button type="button" className="lg-drop" aria-label={tr('删除这条条例', 'Remove this case')} onClick={(e) => { e.stopPropagation(); change(cases.filter((_, j) => j !== k)) }}><X size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cases.length < MOST && (
        <button type="button" className="lg-add-case" onClick={() => { change([...cases, blank()]); setRow(cases.length) }}>
          <Plus size={14} /> {tr('添加条例', 'Add a test case')}
        </button>
      )}
      {verdictText && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
    </div>
  )
  const dock = <RunDock {...playback.dock({ go: tr('运行检验条例', 'Run the test cases'), done: tr('已找出错误', 'Fault found') })} />
  // The boards are the test cases: their tabs put one on the canvas.
  const tabs = (onPhone) => <TestTabs tests={boardCases.tests} states={states} index={boardCases.at} onSelect={boardCases.select} phone={onPhone} />

  if (phone) {
    return (
      <div className="level-phone is-split lg-phone">
        <div className="lg-scroll">
          <TaskCard>{brief}</TaskCard>
          {many && tabs(true)}
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
