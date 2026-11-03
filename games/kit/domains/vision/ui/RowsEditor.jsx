import { useState } from 'react'
import { parseNumber as parse } from '../grid.js'
import { tr } from '../../../shell/i18n.js'

/** Keep incomplete numeric input intact while external answer changes remain visible. */
export function NumberField({ value, onChange, ...rest }) {
  const [text, setText] = useState(value ?? '')
  const shown = parse(String(text)) === (value ?? null) ? text : value ?? ''
  return <input {...rest} inputMode="text" autoComplete="off" spellCheck={false} value={shown} onChange={(e) => { setText(e.target.value); onChange(parse(e.target.value)) }} />
}

const colour = (pixel) => `rgb(${pixel.map((v) => Math.round(Math.min(1, Math.max(0, v ?? 0)) * 255)).join(',')})`

/** Edit one colour sample at a time; channel count never widens the answer grid. */
function ColourEditor({ rows, set, selected, onSelect }) {
  const [own, setOwn] = useState({ x: 0, y: 0 })
  const at = selected ?? own
  const select = (point) => { setOwn(point); onSelect?.(point) }
  const pixel = rows[at.y][at.x]
  const channels = [tr('红', 'Red'), tr('绿', 'Green'), tr('蓝', 'Blue')]
  return <div className="vi-colour-editor">
    <p className="vi-label">{tr('点选要修改的像素', 'Select a pixel to edit')}</p>
    <div className="vi-table-scroll" role="region" aria-label={tr('可编辑图像', 'Editable image')} tabIndex={0}>
      <div className="vi-pixel-buttons" style={{ '--columns': rows[0].length }}>
        {rows.flatMap((row, y) => row.map((value, x) => <button key={`${x},${y}`} type="button" style={{ backgroundColor: colour(value) }} aria-label={tr(`像素 (${x}, ${y})`, `Pixel (${x}, ${y})`)} aria-pressed={at.x === x && at.y === y} onClick={() => select({ x, y })}>
          <span>{x}, {y}</span>
        </button>))}
      </div>
    </div>
    <fieldset className="vi-channel-fields">
      <legend>{tr('当前像素', 'Selected pixel')} ({at.x}, {at.y})</legend>
      {pixel.map((value, k) => <label key={k}>
        <span><i style={{ backgroundColor: ['#db6553', '#68a56b', '#5c88c6'][k] }} />{'RGB'[k]} · {channels[k]}</span>
        <NumberField value={value} aria-label={`(${at.x}, ${at.y}) ${'RGB'[k]}`} onChange={(next) => set(at.y, at.x, k, next)} />
      </label>)}
    </fieldset>
  </div>
}

/** Scalar matrices can scroll deliberately; RGB samples use a compact pixel inspector. */
export default function RowsEditor({ rows, onChange, selected, onSelect }) {
  const set = (y, x, k, n) => onChange(rows.map((r, py) => py !== y ? r : r.map((v, px) => px !== x ? v : Array.isArray(v) ? v.map((c, j) => j === k ? n : c) : n)))
  if (Array.isArray(rows[0][0])) return <ColourEditor {...{ rows, set, selected, onSelect }} />
  return <div className="vi-table-scroll" role="region" aria-label={tr('填写结果', 'Enter the result')} tabIndex={0}>
    <table className="vi-rows" style={{ '--columns': rows[0].length }}>
      <thead><tr><th />{rows[0].map((_, x) => <th key={x} scope="col">{x}</th>)}</tr></thead>
      <tbody>{rows.map((r, y) => <tr key={y}>
        <th scope="row">{y}</th>
        {r.map((v, x) => <td key={x} className={selected?.x === x && selected.y === y ? 'is-active' : undefined}><NumberField value={v} aria-label={`(${x}, ${y})`} onFocus={() => onSelect?.({ x, y })} onChange={(n) => set(y, x, null, n)} /></td>)}
      </tr>)}</tbody>
    </table>
  </div>
}
