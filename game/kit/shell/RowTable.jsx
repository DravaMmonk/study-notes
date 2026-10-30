import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import Sheet from './Sheet.jsx'
import { L, tr } from './i18n.js'

// A table the player fills in, row by row, the same in every game (a 填表格 level: the test cases of a declaration, …).
// On a desktop the rows are edited in place: each column that can be changed gives its editor (`edit`), a × at the row's
// end deletes it, and a small button under the table adds a blank row. On a phone the table only shows the rows, in a window of its own that scrolls sideways: each column is as wide as its text up
// to a limit (then the text wraps), and each row is tall enough to tap; and tapping one opens it in a sheet, like a part's:
// what is changed there is changed at once, a Delete under the fields removes the row, and the sheet just closes. A
// large button under the table adds a blank row and opens it. The game gives the columns and the form's fields
// (FormFields.jsx has the shared ones).
//
//   rows            [row]                          onChange(rows)   the rows saved (absent: the table is read only)
//   columns         [{ key, label, cell(row, k), edit?(row, set) the in-place editor on a desktop, align?: 'start'
//                    (default centred), className? }]
//   phone           edit through the form rather than in place
//   form(row, set) → the fields editing a row (set(next) replaces it)      blank() → a new row
//   max?            how many rows at most          addLabel, formTitle(k)   { zh, en } pairs or a function
//   rowClass?(k), onPick?(k) (a row picked, also when it is opened), empty? what the table says with no rows
//   fixed           the rows are set out beforehand: none added, none deleted, each only filled in
//   tip             on a phone, a line under the table saying a row opens when tapped (a default unless it says)

export default function RowTable({ rows, columns, onChange = null, form, blank, max = Infinity, addLabel, formTitle, rowClass = () => '', onPick = () => {}, empty = null, phone = false, fixed = false, tip = null }) {
  const [open, setOpen] = useState(null) // the row open in the sheet
  const editable = Boolean(onChange)
  // On a desktop rows are changed in place; on a phone, in the sheet.
  const inPlace = editable && !phone
  const setRow = (k, row) => onChange(rows.map((r, j) => (j === k ? row : r)))
  const add = () => {
    onChange([...rows, blank()])
    onPick(rows.length)
    if (!inPlace) setOpen(rows.length)
  }
  const remove = (k) => {
    onChange(rows.filter((_, j) => j !== k))
    setOpen(null)
  }
  const cellClass = (c) => `${c.align === 'start' ? 'is-start' : ''} ${c.className ?? ''}`
  const text = (x) => L(typeof x === 'function' ? x(open) : x)
  return (
    <div className="rt">
      <div className="rt-scroll">
        <table className="rt-table">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key} className={cellClass(c)}><div className="rt-cell">{L(c.label)}</div></th>)}
              {inPlace && !fixed && <th aria-label={tr('删除', 'Delete')} />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, k) => (
              <tr
                key={k}
                className={`rt-row ${editable && !inPlace ? 'is-editable' : ''} ${rowClass(k)}`}
                onClick={() => { onPick(k); if (editable && !inPlace) setOpen(k) }}
                tabIndex={editable && !inPlace ? 0 : undefined}
                onKeyDown={(e) => editable && !inPlace && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(k), setOpen(k))}
              >
                {columns.map((c) => <td key={c.key} className={cellClass(c)}><div className="rt-cell">{inPlace && c.edit ? c.edit(row, (next) => setRow(k, next)) : c.cell(row, k)}</div></td>)}
                {inPlace && !fixed && (
                  <td>
                    <button type="button" className="rt-drop" aria-label={tr('删除这一行', 'Delete this row')} onClick={(e) => { e.stopPropagation(); remove(k) }}><X size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && empty && <p className="rt-empty">{L(empty)}</p>}
      </div>
      {editable && !inPlace && rows.length > 0 && <p className="rt-tip">{L(tip ?? { zh: '点按任意一行即可修改。', en: 'Tap a row to edit it.' })}</p>}
      {editable && !fixed && rows.length < max && (
        <button type="button" className="rt-add" onClick={add}>
          <Plus size={18} /> {L(addLabel)}
        </button>
      )}
      {open !== null && rows[open] && (
        <Sheet title={text(formTitle)} onClose={() => setOpen(null)}>
          <div className="rt-form">
            {form(rows[open], (row) => setRow(open, row))}
            {!fixed && <div className="sheet-actions"><button type="button" className="sheet-remove" onClick={() => remove(open)}><Trash2 size={15} />{tr('删除', 'Delete')}</button></div>}
          </div>
        </Sheet>
      )}
    </div>
  )
}
