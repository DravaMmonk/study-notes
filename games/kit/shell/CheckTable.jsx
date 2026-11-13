import { useMemo } from 'react'
import RunDock from './RunDock.jsx'
import Verdict from './Verdict.jsx'
import { usePlayback } from './usePlayback.jsx'
import { L } from './i18n.js'

// A table of checks run down row by row, the same in every game: what each check is about, and in its last column
// what the thing the player made gives there, written as the run reaches the row; a row turns right or wrong, the run
// stops at the first wrong one and says why under the table, and the level is solved when every row is right
// (usePlayback.jsx: Run, Step, Pause, the run kept while the level is open). The game says what the checks are and how
// each is worked out; this runs them and draws them. 《证明完毕》's definition board checks a function's tests and its
// recursion this way.
//
//   columns   [label]: the last is the result's
//   checks    [{ cells: [what the row shows before the result; fewer than the columns: the last one spans the rest],
//               run() → { pass, got?: what the result column shows, why?: why it is wrong ({ zh, en } or words) } }]
//   wait      why nothing can be checked yet ({ zh, en }), or null: every check then fails with it
//   board     anything that changes what is checked: a new one cancels the run, and the checks are worked out again
//   passed    what the table says under a run that passed      words   { go, done } for the run bar
//   onSolve() every check passed      kept, onKeep   the last run (usePlayback.jsx)
// Returns { table, dock, passed }: the table and the run bar to place, and whether the last run passed.

export function useCheckTable({ columns, checks, wait = null, board, passed: passedText, words, onSolve, kept, onKeep }) {
  const outcomes = useMemo(() => (wait ? null : checks.map((check) => check.run())), [board, Boolean(wait)])
  const playback = usePlayback({
    count: checks.length,
    stepsOf: () => [],
    check: (k) => (!outcomes ? L(wait) : outcomes[k].pass ? '' : L(outcomes[k].why ?? '')),
    onSolve,
    board,
    kept,
    onKeep,
  })
  const { run, states } = playback
  const shown = (k) => run && k < run.results.length && outcomes
  const failed = run?.over && !playback.passed ? run.results.at(-1) : null
  const table = (
    <div className="ct">
      <div className="ct-scroll">
        <table className="ct-rows">
          <thead><tr>{columns.map((label, k) => <th key={k} className={k === columns.length - 1 ? 'ct-result' : ''}>{label}</th>)}</tr></thead>
          <tbody>
            {checks.map((check, k) => (
              <tr key={k} className={states[k] ? `is-${states[k]}` : ''}>
                {check.cells.map((cell, j) => <td key={j} colSpan={j === check.cells.length - 1 ? columns.length - check.cells.length : 1}>{cell}</td>)}
                <td className="ct-result">{shown(k) ? outcomes[k].got ?? (outcomes[k].pass ? '✓' : '✗') : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {run?.over && <Verdict pass={playback.passed}>{playback.passed ? passedText : failed?.reason}</Verdict>}
    </div>
  )
  return { table, dock: <RunDock {...playback.dock(words)} />, passed: playback.passed }
}
