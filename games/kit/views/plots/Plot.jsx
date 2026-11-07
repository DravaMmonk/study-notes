import { useState } from 'react'
import { numberText } from '../../engine/number.js'
import { L } from '../../shell/i18n.js'
import { WORDS } from '../../shell/words.js'
import { rangeOf, rowOf } from './range.js'

// A grey grid of one or two rows as functions (the view `plot`, games/DESIGN.md 6.10): each row a function of its column, a
// sample a dot on a stem from zero, the samples joined faintly to show the shape. With `want`, the values wanted are
// rings on the same axes and a result that misses one (beyond `tolerance`) is marked. With `curve(x, row)`, the samples
// are of a function known between them too (a wave, an example): it is drawn whole, x in columns, in place of the
// line joining them. Pointing at a column reads it, `xOf(column)` the x written (the column itself by default). `card`
// draws a small one with nothing to point at.
//
// Drawn one unit a screen pixel, so lines and dots look the same at every size: samples `pitch` apart, a plot as wide
// as its samples need within `min`…`max` (narrower frames scale it down), a row `row` high. `fit` changes any of these
// (a profile lines its samples up under the picture's columns).

const FULL = { pitch: 22, pad: 8, min: 96, max: 640, row: () => 56, r: 3 }
const CARD = { pitch: 12, pad: 5, min: 48, max: 120, row: (rows) => (rows > 1 ? 26 : 40), r: 2.2 }
const PAD_Y = 6

function Row({ got, want, curve, tolerance, lo, hi, at, x, along, width, height, r }) {
  const y = (v) => PAD_Y + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (height - 2 * PAD_Y)
  const zero = y(0)
  const path = (list) => list.map((v, j) => `${j ? 'L' : 'M'}${x(j).toFixed(1)},${y(v).toFixed(1)}`).join('')
  return (
    <g>
      <line className="pl-zero" x1={0} x2={width} y1={zero} y2={zero} />
      {want && <path className="pl-want-line" d={path(want)} />}
      {curve && <path className="pl-curve" d={along.map((t, i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(curve(t)).toFixed(1)}`).join('')} />}
      {got && !curve && <path className="pl-line" d={path(got)} />}
      {got && got.map((v, j) => <line key={`s${j}`} className="pl-stem" x1={x(j)} x2={x(j)} y1={zero} y2={y(v)} />)}
      {want && want.map((v, j) => <circle key={`w${j}`} className="pl-want" cx={x(j)} cy={y(v)} r={r + 1.2} />)}
      {got && got.map((v, j) => <circle key={`g${j}`} className={`pl-dot ${want && Math.abs(v - want[j]) > tolerance ? 'is-miss' : ''}`} cx={x(j)} cy={y(v)} r={r} />)}
      {at !== null && <line className="pl-at" x1={x(at)} x2={x(at)} y1={PAD_Y} y2={height - PAD_Y} />}
    </g>
  )
}

export default function Plot({ value, want, curve, tolerance = 0, card = false, fit, xOf = (j) => j }) {
  const [at, setAt] = useState(null)
  const shown = value ?? want
  const { w: n, h: rows } = shown
  const size = { ...(card ? CARD : FULL), ...fit }
  const width = Math.round(Math.min(size.max, Math.max(size.min, n * size.pitch + 2 * size.pad)))
  const step = (width - 2 * size.pad) / n
  const x = (j) => size.pad + (j + 0.5) * step
  const r = Math.min(size.r, step / 3.5)
  const height = size.row(rows)
  // Where the curve is drawn: every 2 px across the plot, in columns.
  const along = curve ? Array.from({ length: Math.floor(width / 2) + 1 }, (_, i) => (i * 2 - size.pad) / step - 0.5) : []
  const { lo, hi } = rangeOf(value, want, curve && { data: Array.from({ length: rows }, (_, k) => along.map((t) => curve(t, k))).flat() })
  const pick = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const u = ((event.clientX - box.left) / box.width) * width
    const k = Math.min(rows - 1, Math.max(0, Math.floor(((event.clientY - box.top) / box.height) * rows)))
    setAt({ x: Math.min(n - 1, Math.max(0, Math.floor((u - size.pad) / step))), y: k })
  }
  const read = at && !card ? { got: value && rowOf(value, at.y)[at.x], want: want && rowOf(want, at.y)[at.x] } : null
  return (
    <div className={`pl ${card ? 'is-card' : ''}`}>
      <svg viewBox={`0 0 ${width} ${height * rows}`} width={width} height={height * rows} role="img" onPointerMove={card ? undefined : pick} onPointerDown={card ? undefined : pick} onPointerLeave={() => setAt(null)}>
        {Array.from({ length: rows }, (_, k) => (
          <g key={k} transform={`translate(0 ${k * height})`}>
            <Row got={value && rowOf(value, k)} want={want && rowOf(want, k)} curve={curve && ((t) => curve(t, k))} along={along} tolerance={tolerance} lo={lo} hi={hi} at={at && !card && at.y === k ? at.x : null} x={x} width={width} height={height} r={r} />
          </g>
        ))}
      </svg>
      {read && (
        <span className="pl-read">
          <i>{rows > 1 ? `(${xOf(at.x)}, ${at.y})` : `x = ${xOf(at.x)}`}</i>
          {read.got !== undefined && <b>{want ? `${L(WORDS.result)} ` : ''}{numberText(read.got)}</b>}
          {read.want !== undefined && <span>{L(WORDS.wanted)} {numberText(read.want)}</span>}
        </span>
      )}
    </div>
  )
}
