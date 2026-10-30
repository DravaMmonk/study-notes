import { useMemo, useState } from 'react'
import { Brief, PhonePage, RunDock, Workbench, usePlayback } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { parseS, parseSide } from '../schematic.js'
import { say, sayTerm } from '../notation.js'
import { checkDefine, whyNot } from '../define.js'

// The definition board (define.js): the function's rows, one for each constructor of the argument it takes apart (or
// each value of its condition), each with its right side picked from a few; under them the tests, what each term
// should work out to and what the picked rows work it out to, and last whether every call on a right side takes apart
// a smaller argument. Running goes down the rows (../../../shell/usePlayback.jsx).

export default function DefineScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const term = (text) => L(sayTerm(parseSide(text), level.notation))
  const cond = (text) => L(say(parseS(text), level.notation))
  const [picks, setPicks] = useState(() => (Array.isArray(saved) && saved.length === level.rows.length ? saved : level.rows.map(() => '')))
  const pick = (k, value) => {
    const next = picks.map((p, j) => (j === k ? value : p))
    setPicks(next)
    save(next)
  }
  const ready = picks.every(Boolean)
  const checked = useMemo(() => (ready ? checkDefine(level, picks) : null), [level, picks])
  const count = level.tests.length + 1
  const words = (text) => sayTerm(parseSide(text), level.notation)
  const playback = usePlayback({
    count,
    stepsOf: () => [],
    check: (k) => (!checked ? L(T_PICK) : checked.rows[k].pass ? '' : L(whyNot(checked.rows[k], words))),
    onSolve: () => solve(null),
    board: picks,
    kept: lastRun,
    onKeep: keepRun,
  })
  const run = playback.run
  const states = playback.states
  const shown = (k) => run && k < run.results.length
  const failed = run?.over && !playback.passed ? run.results.at(-1) : null

  const rows = (
    <div className="lg-defs">
      {level.rows.map((row, k) => (
        <div key={k} className="lg-def-row">
          {row.when && <span className="lg-def-when">{cond(row.when)} ⟹</span>}
          <span className="lg-def-lhs">{term(row.lhs)} =</span>
          <select value={picks[k]} onChange={(e) => pick(k, e.target.value)} aria-label={tr(`第 ${k + 1} 行的右边`, `Right side of row ${k + 1}`)}>
            <option value="">{tr('选择右边', 'Choose')}</option>
            {row.choices.map((c) => <option key={c} value={c}>{term(c)}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
  const table = (
    <div className="lg-strip is-tables">
      <div className="lg-scroll-x">
        <table className="lg-rows">
          <thead><tr><th>{tr('表达式', 'Expression')}</th><th>{tr('期望值', 'Expected')}</th><th className="lg-result">{tr('结果', 'Result')}</th></tr></thead>
          <tbody>
            {level.tests.map((test, k) => {
              const r = checked?.rows[k]
              return (
                <tr key={k} className={states[k] ? `is-${states[k]}` : ''}>
                  <td>{term(test.term)}</td>
                  <td>{term(test.value)}</td>
                  <td className="lg-result">{shown(k) && r ? (r.got.loops ? tr('不终止', 'Does not terminate') : L(sayTerm(r.got.value, level.notation))) : ''}</td>
                </tr>
              )
            })}
            <tr className={states[count - 1] ? `is-${states[count - 1]}` : ''}>
              <td colSpan={2}>{tr('每次递归调用的参数都更小', 'Every recursive call is on a smaller argument')}</td>
              <td className="lg-result">{shown(count - 1) && checked ? (checked.rows.at(-1).pass ? '✓' : tr(`第 ${checked.rows.at(-1).row + 1} 行的参数没有变小`, `Row ${checked.rows.at(-1).row + 1}: the argument does not decrease`)) : ''}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {run?.over && <p className={`lg-verdict ${playback.passed ? 'is-pass' : 'is-fail'}`}>{playback.passed ? tr('每个值都正确，每次递归调用的参数都更小，因此这条定义必定终止。', 'Every value is correct and every recursive call is on a smaller argument, so this definition always terminates.') : failed?.reason}</p>}
    </div>
  )
  const dock = <RunDock {...playback.dock({ go: tr('运行测试', 'Run the tests'), done: tr('定义已接受', 'Definition accepted') })} />
  const stage = (
    <div className="lg-define">
      {rows}
      {table}
      <footer className="run-foot">{dock}</footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="lg-define-level">{stage}</PhonePage>
  return <Workbench className="lg-define-level" brief={brief} stage={stage} scroll />
}

const T_PICK = { zh: '每一行都须选择右边', en: 'Every row needs a right side' }
