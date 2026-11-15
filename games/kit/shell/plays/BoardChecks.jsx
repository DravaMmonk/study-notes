import { useState } from 'react'
import Checks from '../Checks.jsx'
import { L } from '../i18n.js'
import NamedLines from '../NamedLines.jsx'
import RunDock from '../RunDock.jsx'
import TestTabs from '../TestTabs.jsx'
import Verdict from '../Verdict.jsx'
import { usePlayback } from '../usePlayback.jsx'
import PlayLayout from './PlayLayout.jsx'
import TreeRows from './TreeRows.jsx'
import { useSavedWork } from './useWork.js'

/** Inspect given boards and write cases that check how they behave. */
export default function BoardChecks({ screen, resource, play }) {
  const { phone, solve, lastRun, keepRun } = screen
  const [row, setRow] = useState(0)
  const [at, select] = useState(0)
  const { level, initial, judge, stepsOf, checks: { resultLabel, ...fields } } = resource
  const { work, change } = useSavedWork(screen, {
    read: () => initial,
    write: (work) => ({ work }),
  })
  const playback = usePlayback({
    count: level.boards.length,
    stepsOf: (k) => stepsOf(k, work),
    check: (k) => L(judge(k, work) ?? ''),
    onSolve: () => solve(resource.score(work)),
    onTest: select,
    board: work,
    kept: lastRun,
    onKeep: keepRun,
  })
  const { board } = level.boards[at]
  const { run, passed, states } = playback
  const result = resource.result(work, at, playback.shown(at).list.length)
  const text = run?.over ? passed ? L(resource.passed(work)) : run.results.at(-1)?.reason : null
  const tabs = level.boards.map((_, k) => ({ label: resource.label(k) }))
  const stage = (
    <div className={play.stage}>
      <TreeRows {...resource.rows(board)} />
      <NamedLines lines={resource.lines(board, L)} />
      <Checks
        {...fields} phone={phone} rows={work} onChange={change} onPick={setRow}
        rowClass={(k) => k === row ? 'is-on' : ''}
        result={{ label: resultLabel, at: result }}
      />
    </div>
  )
  const tests = play.checks === 'shown' && <TestTabs tests={tabs} states={states} index={at} onSelect={select} phone={phone} />
  const dock = <RunDock {...playback.dock({ go: L(resource.go), done: L(resource.done) })} />
  return <PlayLayout screen={screen} play={play} tests={tests} stage={stage} results={text ? <Verdict pass={passed}>{text}</Verdict> : null} dock={dock} />
}
