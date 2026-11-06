import { useState } from 'react'
import { numberText } from '../../engine/number.js'
import { L } from '../../shell/i18n.js'
import { WORDS } from '../../shell/words.js'
import { rangeOf, rowOf } from './range.js'

// A grey grid of one or two rows as functions (the view `plot`, games/DESIGN.md 6.10): each row a function of its column, a
// sample a dot on a stem from zero, the samples joined faintly to show the shape. With `want`, the values wanted are
// rings on the same axes and a result that misses one (beyond `tolerance`) is marked. Pointing at a column reads it.
// `card` draws a small one with nothing to point at.

const W = 320
const ROW = 64
const PAD = 8

function Row({ got, want, tolerance, lo, hi, at, card, height }) {
  const n = (got ?? want).length
  const x = (j) => PAD + ((j + 0.5) / n) * (W - 2 * PAD)
  const y = (v) => PAD + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (height - 2 * PAD)
  const zero = y(Math.min(hi, Math.max(lo, 0)))
  const path = (list) => list.map((v, j) => `${j ? 'L' : 'M'}${x(j).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const r = card ? 1.8 : Math.min(3, (W / n) / 4)
  return (
    <g>
      <line className="pl-zero" x1={PAD} x2={W - PAD} y1={zero} y2={zero} />
      {want && <path className="pl-want-line" d={path(want)} />}
      {got && <path className="pl-line" d={path(got)} />}
      {got && got.map((v, j) => <line key={`s${j}`} className="pl-stem" x1={x(j)} x2={x(j)} y1={zero} y2={y(v)} />)}
      {want && want.map((v, j) => <circle key={`w${j}`} className="pl-want" cx={x(j)} cy={y(v)} r={r + 1.2} />)}
      {got && got.map((v, j) => <circle key={`g${j}`} className={`pl-dot ${want && Math.abs(v - want[j]) > tolerance ? 'is-miss' : ''}`} cx={x(j)} cy={y(v)} r={r} />)}
      {at !== null && <line className="pl-at" x1={x(at)} x2={x(at)} y1={PAD} y2={height - PAD} />}
    </g>
  )
}

export default function Plot({ value, want, tolerance = 0, card = false }) {
  const [at, setAt] = useState(null)
  const shown = value ?? want
  const rows = shown.h
  const height = card ? 40 : ROW
  const { lo, hi } = rangeOf(value, want)
  const pick = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const u = (((event.clientX - box.left) / box.width) * W - PAD) / (W - 2 * PAD)
    const yRow = Math.min(rows - 1, Math.max(0, Math.floor(((event.clientY - box.top) / box.height) * rows)))
    setAt({ x: Math.min(shown.w - 1, Math.max(0, Math.floor(u * shown.w))), y: yRow })
  }
  const read = at && !card ? { got: value && rowOf(value, at.y)[at.x], want: want && rowOf(want, at.y)[at.x] } : null
  return (
    <div className={`pl ${card ? 'is-card' : ''}`}>
      <svg viewBox={`0 0 ${W} ${height * rows}`} role="img" onPointerMove={card ? undefined : pick} onPointerDown={card ? undefined : pick} onPointerLeave={() => setAt(null)}>
        {Array.from({ length: rows }, (_, k) => (
          <g key={k} transform={`translate(0 ${k * height})`}>
            <Row got={value && rowOf(value, k)} want={want && rowOf(want, k)} tolerance={tolerance} lo={lo} hi={hi} at={at && !card && at.y === k ? at.x : null} card={card} height={height} />
          </g>
        ))}
      </svg>
      {read && (
        <span className="pl-read">
          <i>{rows > 1 ? `(${at.x}, ${at.y})` : `x = ${at.x}`}</i>
          {read.got !== undefined && <b>{want ? `${L(WORDS.result)} ` : ''}{numberText(read.got)}</b>}
          {read.want !== undefined && <span>{L(WORDS.wanted)} {numberText(read.want)}</span>}
        </span>
      )}
    </div>
  )
}
