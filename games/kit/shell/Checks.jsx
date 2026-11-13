import { useState } from 'react'
import { TreeButton, TreeList } from '../strip/TreePick.jsx'
import BitsField from './BitsField.jsx'
import { ChoiceField, Field, InlineChoice } from './FormFields.jsx'
import NumberField from './NumberField.jsx'
import RowTable from './RowTable.jsx'
import Verdict from './Verdict.jsx'
import { L, T, tr } from './i18n.js'

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

const read = (cell, row) => cell.read ? cell.read(row) : row[cell.name]
const placeholder = (cell) => <span className="ck-placeholder">{L(cell.placeholder)}</span>

function display(cell, row) {
  const value = read(cell, row)
  switch (cell.shape) {
    case 'bits': return <span className="bf-text">{value.join('')}</span>
    case 'number': return value ?? '—'
    case 'tree': return value ? L(cell.build.text(value)) : placeholder(cell)
    case 'tree-list': return value.length
      ? <span className="ck-lines">{value.map((item, k) => <span key={k}>{`${k + 1}. ${L(cell.build.text(item))}`}</span>)}</span>
      : placeholder(cell)
    case 'choice': {
      const option = cell.options.find((o) => o.value === value)
      return option ? L(option.label) : placeholder(cell)
    }
  }
}

function edit(cell, row, set, at, phone) {
  const value = read(cell, row)
  const change = (value) => set(cell.write ? cell.write(row, value) : { ...row, [cell.name]: value })
  const props = { value, onChange: change }
  switch (cell.shape) {
    case 'bits': return <BitsField label={cell.label} {...props} />
    case 'number': return <NumberField label={cell.label} value={value ?? ''} onChange={(v) => change(Number(v))} phone={phone} />
    case 'choice': return phone ? <ChoiceField label={cell.label} options={cell.options} {...props} /> : <InlineChoice options={cell.options} unset={cell.placeholder} {...props} />
    case 'tree':
    case 'tree-list': {
      const tree = { ...props, build: cell.build, title: cell.title(at), scope: `${cell.scope}:${at}` }
      return cell.shape === 'tree' ? <TreeButton placeholder={cell.placeholder} {...tree} /> : <TreeList addLabel={cell.addLabel} kept={cell.kept?.(row)} {...tree} />
    }
  }
}

function CellForm({ cell, row, set, at }) {
  if (cell.fixed?.(row)) {
    const value = display(cell, row)
    return <Field label={cell.fixedLabel}>{cell.shape === 'tree' ? <span className="ff-fixed">{value}</span> : value}</Field>
  }
  const field = edit(cell, row, set, at, true)
  if (cell.shape === 'choice') return field
  if (cell.shape === 'bits') return <div><span className="bf-label">{L(cell.label)}</span>{field}</div>
  if (cell.shape === 'number') return <div>{field}</div>
  return <Field label={cell.label}>{field}</Field>
}

/** Each row is a check. The shape of a value chooses its table display and editor. */
export default function Checks({ cells, rows, onChange, result, rowClass, onPick, verdict, phone, ...table }) {
  const columns = cells.map((cell) => ({
    key: cell.name, label: cell.label, align: cell.align,
    cell: (row) => display(cell, row),
    edit: cell.readonly ? null : (row, set, at) => cell.fixed?.(row) ? display(cell, row) : edit(cell, row, set, at, false),
  }))
  if (result) columns.push({
    key: 'result',
    label: result.label,
    cell: (_, k) => {
      const value = result.at(k)
      return value ? <span className={value.tone ? `ck-${value.tone}` : ''}>{value.text}</span> : result.empty
    },
  })
  return (
    <div className="ck">
      <RowTable {...table} phone={phone} rows={rows} columns={columns} onChange={onChange} rowClass={rowClass} onPick={onPick} form={(row, set, at) => cells.map((cell) => <CellForm key={cell.name} cell={cell} row={row} set={set} at={at} />)} />
      {verdict && <Verdict pass={verdict.pass}>{verdict.text}</Verdict>}
    </div>
  )
}
