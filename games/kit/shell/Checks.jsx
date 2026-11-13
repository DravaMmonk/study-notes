import { useState } from 'react'
import NumberField from './NumberField.jsx'
import RowTable from './RowTable.jsx'
import { L, T, tr } from './i18n.js'

// The checks a player writes where a task gives the works (engine/caught.js), in the results area of the level: a
// row a check, a number for every card of the task. Picking a row puts it on the board on view; once a run has
// judged the rows, each says what the work on view gives on it, marked where that catches the work.
//
//   const checks = useChecks(screen, task)   { ports, rows, at, version, set(rows), pick(k) }, kept with the level
//   <Checks checks={checks} gives={(k) => text | null} catches={(k) => bool} verdict={{ pass, text } | null} phone />

/** The rows a task's checks start as: as many as the task's own tests, every card empty. */
const blank = (ports) => () => Object.fromEntries(ports.map((p) => [p.name, null]))

export function useChecks(screen, task) {
  const ports = [...(task.inputs ?? []), ...task.outputs]
  const [state, setState] = useState(() => ({ rows: task.works && screen.saved?.work?.length === task.tests.length ? screen.saved.work : task.tests.map(blank(ports)), version: 0, at: 0 }))
  const set = (rows) => {
    setState((s) => ({ ...s, rows, version: s.version + 1 }))
    screen.save({ work: rows })
  }
  return { ports, rows: state.rows, version: state.version, at: state.at, set, pick: (at) => setState((s) => ({ ...s, at })) }
}

/** What the rows come to, in words (engine/caught.js): why they are no checks yet, or ''. */
export const checksSay = (found) => (!found.why ? ''
  : found.why === 'unfilled' ? tr(`第 ${found.row + 1} 行还没有填完。`, `Row ${found.row + 1} is not filled in yet.`)
  : found.why === 'never' ? `${tr(`第 ${found.row + 1} 行：`, `Row ${found.row + 1}: `)}${L(found.said)}`
  : tr(`第 ${found.row + 1} 行的预期不对：对的作品在这一行给出的不是这些数。`, `Row ${found.row + 1} expects the wrong thing: a sound work does not give these numbers on it.`))

export default function Checks({ checks, gives, catches, verdict, phone }) {
  const { ports, rows } = checks
  const number = (p) => (row, set) => <NumberField label={p.label} value={row[p.name] ?? ''} onChange={(v) => set({ ...row, [p.name]: Number(v) })} phone={phone} />
  const columns = [
    ...ports.map((p) => ({ key: p.name, label: p.label, cell: (row) => row[p.name] ?? '—', edit: number(p) })),
    { key: 'gives', label: T('这一样给出'), cell: (_, k) => <span className={catches(k) ? 'ck-caught' : ''}>{gives(k) ?? '—'}</span> },
  ]
  return (
    <div className="ck">
      <RowTable phone={phone} rows={rows} columns={columns} onChange={checks.set} fixed blank={blank(ports)} rowClass={(k) => (k === checks.at ? 'is-on' : '')} onPick={checks.pick} form={(row, set) => ports.map((p) => <div key={p.name}>{number(p)(row, set)}</div>)} formTitle={(k) => T(`第 ${k + 1} 行`, `Row ${k + 1}`)} />
      {verdict && <p className={`ck-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`} role="status">{verdict.text}</p>}
    </div>
  )
}
