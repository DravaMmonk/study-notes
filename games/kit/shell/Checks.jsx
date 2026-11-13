import { useState } from 'react'
import BitsField from './BitsField.jsx'
import NumberField from './NumberField.jsx'
import RowTable from './RowTable.jsx'
import Verdict from './Verdict.jsx'
import { L, T, tr } from './i18n.js'

// The checks a player writes where a task gives the works (engine/caught.js), in the results area of the level: a
// row a check, a cell for each thing the domain's test is made of. Picking a row puts it on the board on view; once a
// run has judged the rows, each says what the work on view gives on it, marked where that catches the work.
//
//   cells   [{ name, label, shape: 'number' | 'bits', ticks? }]   a number, or a bit a tick for `ticks` ticks; by
//           default a number for every card of the task, else what the domain's run.js says (cells(task))
//   const checks = useChecks(screen, task, cells)   { cells, rows, at, version, set(rows), pick(k) }, kept with the level
//   <Checks checks={checks} gives={(k) => text | null} catches={(k) => bool} verdict={{ pass, text } | null} phone />

const empty = (cell) => (cell.shape === 'bits' ? Array(cell.ticks).fill(0) : null)
/** The rows a task's checks start as: as many as the task's own tests, every cell empty (a wire silent). */
const blank = (cells) => () => Object.fromEntries(cells.map((c) => [c.name, empty(c)]))
const fits = (cells) => (row) => cells.every((c) => (c.shape === 'bits' ? Array.isArray(row?.[c.name]) && row[c.name].length === c.ticks : !Array.isArray(row?.[c.name])))

export function useChecks(screen, task, cellsOf) {
  // Only a task that gives works has checks to keep: any other holds none (and need not have cards of this kind).
  const cells = !task.works ? [] : cellsOf?.(task) ?? [...(task.inputs ?? []), ...task.outputs].map((p) => ({ ...p, shape: 'number' }))
  const kept = (saved) => saved?.length === task.tests.length && saved.every(fits(cells))
  const [state, setState] = useState(() => ({ rows: !task.works ? [] : kept(screen.saved?.work) ? screen.saved.work : task.tests.map(blank(cells)), version: 0, at: 0 }))
  const set = (rows) => {
    setState((s) => ({ ...s, rows, version: s.version + 1 }))
    screen.save({ work: rows })
  }
  return { cells, rows: state.rows, version: state.version, at: state.at, set, pick: (at) => setState((s) => ({ ...s, at })) }
}

/** What the rows come to, in words (engine/caught.js): why they are no checks yet, or ''. */
export const checksSay = (found) => (!found.why ? ''
  : found.why === 'unfilled' ? tr(`第 ${found.row + 1} 行还没有填完。`, `Row ${found.row + 1} is not filled in yet.`)
  : found.why === 'never' ? `${tr(`第 ${found.row + 1} 行：`, `Row ${found.row + 1}: `)}${L(found.said)}`
  : tr(`第 ${found.row + 1} 行的预期不对：对的作品在这一行给出的不是这些数。`, `Row ${found.row + 1} expects the wrong thing: a sound work does not give these numbers on it.`))

export default function Checks({ checks, gives, catches, verdict, phone }) {
  const { cells, rows } = checks
  const field = (c) => (row, set) => (c.shape === 'bits'
    ? <BitsField label={c.label} value={row[c.name]} onChange={(v) => set({ ...row, [c.name]: v })} />
    : <NumberField label={c.label} value={row[c.name] ?? ''} onChange={(v) => set({ ...row, [c.name]: Number(v) })} phone={phone} />)
  const text = (c, row) => (c.shape === 'bits' ? <span className="bf-text">{row[c.name].join('')}</span> : row[c.name] ?? '—')
  const columns = [
    ...cells.map((c) => ({ key: c.name, label: c.label, cell: (row) => text(c, row), edit: field(c) })),
    { key: 'gives', label: T('这一样给出'), cell: (_, k) => <span className={catches(k) ? 'ck-caught' : ''}>{gives(k) ?? '—'}</span> },
  ]
  return (
    <div className="ck">
      <RowTable phone={phone} rows={rows} columns={columns} onChange={checks.set} fixed blank={blank(cells)} rowClass={(k) => (k === checks.at ? 'is-on' : '')} onPick={checks.pick} form={(row, set) => cells.map((c) => <div key={c.name}>{c.shape === 'bits' && <span className="bf-label">{L(c.label)}</span>}{field(c)(row, set)}</div>)} formTitle={(k) => T(`第 ${k + 1} 行`, `Row ${k + 1}`)} />
      {verdict && <Verdict pass={verdict.pass}>{verdict.text}</Verdict>}
    </div>
  )
}
