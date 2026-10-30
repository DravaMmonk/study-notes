import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import Sheet from './Sheet.jsx'
import { Dialog } from './Dialogs.jsx'
import { L, tr } from './i18n.js'

// A table the player fills in, row by row, the same in every game (a 填表格 level: the test cases of a declaration, …).
// On a desktop the rows are edited in place: each column that can be changed gives its editor (`edit`), a × at the row's
// end deletes it, and a small button under the table adds a blank row. On a phone the table only shows the rows, in a window of its own that scrolls sideways: each column is as wide as its text up
// to a limit (then the text wraps), and each row is tall enough to tap; and tapping one opens it in a form (a sheet on a phone, a
// panel on a desktop) where it is edited and saved, or deleted; a large button under the table adds a row through the
// same form. Leaving a form with changes not saved asks first. The game gives the columns and the form's fields
// (FormFields.jsx has the shared ones); the kit keeps the draft, the saving and the asking.
//
//   rows            [row]                          onChange(rows)   the rows saved (absent: the table is read only)
//   columns         [{ key, label, cell(row, k), edit?(row, set) the in-place editor on a desktop, align?: 'start'
//                    (default centred), className? }]
//   phone           edit through the form rather than in place
//   form(draft, set) → the fields editing a draft (set(next) replaces it)      blank() → a new row's draft
//   valid?(draft)   → '' or why it cannot be saved yet
//   max?            how many rows at most          addLabel, formTitle(k | null)   { zh, en } pairs or a function
//   rowClass?(k), onPick?(k) (a row picked, also when it is opened), empty? what the table says with no rows
//   fixed           the rows are set out beforehand: none added, none deleted, each only filled in
//   tip             on a phone, a line under the table saying a row opens when tapped (a default unless it says)

export default function RowTable({ rows, columns, onChange = null, form, blank, valid = () => '', max = Infinity, addLabel, formTitle, rowClass = () => '', onPick = () => {}, empty = null, phone = false, fixed = false, tip = null }) {
  const [open, setOpen] = useState(null) // { at: k | null (new), draft, saved }
  const [asking, setAsking] = useState(false)
  const editable = Boolean(onChange)
  // On a desktop rows are changed in place; on a phone, in the form.
  const inPlace = editable && !phone
  const setRow = (k, row) => onChange(rows.map((r, j) => (j === k ? row : r)))
  const start = (at) => {
    const draft = at === null ? blank() : rows[at]
    setOpen({ at, draft, saved: JSON.stringify(draft) })
  }
  const dirty = open && JSON.stringify(open.draft) !== open.saved
  const close = () => {
    setAsking(false)
    setOpen(null)
  }
  const leave = () => (dirty ? setAsking(true) : close())
  const save = () => {
    onChange(open.at === null ? [...rows, open.draft] : rows.map((r, k) => (k === open.at ? open.draft : r)))
    if (open.at === null) onPick(rows.length)
    close()
  }
  const remove = () => {
    onChange(rows.filter((_, k) => k !== open.at))
    close()
  }
  const why = open ? valid(open.draft) : ''
  const cellClass = (c) => `${c.align === 'start' ? 'is-start' : ''} ${c.className ?? ''}`
  const text = (x) => L(typeof x === 'function' ? x(open?.at ?? null) : x)
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
                onClick={() => { onPick(k); if (editable && !inPlace) start(k) }}
                tabIndex={editable && !inPlace ? 0 : undefined}
                onKeyDown={(e) => editable && !inPlace && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(k), start(k))}
              >
                {columns.map((c) => <td key={c.key} className={cellClass(c)}><div className="rt-cell">{inPlace && c.edit ? c.edit(row, (next) => setRow(k, next)) : c.cell(row, k)}</div></td>)}
                {inPlace && !fixed && (
                  <td>
                    <button type="button" className="rt-drop" aria-label={tr('删除这一行', 'Delete this row')} onClick={(e) => { e.stopPropagation(); onChange(rows.filter((_, j) => j !== k)) }}><X size={14} /></button>
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
        <button type="button" className="rt-add" onClick={() => (inPlace ? (onChange([...rows, blank()]), onPick(rows.length)) : start(null))}>
          <Plus size={18} /> {L(addLabel)}
        </button>
      )}
      {open && (
        <Sheet
          title={text(formTitle)}
          onClose={leave}
          footer={
            <div className="rt-form-foot">
              {open.at !== null && !fixed && <button type="button" className="rt-delete" onClick={remove}><X size={15} /> {tr('删除', 'Delete')}</button>}
              <span className="rt-why">{why ? L(why) : ''}</span>
              <button type="button" onClick={leave}>{tr('取消', 'Cancel')}</button>
              <button type="button" className="is-primary" disabled={Boolean(why)} onClick={save}>{tr('保存', 'Save')}</button>
            </div>
          }
        >
          <div className="rt-form">{form(open.draft, (draft) => setOpen({ ...open, draft }))}</div>
        </Sheet>
      )}
      {asking && (
        <Dialog
          top
          title={tr('放弃未保存的修改？', 'Discard unsaved changes?')}
          lines={[tr('这一条的修改尚未保存，关闭后将丢失。', 'The changes to this row have not been saved and will be lost.')]}
          actions={[[tr('放弃修改', 'Discard'), close], [tr('继续编辑', 'Keep editing'), () => setAsking(false)]]}
          onClose={() => setAsking(false)}
        />
      )}
    </div>
  )
}
