import { useState } from 'react'
import { Brief, PhonePage, RunDock, Workbench } from '../../../shell/index.js'
import { tr } from '../../../shell/i18n.js'
import { parse, show } from '../formula.js'
import { lettersOf, rowsOf, tautology, valueOn } from '../truth.js'

// A truth-table level (《证明完毕》 era 0), by its `ask`:
//   fill     fill in the formula's value on every row, then check
//   valid    mark each formula as always true or not; any row of its table can be tried first
//   counter  find a row that makes the formula false: each row tried shows its value
const TF = (v) => (v ? tr('真', 'T') : tr('假', 'F'))

export default function TruthScreen({ game, level: entry, saved, save, solve, phone }) {
  const level = entry.source
  const formulas = level.formulas.map((t) => parse(t))
  const [state, setState] = useState(() => ({ fill: {}, marks: {}, tried: {}, ...saved }))
  const [checked, setChecked] = useState(null) // { pass, wrong: Set } after a check
  const update = (patch) => {
    const next = { ...state, ...patch }
    setState(next)
    save(next)
    setChecked(null)
  }
  const tryRow = (f, k) => {
    update({ tried: { ...state.tried, [`${f}:${k}`]: true } })
    const rows = rowsOf(lettersOf([formulas[f]]))
    if (level.ask === 'counter' && !valueOn(formulas[f], rows[k])) {
      setChecked({ pass: true, wrong: new Set() })
      solve(null)
    }
  }

  const check = () => {
    const wrong = new Set()
    if (level.ask === 'fill') rowsOf(lettersOf(formulas)).forEach((row, k) => state.fill[k] !== valueOn(formulas[0], row) && wrong.add(k))
    if (level.ask === 'valid') formulas.forEach((f, k) => state.marks[k] !== tautology(f) && wrong.add(k))
    const pass = wrong.size === 0
    setChecked({ pass, wrong })
    if (pass) solve(null)
  }

  const table = (fi, { fill = false } = {}) => {
    const f = formulas[fi]
    const letters = lettersOf([f])
    return (
      <table className="lg-table">
        <thead><tr>{letters.map((l) => <th key={l}>{l}</th>)}<th className="is-formula">{show(f)}</th></tr></thead>
        <tbody>
          {rowsOf(letters).map((row, k) => {
            const tried = state.tried[`${fi}:${k}`]
            const guess = state.fill[k]
            const bad = fill && checked?.wrong.has(k)
            return (
              <tr key={k} className={bad ? 'is-wrong' : ''}>
                {letters.map((l) => <td key={l} className={row[l] ? 'is-t' : 'is-f'}>{TF(row[l])}</td>)}
                <td className="is-formula">
                  {fill ? (
                    <button type="button" className={`lg-cell ${guess === undefined ? '' : guess ? 'is-t' : 'is-f'}`} onClick={() => update({ fill: { ...state.fill, [k]: guess === undefined ? true : guess ? false : undefined } })} aria-label={tr(`第 ${k + 1} 行`, `Row ${k + 1}`)}>{guess === undefined ? '?' : TF(guess)}</button>
                  ) : tried ? (
                    <span className={`lg-cell is-shown ${valueOn(f, row) ? 'is-t' : 'is-f'}`}>{TF(valueOn(f, row))}</span>
                  ) : (
                    <button type="button" className="lg-cell" onClick={() => tryRow(fi, k)}>{tr('试一试', 'Try')}</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  const stage = (
    <div className="lg-truth">
      {level.ask === 'fill' && table(0, { fill: true })}
      {level.ask === 'counter' && table(0)}
      {level.ask === 'valid' && formulas.map((f, k) => (
        <section key={k} className={`lg-claim ${checked?.wrong.has(k) ? 'is-wrong' : ''}`}>
          <header>
            <b>{show(f)}</b>
            <span className="lg-mark-pick" role="group">
              {[[true, tr('永远成立', 'Always true')], [false, tr('不总成立', 'Not always')]].map(([v, label]) => (
                <button key={label} type="button" aria-pressed={state.marks[k] === v} onClick={() => update({ marks: { ...state.marks, [k]: v } })}>{label}</button>
              ))}
            </span>
          </header>
          <details><summary>{tr('列表来算', 'Work it out on a table')}</summary>{table(k)}</details>
        </section>
      ))}
      {checked && <p className={`lg-verdict ${checked.pass ? 'is-pass' : 'is-fail'}`}>{checked.pass ? (level.ask === 'counter' ? tr('找到了：这一行它是假的。', 'Found it: it is false on this row.') : tr('全对。', 'All correct.')) : tr(`还有 ${checked.wrong.size} 处不对，标红了。`, `${checked.wrong.size} still wrong, marked in red.`)}</p>}
      {level.ask !== 'counter' && <footer className="run-foot"><RunDock go={{ label: checked?.pass ? tr('全对', 'All correct') : tr('检查', 'Check'), pass: Boolean(checked?.pass), onClick: check }} /></footer>}
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="lg-truth-level">{stage}</PhonePage>
  return <Workbench className="lg-truth-level" brief={brief} stage={stage} scroll />
}

