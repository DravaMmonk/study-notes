// Values made of cells, edited as cells: a matrix (a grid of numbers, shaded by value, painted with a brush), a row of
// numbers, a table of records (a list of objects of scalars, a map of scalars), and a waveform (a value a tick, one
// row per signal). Type into a cell, move with the arrow keys and Enter, paste a block from a spreadsheet (it spreads
// from the cell, adding rows and columns as it needs), add and remove rows and columns. Every change sets the whole
// value at the field's path: one operation, which the next change of the same field stands for (form.js pushOp).
import { useEffect, useRef, useState } from 'react'
import { Brush, Minus, Plus, X } from 'lucide-react'
import { tr } from '../shell/i18n.js'
import { blank, cellText, cellValue, gridRows, gridValue, nullable, pastedCells, tableOf, tableValue, tickValue, tickValues, toggled } from './form.js'

/** Focus the cell at (r, c) of the table holding `from`. */
const focusCell = (from, r, c) => from.closest('table')?.querySelector(`[data-r="${r}"][data-c="${c}"]`)?.focus()

/** Arrow keys and Enter move between cells; Left and Right only from the edge of what is typed. */
function moveKey(e, r, c) {
  const el = e.currentTarget
  const edge = el.selectionStart === undefined || el.selectionStart === null
  const at = (dr, dc) => { e.preventDefault(); focusCell(el, r + dr, c + dc) }
  if (e.key === 'ArrowUp') at(-1, 0)
  else if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) at(1, 0)
  else if (e.key === 'ArrowLeft' && (edge || el.selectionStart === 0)) at(0, -1)
  else if (e.key === 'ArrowRight' && (edge || el.selectionEnd === String(el.value).length)) at(0, 1)
}

/** One cell: typed text kept while it is not a value of the cell's schema yet; a choice or a switch where it is one. */
function Cell({ value, schema, r, c, onSet, onPaste, style, label }) {
  const [draft, setDraft] = useState(cellText(value))
  const [bad, setBad] = useState(false)
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) { setDraft(cellText(value)); setBad(false) } }, [value])
  const common = { 'data-r': r, 'data-c': c, 'aria-label': label, onKeyDown: (e) => moveKey(e, r, c) }
  if (schema.type === 'bool') return <input type="checkbox" className="cell-check" checked={Boolean(value)} onChange={(e) => onSet(e.target.checked)} {...common} />
  const options = schema.type === 'oneOf' ? schema.values : null
  if (options) {
    return (
      <select className="cell" value={cellText(value)} onChange={(e) => onSet(cellValue(schema, e.target.value))} {...common}>
        {value === undefined && <option value="" />}
        {options.map((v) => <option key={String(v)} value={cellText(v)}>{v === null ? '—' : String(v)}</option>)}
      </select>
    )
  }
  return (
    <input
      className={`cell ${bad ? 'is-bad' : ''}`} value={draft} style={style} placeholder={value === null ? '—' : ''} spellCheck={false} {...common}
      onFocus={(e) => { focused.current = true; e.target.select() }}
      onBlur={() => { focused.current = false; setDraft(cellText(value)); setBad(false) }}
      onChange={(e) => {
        setDraft(e.target.value)
        const v = cellValue(schema, e.target.value)
        setBad(v === undefined)
        if (v !== undefined) onSet(v)
      }}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text/plain')
        const block = pastedCells(text)
        if (block.length > 1 || block[0].length > 1) {
          e.preventDefault()
          onPaste(block)
        }
      }}
    />
  )
}

/** The shade of a number among the matrix's numbers. */
const shade = (v, lo, hi) => (typeof v === 'number' && hi > lo ? { '--shade': `${Math.round((100 * (v - lo)) / (hi - lo)) * 0.42}%` } : undefined)

/**
 * A grid of cells: rows of values (ragged rows read as wide as the widest). colSchema(c) types a column; header and
 * rowHeads label them (null: numbered); the rest says what may be added and removed.
 */
function Sheet({ rows, colSchema, onRows, header = null, rowHeads = null, shaded = false, addRow, addCol, removeRow, removeCol, brush = null, label, one = false }) {
  const width = Math.max(1, ...rows.map((r) => r.length), header?.length ?? 0)
  const nums = rows.flat().filter((v) => typeof v === 'number')
  const [lo, hi] = [Math.min(...nums), Math.max(...nums)]
  const painting = useRef(false)
  useEffect(() => {
    const up = () => { painting.current = false }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])
  const set = (r, c, v) => onRows(rows.map((row, i) => (i === r ? Array.from({ length: Math.max(row.length, c + 1) }, (_, j) => (j === c ? v : row[j] ?? blank(colSchema(j), {}))) : row)))
  // A pasted block lands from (r, c), the table growing to hold it.
  const paste = (r, c, block) => {
    const next = rows.map((row) => [...row])
    block.forEach((line, i) => {
      if (!next[r + i]) next[r + i] = Array.from({ length: width }, (_, j) => blank(colSchema(j), {}))
      line.forEach((text, j) => {
        const v = cellValue(colSchema(c + j), text)
        if (v !== undefined) next[r + i][c + j] = v
      })
    })
    onRows(next)
  }
  const paint = (r, c) => brush !== null && set(r, c, brush)
  return (
    <div className={`sheet ${one ? 'is-one' : ''}`}>
      <table className={`cells ${shaded ? 'is-shaded' : ''} ${brush !== null ? 'is-brush' : ''}`} aria-label={label}>
        {!one && (
          <thead>
            <tr>
              <th />
              {Array.from({ length: width }, (_, c) => (
                <th key={c} scope="col">
                  <span>{header ? header[c] : c}</span>
                  {removeCol && width > 1 && <button type="button" className="cell-x" onClick={() => removeCol(c)} aria-label={tr(`去掉第 ${c} 列`, `Remove column ${c}`)}><X size={10} /></button>}
                </th>
              ))}
              {addCol && <th><button type="button" className="cell-add" onClick={addCol} aria-label={tr('加一列')}><Plus size={12} /></button></th>}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {!one && (
                <th scope="row">
                  <span>{rowHeads ? rowHeads[r] : r}</span>
                  {removeRow && <button type="button" className="cell-x" onClick={() => removeRow(r)} aria-label={tr(`去掉第 ${r} 行`, `Remove row ${r}`)}><X size={10} /></button>}
                </th>
              )}
              {Array.from({ length: width }, (_, c) => (
                <td
                  key={c}
                  onPointerDown={(e) => { if (brush !== null) { e.preventDefault(); painting.current = true; paint(r, c) } }}
                  onPointerEnter={() => painting.current && paint(r, c)}
                >
                  <Cell value={row[c]} schema={colSchema(c)} r={r} c={c} onSet={(v) => set(r, c, v)} onPaste={(block) => paste(r, c, block)} style={shaded ? shade(row[c], lo, hi) : undefined} label={`${label} ${r},${c}`} />
                </td>
              ))}
              {one && addCol && <td><button type="button" className="cell-add" onClick={addCol} aria-label={tr('加一个')}><Plus size={12} /></button></td>}
              {one && removeCol && row.length > 0 && <td><button type="button" className="cell-add" onClick={() => removeCol(row.length - 1)} aria-label={tr('去掉最后一个')}><Minus size={12} /></button></td>}
            </tr>
          ))}
        </tbody>
      </table>
      {addRow && <button type="button" className="cell-add is-row" onClick={addRow} aria-label={tr('加一行')}><Plus size={12} /></button>}
    </div>
  )
}

/**
 * A matrix of numbers (or a flat list of them read `cols` to a row, or as a square): shaded by value, a brush to paint
 * cells with.
 */
export function GridField({ field, onSet, label }) {
  const flat = field.cols !== null && field.cols !== undefined
  const rows = gridRows(field)
  const put = (next) => onSet(gridValue(field, next))
  const [brush, setBrush] = useState(null)
  const zero = blank(field.cell, {})
  const width = Math.max(1, ...rows.map((r) => r.length))
  return (
    <div className="grid-field">
      <Sheet
        rows={rows} colSchema={() => field.cell} onRows={put} shaded brush={brush} label={label}
        addRow={field.cols === 'square' ? null : () => put([...rows, Array.from({ length: width }, () => zero)])}
        removeRow={rows.length > 1 && field.cols !== 'square' ? (r) => put(rows.filter((_, i) => i !== r)) : null}
        addCol={flat ? null : () => put(rows.map((r) => [...r, zero]))}
        removeCol={flat ? null : (c) => put(rows.map((r) => r.filter((_, j) => j !== c)))}
      />
      <div className="brush">
        <button type="button" className={`kit-btn is-label ${brush !== null ? 'is-on' : ''}`} onClick={() => setBrush(brush === null ? zero : null)} aria-pressed={brush !== null} title={tr('刷子：按住拖过格子，涂成这个值')}><Brush size={13} aria-hidden="true" /></button>
        {brush !== null && <input className="cell" value={cellText(brush)} onChange={(e) => { const v = cellValue(field.cell, e.target.value); if (v !== undefined) setBrush(v) }} aria-label={tr('刷子的值')} />}
      </div>
    </div>
  )
}

/** A list of numbers in one row. */
export function NumbersField({ field, onSet, label }) {
  const value = Array.isArray(field.value) ? field.value : []
  return (
    <Sheet
      one rows={[value]} colSchema={() => field.cell} onRows={(rows) => onSet(rows.flat())} label={label}
      addCol={() => onSet([...value, value.at(-1) ?? blank(field.cell, {})])} removeCol={(c) => onSet(value.filter((_, i) => i !== c))}
    />
  )
}

/**
 * A list of records (objects of scalars, or maps of scalars) as a table, a column a field; a map of scalars as a table
 * of keys and values.
 */
export function TableField({ field, onSet, label }) {
  const [key, setKey] = useState('')
  if (field.keyed) {
    const table = tableOf(field)
    const schema = field.columns[0].schema
    return (
      <div className="table-field">
        <Sheet
          rows={table.rows} rowHeads={table.heads} header={['']} colSchema={() => schema} label={label}
          onRows={(rows) => onSet(tableValue(field, table, rows))}
          removeRow={(r) => onSet(tableValue(field, { ...table, heads: table.heads.filter((_, i) => i !== r) }, table.rows.filter((_, i) => i !== r)))}
        />
        <NewKey value={key} setValue={setKey} taken={table.heads} onAdd={(k) => onSet({ ...field.value, [k]: blank(schema, {}) })} />
      </div>
    )
  }
  const items = Array.isArray(field.value) ? field.value : []
  const table = tableOf(field)
  const { columns } = table
  const fresh = () => Object.fromEntries(columns.filter((col) => !col.optional || !field.columns).map((col) => [col.key, blank(col.schema, {})]))
  return (
    <div className="table-field">
      <Sheet
        rows={table.rows} header={columns.map((c) => c.key)} colSchema={(j) => columns[j]?.schema ?? field.cell} label={label}
        onRows={(rows) => onSet(tableValue(field, table, rows))}
        addRow={() => onSet([...items, fresh()])}
        removeRow={(r) => onSet(items.filter((_, i) => i !== r))}
        removeCol={field.columns ? null : (j) => onSet(items.map((x) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== columns[j].key))))}
      />
      {!field.columns && <NewKey value={key} setValue={setKey} taken={columns.map((c) => c.key)} onAdd={(k) => onSet(items.map((x) => ({ ...x, [k]: blank(field.cell, {}) })))} />}
    </div>
  )
}

function NewKey({ value, setValue, taken, onAdd }) {
  return (
    <form className="field-row new-key" onSubmit={(e) => { e.preventDefault(); if (value && !taken.includes(value)) onAdd(value); setValue('') }}>
      <input className="field-input is-key" value={value} onChange={(e) => setValue(e.target.value)} aria-label={tr('新的键')} placeholder="+" />
    </form>
  )
}

/* ---------- ticks ---------- */

/** One row of ticks: click (or drag) to flip bits, type a number into a cell, Delete for 「—」. */
function TickRow({ values, cell, onSet, head = null, onRemove = null, label }) {
  const [draft, setDraft] = useState(values)
  const [editing, setEditing] = useState(null)
  const paint = useRef(null) // the value a drag paints, while it lasts
  const now = useRef(values)
  const show = (next) => { now.current = next; setDraft(next) }
  const key = JSON.stringify(values)
  useEffect(() => { if (paint.current === null) show(JSON.parse(key)) }, [key])
  useEffect(() => {
    const up = () => {
      if (paint.current === null) return
      paint.current = null
      onSet(now.current)
    }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [onSet])
  const empty = nullable(cell)
  const put = (k, v) => show(now.current.map((x, i) => (i === k ? v : x)))
  const commit = (k, v) => onSet(draft.map((x, i) => (i === k ? v : x)))
  const press = (e, k) => {
    const go = (j) => { e.preventDefault(); e.currentTarget.parentElement.children[j]?.focus() }
    if (e.key === 'ArrowRight') go(k + 1)
    else if (e.key === 'ArrowLeft') go(k - 1)
    else if (e.key === ' ') { e.preventDefault(); commit(k, toggled(draft[k])) }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && empty) { e.preventDefault(); commit(k, null) }
    else if (/^\d$/.test(e.key) && cellValue(cell, e.key) !== undefined && cell.type !== 'oneOf') setEditing(k)
    else if (e.key === '0' || e.key === '1') commit(k, Number(e.key))
  }
  return (
    <div className="tick-row">
      {head !== null && <span className="tick-head">{head}{onRemove && <button type="button" className="cell-x" onClick={onRemove} aria-label={tr('去掉这一行')}><X size={10} /></button>}</span>}
      <div className="ticks" role="group" aria-label={label}>
        {draft.map((v, k) => (editing === k ? (
          <input
            key={k} className="tick is-typing" autoFocus defaultValue={cellText(v)} aria-label={`${label} ${k}`}
            onBlur={(e) => { const x = cellValue(cell, e.target.value); setEditing(null); if (x !== undefined) commit(k, x) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur() }}
          />
        ) : (
          <button
            key={k} type="button" tabIndex={0} aria-label={`${label} ${k}: ${v === null ? '—' : v}`}
            className={`tick ${v === 1 || v === true ? 'is-high' : v === 0 || v === false ? 'is-low' : v === null || v === undefined ? 'is-none' : 'is-value'} ${k % 8 === 0 ? 'is-mark' : ''}`}
            onPointerDown={(e) => {
              if (typeof v === 'number' && v !== 0 && v !== 1) return
              e.preventDefault()
              paint.current = toggled(v)
              put(k, paint.current)
            }}
            onPointerEnter={() => paint.current !== null && put(k, paint.current)}
            onDoubleClick={() => setEditing(k)}
            onKeyDown={(e) => press(e, k)}
          >
            {v === null || v === undefined ? '—' : v === 0 || v === 1 || typeof v === 'boolean' ? '' : String(v)}
          </button>
        )))}
      </div>
      <span className="tick-len">
        <button type="button" className="cell-add" onClick={() => onSet([...draft, draft.at(-1) ?? 0])} aria-label={tr('多一拍')}><Plus size={11} /></button>
        <button type="button" className="cell-add" disabled={!draft.length} onClick={() => onSet(draft.slice(0, -1))} aria-label={tr('少一拍')}><Minus size={11} /></button>
        <small>{draft.length}</small>
      </span>
    </div>
  )
}

/** The tick numbers over a strip. */
const Ruler = ({ length }) => (
  <div className="tick-row is-ruler" aria-hidden="true">
    <span className="tick-head" />
    <div className="ticks">{Array.from({ length }, (_, k) => <span key={k} className="tick-n">{k % 4 === 0 ? k : ''}</span>)}</div>
  </div>
)

/** A list of values a tick (or a string of 0s and 1s). */
export function TicksField({ field, onSet, label }) {
  const values = tickValues(field)
  return (
    <div className="wave is-single">
      <Ruler length={values.length} />
      <TickRow values={values} cell={field.cell} label={label} onSet={(next) => onSet(tickValue(field, next))} />
    </div>
  )
}

/** A map of tick lists: one row a signal, the ticks lined up. */
export function WaveField({ field, onEdit, label }) {
  const [key, setKey] = useState('')
  const rows = Object.entries(field.value ?? {})
  const length = Math.max(0, ...rows.map(([, v]) => (Array.isArray(v) ? v.length : 0)))
  return (
    <div className="wave">
      <Ruler length={length} />
      {rows.map(([k, v]) => (
        <TickRow
          key={k} head={k} values={Array.isArray(v) ? v : []} cell={field.cell} label={`${label} ${k}`}
          onSet={(next) => onEdit([...field.path, k], { set: next }, 'list')}
          onRemove={() => onEdit([...field.path, k], { unset: true }, null)}
        />
      ))}
      <NewKey value={key} setValue={setKey} taken={rows.map(([k]) => k)} onAdd={(k) => onEdit([...field.path, k], { set: Array.from({ length }, () => 0) }, 'list')} />
    </div>
  )
}
