import { useState } from 'react'
import { tr } from '../i18n.js'
import { Rich } from './Rich.jsx'

// A line plot over one width (u from 0 to 1). `lines`: [{ curve, kind, label, steps }] where curve is a function of u
// or an array of samples, kind picks the stroke (target, yours, faint, error, seen) and `steps` draws an array as flat
// steps (pixels). `dots`: [{ u, v, kind, label }], drawn as stems with a dot ('sample'), a dot alone ('point') or a
// hollow ring ('ring'). Pointing at the plot (or tapping it) reads every line at that spot; with dots it snaps to the
// nearest sample, with step lines to the pixel. `span` is how many pixels the width is. Sizes are viewBox units.

const FINE = 160
const valueAt = (curve, u) => (typeof curve === 'function' ? curve(u) : curve[Math.min(curve.length - 1, Math.floor(u * curve.length))])
const fmt = (v) => (Number.isFinite(v) ? (Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3)) : '—')

export default function Plot({ lines = [], dots = [], width = 600, height = 200, lo = 0, hi = 1, ticks = [0, 0.5, 1], tickLabel = (t) => t, span = 32, left = 30, mark = null }) {
  const [at, setAt] = useState(null)
  const right = 8
  const top = 10
  const bottom = 12
  const x = (u) => left + u * (width - left - right)
  // Values beyond the range are drawn along its edge rather than outside the plot.
  const y = (v) => top + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (height - top - bottom)
  const path = ({ curve, steps }) => {
    if (steps) {
      const n = curve.length
      return curve.map((v, j) => `${j ? 'L' : 'M'}${x(j / n).toFixed(1)},${y(v).toFixed(1)}H${x((j + 1) / n).toFixed(1)}`).join('')
    }
    // Gaps (NaN) lift the pen, so a curve can be drawn only up to a point.
    let pen = false
    return Array.from({ length: FINE + 1 }, (_, i) => {
      const v = valueAt(curve, i / FINE)
      if (!Number.isFinite(v)) {
        pen = false
        return ''
      }
      const move = pen ? 'L' : 'M'
      pen = true
      return `${move}${x(i / FINE).toFixed(1)},${y(v).toFixed(1)}`
    }).join('')
  }

  const samples = dots.filter((d) => d.kind !== 'ring')
  const stepped = lines.find((line) => line.steps)
  const pick = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const u = Math.min(1, Math.max(0, (((event.clientX - box.left) / box.width) * width - left) / (width - left - right)))
    if (samples.length) {
      const nearest = samples.reduce((best, d) => (Math.abs(d.u - u) < Math.abs(best.u - u) ? d : best))
      setAt({ u: nearest.u, sample: samples.indexOf(nearest), of: samples.length })
    } else if (stepped) {
      const n = stepped.curve.length
      const j = Math.min(n - 1, Math.floor(u * n))
      setAt({ u: (j + 0.5) / n, pixel: j })
    } else setAt({ u })
  }
  const leave = (event) => event.pointerType === 'mouse' && setAt(null)

  // What each line (and each dot at the picked sample) reads at the picked spot.
  const readings = at
    ? [
        ...lines.map((line) => ({ kind: line.kind, label: line.label, v: valueAt(line.curve, at.u) })),
        ...dots.filter((d) => at.sample !== undefined && Math.abs(d.u - at.u) < 1e-9).map((d) => ({ kind: d.kind === 'ring' ? 'ring' : 'sample', label: d.label ?? (d.kind === 'ring' ? tr('参照点', 'reference') : tr('采样值', 'sampled value')), v: d.v, dot: true })),
      ]
    : []
  const where = !at ? '' : at.sample !== undefined ? tr(`第 ${at.sample} 个点 / ${at.of}`, `point ${at.sample} / ${at.of}`) : at.pixel !== undefined ? `x = ${at.pixel}` : `x = ${(at.u * span).toFixed(1)} px`

  return (
    <div className="bench-plot-wrap">
      <svg className="bench-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={tr('指向某处读取数值', 'Point at a spot to read it')} onPointerMove={pick} onPointerDown={pick} onPointerLeave={leave}>
        {ticks.map((t) => (
          <g key={t}>
            <line className={`bench-grid ${t === 0 && lo < 0 ? 'is-zero' : ''}`} x1={left} x2={width - right} y1={y(t)} y2={y(t)} />
            <text className="bench-tick" x={left - 6} y={y(t) + 4}>{tickLabel(t)}</text>
          </g>
        ))}
        {lines.map((line, i) => <path key={i} className={`bench-line is-${line.kind}`} d={path(line)} />)}
        {dots.map((dot, i) => (
          <g key={i} className={`bench-dot is-${dot.kind ?? 'sample'}`}>
            {dot.kind !== 'ring' && dot.kind !== 'point' && <line x1={x(dot.u)} x2={x(dot.u)} y1={y(Math.max(lo, Math.min(hi, 0)))} y2={y(dot.v)} />}
            <circle cx={x(dot.u)} cy={y(dot.v)} r={dot.kind === 'ring' ? 6 : dot.kind === 'point' ? 4.5 : 3.6} />
          </g>
        ))}
        {mark !== null && <line className="bench-mark" x1={x(mark)} x2={x(mark)} y1={y(hi)} y2={y(lo)} />}
        {at && (
          <g className="bench-pick">
            <line x1={x(at.u)} x2={x(at.u)} y1={top} y2={height - bottom} />
            {readings.filter((r) => !r.dot).map((r, i) => <circle key={i} className={`is-${r.kind}`} cx={x(at.u)} cy={y(r.v)} r={4} />)}
          </g>
        )}
      </svg>
      {at && (
        <div className={`bench-tip ${at.u > 0.55 ? 'is-left' : ''}`} style={{ left: `${(x(at.u) / width) * 100}%` }}>
          <i>{where}</i>
          {readings.map((r, index) => (
            <span key={index}><em className={`is-${r.kind}`} /><Rich text={r.label ?? ''} /><b>{fmt(r.v)}</b></span>
          ))}
        </div>
      )}
    </div>
  )
}

/** The key under a plot: one swatch and label per kind of line or dot. */
export function Legend({ entries }) {
  return (
    <div className="bench-legend">
      {entries.map((e, i) => <span key={i}><i className={`is-${e.kind}`} /><Rich text={e.label} /></span>)}
    </div>
  )
}
