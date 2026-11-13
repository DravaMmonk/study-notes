import { useLayoutEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { L } from './i18n.js'
import Popover from './Popover.jsx'

// Rows of rules to fill in, the same in every game: a head (what the rows are about), then a row for each rule, its
// name on the left and its slots one after another, each a button that says what is written there and opens its editor
// (beside it on a desktop, in a sheet on a phone: Popover.jsx); a change holds at once. A row may be led by a control
// of its own, end with a few words, take one more slot (a + at its end) and be dropped (a × at its right); under the
// rows a button may add one. The game gives what each slot says and the editor of one slot; with no `editor` the rows
// are only read. 《证明完毕》's rule table (a connective's ways in, each premise a sentence) and its definition board (a
// function's rows, each right side a term) are both this.
//
//   head     { name, body } | null
//   rows     [{ name, lead?, slots: [{ text (null: nothing whole yet), bad? }], end?, empty? (what a row with no slot
//             says when only read), add?: { label, text?, run() }, drop?: { label, run() } }]
//   editor   { title(row, slot), render(row, slot), close?(row, slot) } | null
//   more     { text, run() } | null       blank   what an unfinished slot says       wide   names as wide as they read

export default function RuleRows({ head = null, rows, editor = null, more = null, blank, wide = false, className = '' }) {
  const [sheet, setSheet] = useState(null) // { row, slot, anchor }: the slot being written, and its button
  const buttons = useRef({}) // each slot's button, by `${row}.${slot}`
  // A slot just added gets its editor once its button is there to point at.
  useLayoutEffect(() => {
    if (sheet && !sheet.anchor) setSheet({ ...sheet, anchor: buttons.current[`${sheet.row}.${sheet.slot}`] })
  }, [sheet])
  const add = (k) => {
    rows[k].add.run()
    setSheet({ row: k, slot: rows[k].slots.length, anchor: null })
  }
  const close = () => {
    editor.close?.(sheet.row, sheet.slot)
    setSheet(null)
  }
  const editing = editor && sheet?.anchor && rows[sheet.row]?.slots[sheet.slot] !== undefined

  return (
    <div className={`rr ${wide ? 'is-wide' : ''} ${className}`}>
      {head && (
        <div className="rr-row is-head">
          <span className="rr-name">{head.name}</span>
          <span className="rr-body">{head.body}</span>
        </div>
      )}
      {rows.map((row, k) => (
        <div key={k} className="rr-row">
          <span className="rr-name">{row.name}</span>
          <span className="rr-body">
            {row.lead && <span className="rr-lead">{row.lead}</span>}
            {!row.slots.length && !editor && row.empty}
            {row.slots.map((slot, j) => (
              <span key={j} className="rr-item">
                <button
                  type="button"
                  ref={(el) => { buttons.current[`${k}.${j}`] = el }}
                  className={`rr-slot ${slot.text === null ? 'is-blank' : ''} ${slot.bad ? 'is-bad' : ''}`}
                  aria-expanded={sheet?.row === k && sheet?.slot === j}
                  disabled={!editor}
                  onClick={(event) => setSheet({ row: k, slot: j, anchor: event.currentTarget })}
                >
                  {slot.text ?? L(blank)}
                </button>
                {/* What comes between two slots stays with the one before it, so a wrapped row never starts with it. */}
                {j < row.slots.length - 1 ? <span className="rr-sep">；</span> : row.end && <span className="rr-end">{row.end}</span>}
              </span>
            ))}
            {editor && row.add && <button type="button" className="rr-add" onClick={() => add(k)} aria-label={L(row.add.label)}><Plus size={14} />{row.add.text}</button>}
          </span>
          {editor && row.drop && <button type="button" className="rr-drop" onClick={row.drop.run} aria-label={L(row.drop.label)}><X size={14} /></button>}
        </div>
      ))}
      {editor && more && <button type="button" className="rr-more" onClick={more.run}><Plus size={14} />{more.text}</button>}
      {editing && <Popover anchor={sheet.anchor} title={editor.title(sheet.row, sheet.slot)} onClose={close}>{editor.render(sheet.row, sheet.slot)}</Popover>}
    </div>
  )
}
