import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Brief, CircuitLayout, RunDock, TaskCard, TestStatus, usePlayback } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { CanvasEditor, SlotBoard } from '../../../circuit/index.js'
import { say } from '../notation.js'
import { DECL, caseTest, checkCases, runIso, sentenceOf, wayOf, wayRule, wayText } from '../iso.js'
import Entries from '../../../shell/Entries.jsx'
import { PROOF } from './boards.jsx'
import { WAY, isoPartsFor } from './IsoScreen.jsx'

// Finding the fault in someone's declaration (iso.js checkCases): their board, locked (one, or several each wrong in
// its own way), and the cases the player writes in the table under it, each the proofs at hand and whether the declared
// sentence should then be proved. Running goes down the cases, stopping on one whose expectation the requirement does
// not mean; the cases pass when every wrong board answers one of them otherwise. Fewer cases is the better score.

const MOST = 8
const blank = () => ({ have: [], make: true })

export default function FaultScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const words = (sentence) => say(sentenceOf(level, sentence), level.notation)
  const parts = useMemo(() => isoPartsFor(level, words), [level])
  const [cases, setCases] = useState(() => (Array.isArray(saved?.cases) ? saved.cases : []))
  const [shown, setShown] = useState(0) // the wrong board on view
  const [at, setAt] = useState(0) // the case the board shows its answer to
  const board = level.wrong[shown]
  const change = (next) => {
    setCases(next)
    save({ cases: next })
  }
  const edit = (k, c) => change(cases.map((x, j) => (j === k ? c : x)))
  // A sentence held keeps the level's order, so its number (#1, #2) reads the same in every row.
  const toggle = (k, s) => {
    const c = cases[k]
    const have = c.have.includes(s) ? c.have.filter((x) => x !== s) : level.sentences.filter((x) => x === s || c.have.includes(x))
    edit(k, { ...c, have })
  }
  const checked = useMemo(() => checkCases(level, cases, words), [level, cases])
  const current = cases[Math.min(at, cases.length - 1)]
  const view = useMemo(() => (current ? runIso(level, board, caseTest(current)) : { values: new Map(), made: null }), [level, board, current])

  const rowReason = (k) => (cases.length && checked.rows[k].right ? '' : L(checked.reason))
  const playback = usePlayback({
    count: Math.max(1, cases.length),
    stepsOf: () => [],
    check: rowReason,
    final: () => (checked.pass ? '' : L(checked.reason)),
    onSolve: () => solve({ steps: cases.length, unit: 'cases' }),
    onTest: setAt,
    board: cases,
    kept: lastRun,
    onKeep: keepRun,
  })
  const run = playback.run
  const states = playback.states
  const verdict = run?.over ? { pass: playback.passed } : null
  const failed = run?.over && !playback.passed ? run.results.at(-1) : null
  const verdictText = !verdict ? null : verdict.pass
    ? (level.wrong.length > 1
      ? tr(`已找出错误：${checked.caught.map((k, b) => `电路 ${b + 1} 在第 ${k + 1} 条条例上给出错误结论`).join('；')}。`, `Faults found: ${checked.caught.map((k, b) => `board ${b + 1} reaches a wrong conclusion on case ${k + 1}`).join('; ')}.`)
      : tr(`已找出错误：该声明在第 ${checked.caught[0] + 1} 条条例上给出错误结论。`, `Fault found: this declaration reaches a wrong conclusion on case ${checked.caught[0] + 1}.`))
    : run.final || failed?.reason

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
  const ran = (k) => run && k < run.results.length
  const rowClass = (k) => `${k === at ? 'is-on' : ''} ${states[k] ? `is-${states[k]}` : ''}`
  const result = (made) => (made ? tr(`证得出：${WAY[made.way - 1]}`, `Proved: ${WAY[made.way - 1]}`) : tr('证不出', 'Not proved'))
  const many = level.wrong.length > 1
  const table = (
    <div className="lg-strip is-tables">
      <div className="lg-scroll-x">
        <table className="lg-rows lg-cases">
          <thead>
            <tr>
              <th>#</th>
              {level.sentences.map((l) => <th key={l}>{tr(`手里的「${words(l).zh}」`, `“${words(l).en}” at hand`)}</th>)}
              <th>{tr(`预期：「${level.declare.zh}」`, `Expected: “${level.declare.en}”`)}</th>
              {level.wrong.map((_, b) => <th key={b} className="lg-result">{many ? tr(`电路 ${b + 1}`, `Board ${b + 1}`) : tr('该声明', 'This declaration')}</th>)}
              <th aria-label={tr('删去', 'Remove')} />
            </tr>
          </thead>
          <tbody>
            {cases.map((c, k) => (
              <tr key={k} className={rowClass(k)} onClick={() => setAt(k)}>
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
                {level.wrong.map((_, b) => {
                  const r = checked.rows[k]
                  const caught = ran(k) && r.right && Boolean(r.made[b]) !== r.wants
                  return <td key={b} className={`lg-result ${caught ? 'is-caught' : ''}`}>{ran(k) ? result(r.made[b]) : ''}</td>
                })}
                <td>
                  <button type="button" className="lg-drop" aria-label={tr('删除该条例', 'Remove this case')} onClick={(e) => { e.stopPropagation(); change(cases.filter((_, j) => j !== k)) }}><X size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cases.length < MOST && (
        <button type="button" className="lg-add-case" onClick={() => { change([...cases, blank()]); setAt(cases.length) }}>
          <Plus size={14} /> {tr('添加条例', 'Add a test case')}
        </button>
      )}
      {verdictText && <p className={`lg-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`}>{verdictText}</p>}
    </div>
  )
  const dock = <RunDock {...playback.dock({ go: tr('运行检验条例', 'Run the test cases'), done: tr('已找出错误', 'Fault found') })} />
  // Several wrong boards: one on view at a time.
  const switcher = many && (
    <div className="lg-boards" role="tablist">
      {level.wrong.map((_, b) => (
        <button key={b} type="button" role="tab" aria-selected={b === shown} className={b === shown ? 'is-on' : ''} onClick={() => setShown(b)}>{tr(`电路 ${b + 1}`, `Board ${b + 1}`)}</button>
      ))}
    </div>
  )

  if (phone) {
    return (
      <div className="level-phone is-split lg-phone">
        <div className="lg-scroll">
          <TaskCard>{brief}</TaskCard>
          {switcher}
          <SlotBoard fixed dense key={shown} graph={board} parts={parts} nameOf={(n) => L(parts.label(n))} thumb={body} sinkBody={body} onNode={() => {}} onSlot={() => {}} onPort={() => {}} />
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
          {switcher}
          <div className="lg-board">
            <CanvasEditor
              readOnly
              key={`${level.id}-${shown}`}
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
      status={<TestStatus states={states} />}
      outputsTitle={tr('检验条例', 'Test cases')}
      outputs={table}
      actions={<footer className="run-foot">{dock}</footer>}
    />
  )
}
