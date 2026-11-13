import { useState } from 'react'
import Checks from '../Checks.jsx'
import { L } from '../i18n.js'
import { Brief, Level } from '../Layout.jsx'
import NamedLines from '../NamedLines.jsx'
import RunDock from '../RunDock.jsx'
import TestTabs from '../TestTabs.jsx'
import Verdict from '../Verdict.jsx'
import { useBoardCases } from '../useBoardCases.js'
import { TreeRows } from './Rows.jsx'

/** Inspect given boards and write cases that check how they behave. */
export default function BoardChecks({ screen, resource, play }) {
  const { game, level: entry, phone, save, solve, lastRun, keepRun } = screen
  const [row, setRow] = useState(0)
  const { level, saved, empty, judge, stepsOf, checks: { resultLabel, ...fields } } = resource
  const cases = useBoardCases({
    level, saved, save, empty, lastRun, keepRun,
    judge: (k, work) => L(judge(k, work) ?? ''),
    stepsOf,
    onSolve: () => solve(resource.score(cases.work)),
  })
  const { playback, work, board, at } = cases
  const { run, passed, states } = playback
  const result = resource.result(work, at, playback.shown(at).list.length)
  const text = run?.over ? passed ? L(resource.passed(work)) : run.results.at(-1)?.reason : null
  const tabs = cases.tests.map((test, k) => ({ ...test, label: resource.label(k) }))
  const stage = (
    <div className={play.stage}>
      <TreeRows {...resource.rows(board)} />
      <NamedLines lines={resource.lines(board, L)} />
      <Checks
        {...fields} phone={phone} rows={work} onChange={cases.setWork} onPick={setRow}
        rowClass={(k) => k === row ? 'is-on' : ''}
        result={{ label: resultLabel, at: result }}
      />
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  const tests = play.checks === 'shown' && <TestTabs tests={tabs} states={states} index={at} onSelect={cases.select} phone={phone} />
  const dock = <RunDock {...playback.dock({ go: L(resource.go), done: L(resource.done) })} />
  return <Level phone={phone} className={play.layout} brief={brief} tests={tests} stage={stage} results={text ? <Verdict pass={passed}>{text}</Verdict> : null} dock={dock} />
}
