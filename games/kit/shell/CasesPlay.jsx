import { useMemo, useState } from 'react'
import { L } from './i18n.js'
import { usePlayback } from './usePlayback.jsx'
import { PlayLayout, PlayStage } from './PlayLayout.jsx'
import RunDock from './RunDock.jsx'
import TestTabs from './TestTabs.jsx'
import Verdict from './Verdict.jsx'

// Keep one set of player-written checks and run it against each supplied board.
export function casesScreen({ prepare, open, judge, steps, verdict, label, score, sections }) {
  return function CasesPlay({ game, level, play, progress, phone, saved, save, solve, lastRun, keepRun }) {
    const source = useMemo(() => prepare(level.source, progress), [level.source, progress])
    const [work, setWork] = useState(() => {
      const empty = open(source)
      return saved?.work?.length === empty.length ? saved.work : empty
    })
    const [at, select] = useState(0)
    const [row, setRow] = useState(0)
    const checked = useMemo(() => judge(source, work), [source, work])
    const playback = usePlayback({
      count: source.boards.length,
      stepsOf: (k) => steps(source, checked, k),
      check: (k) => L(checked.judge(k) ?? ''),
      onSolve: () => solve(score(work)),
      onTest: select,
      board: work,
      kept: lastRun,
      onKeep: keepRun,
    })
    const change = (next) => {
      setWork(next)
      save({ work: next })
    }
    const complete = playback.run?.over
    const message = complete && (playback.passed ? verdict(source, checked) : playback.run.results.at(-1)?.reason)
    const results = message ? <Verdict pass={playback.passed}>{message}</Verdict> : null
    const done = play.doneByWant[source.want] ?? play.done
    const dock = <RunDock {...playback.dock({ go: L(play.runLabel), done: L(done) })} />
    const cases = source.boards.map((board, k) => ({ label: board.label ?? label(k) }))
    const tests = <TestTabs tests={cases} states={playback.states} index={at} onSelect={select} phone={phone} />
    const stage = <PlayStage play={play} sections={sections({ source, checked, at, work, change, reached: playback.shown(at).list.length, row, setRow, phone })} />
    return <PlayLayout task={source} {...{ game, level, phone, play, tests, stage, results, dock }} />
  }
}
