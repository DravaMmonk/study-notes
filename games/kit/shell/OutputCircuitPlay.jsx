import { Fragment, useMemo } from 'react'
import CircuitLevel, { useLevelRun } from './CircuitLevel.jsx'
import { failedOutputTests, hiddenOutputTests, visibleOutputTask } from '../engine/output-play.js'
import { L, T, tr } from './i18n.js'
import { WORDS } from './words.js'

// Recompute the preview only when the board's computation or the visible test set changes.
export function useOutputChecks(screen, board, evaluate, onSolve) {
  const { circuit, version } = board
  const { level, solved, play } = screen
  const task = visibleOutputTask(level, solved, play)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const evaluated = useMemo(() => evaluate(task, circuit), [evaluate, version, level.tests, level.hidden, solved, play.checks])
  const hidden = hiddenOutputTests(level, solved, play)
  const hiddenCount = hidden.length
  const run = useLevelRun(screen, board, {
    tests: task.tests,
    judge: () => ({ ...evaluated, results: evaluated.results.map(({ pass, checks }) => ({ pass, reason: checks.find((check) => !check.pass)?.reason })) }),
    hidden: {
      count: hiddenCount,
      fails: () => failedOutputTests(evaluate, level, circuit, hidden),
      words: {
        note: T(`另有 ${hiddenCount} 组隐藏测试，通关后公开。`, `${hiddenCount} more tests are hidden until you pass.`),
        failed: (failed) => tr(`${hiddenCount} 组隐藏测试中有 ${failed} 组未通过。`, `${failed} of ${hiddenCount} hidden tests failed.`),
      },
    },
    onSolve,
  })
  const shown = run.over ? evaluated : {
    ...evaluated, pass: false, untested: true,
    results: evaluated.results.map((test) => ({ ...test, pass: null, checks: test.checks.map((check) => ({ ...check, pass: null, reason: '' })) })),
  }
  return { task, run, evaluated, shown, hiddenCount }
}

// An output-comparison play shows one supplied panel on a phone or places its named sections in the desktop strip.
export function OutputCircuitLevel({ screen, panel: Panel, panelProps, extras, brief, ...boardProps }) {
  const { phone, play } = screen
  const { title, body, aside } = play.results
  return <CircuitLevel
    {...boardProps}
    screen={screen}
    className={play.layout}
    brief={{ ...brief, children: !phone && extras }}
    below={phone && extras}
    results={<Panel {...panelProps} part={phone ? undefined : body} />}
    resultsTitle={!phone && <Panel {...panelProps} part={title} />}
    resultsAside={!phone && <div className="strip-aside">{aside.map((part) => <Fragment key={part}><Panel {...panelProps} part={part} /></Fragment>)}</div>}
    words={{ go: L(WORDS.check), done: L(WORDS.passed) }}
  />
}
