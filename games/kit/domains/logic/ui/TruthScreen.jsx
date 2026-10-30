import { useState } from 'react'
import { Brief, PhonePage, RunDock, Workbench, useKeptVerdict } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { atom, parse } from '../formula.js'
import { say } from '../notation.js'
import { lettersOf, rowsOf, tautology, valueOn } from '../truth.js'

// A truth-table level (《证明完毕》 era 0), by its `ask`:
//   fill     fill in the formula's value on every row, then check
//   valid    mark each formula as always true or not; any row of its table can be tried first
//   counter  find a row that makes the formula false: each row tried shows its value
//   sat      find a row that makes the formula true, the same way
const TF = (v) => (v ? tr('真', 'T') : tr('假', 'F'))

export default function TruthScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const formulas = level.formulas.map((t) => parse(t))
  const text = (f) => L(say(f, level.notation))
  const [state, setState] = useState(() => ({ fill: {}, marks: {}, tried: {}, ...saved }))
  // A row of formula f tried that is what the level asks for: false (counter) or true (sat).
  const hits = (f, k) => {
    const value = valueOn(formulas[f], rowsOf(lettersOf([formulas[f]]))[k])
    return (level.ask === 'counter' && !value) || (level.ask === 'sat' && value)
  }
  const judge = () => {
    const wrong = new Set()
    if (level.ask === 'counter' || level.ask === 'sat') return { pass: Object.keys(state.tried).some((key) => hits(...key.split(':').map(Number))), wrong }
    if (level.ask === 'fill') rowsOf(lettersOf(formulas)).forEach((row, k) => state.fill[k] !== valueOn(formulas[0], row) && wrong.add(k))
    if (level.ask === 'valid') formulas.forEach((f, k) => state.marks[k] !== tautology(f) && wrong.add(k))
    return { pass: wrong.size === 0, wrong }
  }
  const [checked, setChecked] = useKeptVerdict({ lastRun, keepRun }, judge) // { pass, wrong: Set } after a check
  const update = (patch) => {
    const next = { ...state, ...patch }
    setState(next)
    save(next)
    setChecked(null)
  }
  const tryRow = (f, k) => {
    update({ tried: { ...state.tried, [`${f}:${k}`]: true } })
    if (hits(f, k)) {
      setChecked({ pass: true, wrong: new Set() })
      solve(null)
    }
  }

  const check = () => {
    const v = judge()
    setChecked(v)
    if (v.pass) solve(null)
  }

  const table = (fi, { fill = false } = {}) => {
    const f = formulas[fi]
    const letters = lettersOf([f])
    return (
      <table className="lg-table">
        <thead><tr>{letters.map((l) => <th key={l}>{text(atom(l))}</th>)}<th className="is-formula">{text(f)}</th></tr></thead>
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
                    <button type="button" className="lg-cell" onClick={() => tryRow(fi, k)}>{tr('尝试', 'Try')}</button>
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
      {(level.ask === 'counter' || level.ask === 'sat') && table(0)}
      {level.ask === 'valid' && formulas.map((f, k) => (
        <section key={k} className={`lg-claim ${checked?.wrong.has(k) ? 'is-wrong' : ''}`}>
          <header>
            <b>{text(f)}</b>
            <span className="lg-mark-pick" role="group">
              {[[true, tr('恒成立', 'Always true')], [false, tr('不恒成立', 'Not always true')]].map(([v, label]) => (
                <button key={label} type="button" aria-pressed={state.marks[k] === v} onClick={() => update({ marks: { ...state.marks, [k]: v } })}>{label}</button>
              ))}
            </span>
          </header>
          <details><summary>{tr('展开真值表', 'Open the truth table')}</summary>{table(k)}</details>
        </section>
      ))}
      {checked && <p className={`lg-verdict ${checked.pass ? 'is-pass' : 'is-fail'}`}>{checked.pass ? (level.ask === 'counter' ? tr('已找到反例：命题在这一行为假。', 'Counterexample found: the proposition is false on this row.') : level.ask === 'sat' ? tr('已找到满足赋值：命题在这一行为真。', 'Satisfying assignment found: the proposition is true on this row.') : tr('全部正确。', 'All answers are correct.')) : tr(`还有 ${checked.wrong.size} 处错误，已用红色标出。`, `${checked.wrong.size} still wrong, marked in red.`)}</p>}
      {level.ask !== 'counter' && level.ask !== 'sat' && <footer className="run-foot"><RunDock go={{ label: checked?.pass ? tr('全部正确', 'All correct') : tr('检查', 'Check'), pass: Boolean(checked?.pass), onClick: check }} /></footer>}
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="lg-truth-level">{stage}</PhonePage>
  return <Workbench className="lg-truth-level" brief={brief} stage={stage} scroll />
}

