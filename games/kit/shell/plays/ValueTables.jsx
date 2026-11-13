import { useState } from 'react'
import { Brief, Level } from '../Layout.jsx'
import RunDock from '../RunDock.jsx'
import { useKeptVerdict } from '../useKeptVerdict.js'
import { L, tr } from '../i18n.js'
import { WORDS } from '../words.js'

/** Compare values row by row, classify an entire table, or try a row to reveal a value. */
export default function ValueTables({ screen, resource, play }) {
  const { game, level: entry, saved, save, solve, lastRun, keepRun, phone } = screen
  const { tables, labels, mode } = resource
  const tf = (value) => L(labels.values[Number(value)])
  const [state, setState] = useState(() => ({ fill: {}, marks: {}, tried: {}, ...saved }))
  const judge = () => resource.judge(state)
  const [checked, setChecked] = useKeptVerdict({ lastRun, keepRun }, judge) // { pass, wrong: Set } after a check
  const update = (patch) => {
    const next = { ...state, ...patch }
    setState(next)
    save(next)
    setChecked(null)
  }
  const tryRow = (f, k) => {
    update({ tried: { ...state.tried, [`${f}:${k}`]: true } })
    if (resource.hit(f, k)) {
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
    const { headers, title, rows } = tables[fi]
    return (
      <table className="vt-table">
        <thead><tr>{headers.map((header, k) => <th key={k}>{L(header)}</th>)}<th className="is-value">{L(title)}</th></tr></thead>
        <tbody>
          {rows.map(({ given, value }, k) => {
            const tried = state.tried[`${fi}:${k}`]
            const guess = state.fill[k]
            const bad = fill && checked?.wrong.has(k)
            return (
              <tr key={k} className={bad ? 'is-wrong' : ''}>
                {given.map((item, j) => <td key={j} className={item ? 'is-t' : 'is-f'}>{tf(item)}</td>)}
                <td className="is-value">
                  {fill ? (
                    <button type="button" className={`vt-cell ${guess === undefined ? '' : guess ? 'is-t' : 'is-f'}`} onClick={() => update({ fill: { ...state.fill, [k]: guess === undefined ? true : guess ? false : undefined } })} aria-label={tr(`第 ${k + 1} 行`, `Row ${k + 1}`)}>{guess === undefined ? '?' : tf(guess)}</button>
                  ) : tried ? (
                    <span className={`vt-cell is-shown ${value ? 'is-t' : 'is-f'}`}>{tf(value)}</span>
                  ) : (
                    <button type="button" className="vt-cell" onClick={() => tryRow(fi, k)}>{tr('尝试')}</button>
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
    <div className={play.stage}>
      {mode === 'fill' && table(0, { fill: true })}
      {mode === 'try' && table(0)}
      {mode === 'classify' && tables.map(({ title }, k) => (
        <section key={k} className={`vt-claim ${checked?.wrong.has(k) ? 'is-wrong' : ''}`}>
          <header>
            <b>{L(title)}</b>
            <span className="vt-mark-pick" role="group">
              {[[true, L(labels.classify[1])], [false, L(labels.classify[0])]].map(([v, label]) => (
                <button key={label} type="button" aria-pressed={state.marks[k] === v} onClick={() => update({ marks: { ...state.marks, [k]: v } })}>{label}</button>
              ))}
            </span>
          </header>
          <details><summary>{L(labels.inspect)}</summary>{table(k)}</details>
        </section>
      ))}
    </div>
  )
  // Trying rows needs no check: each row tried shows its value, and the one asked for passes the level.
  const tried = mode === 'try' && play.checks === 'shown'
  const results = checked ? <p className={`vt-verdict ${checked.pass ? 'is-pass' : 'is-fail'}`} role="status">{L(checked.pass ? resource.accepted : resource.wrong(checked.wrong.size))}</p> : null
  const dock = !tried && <RunDock go={{ label: checked?.pass ? L(WORDS.passed) : L(WORDS.check), pass: Boolean(checked?.pass), onClick: check }} />
  const brief = <Brief game={game} level={entry} hint={entry.source.hint} phone={phone} />
  return <Level phone={phone} className={play.layout} brief={brief} stage={tried ? <>{stage}{results}</> : stage} results={tried ? undefined : results} dock={dock} />
}
