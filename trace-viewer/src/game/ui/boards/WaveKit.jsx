import { useState } from 'react'
import { Check, Circle } from 'lucide-react'
import { L, tr } from '../../../../../games/kit/shell/i18n.js'

// Drawing pieces shared by the sampling bench (AliasProbe) and the overfitting bench (EarlyStop).
// Curves are functions of u, the position across one image width (0 … 1), or arrays of samples.
// Sizes are in viewBox units; callers pass a narrower width on phones so text stays ≥ 11 px.

const FINE = 160
const valueAt = (curve, u) => (typeof curve === 'function' ? curve(u) : curve[Math.min(curve.length - 1, Math.floor(u * curve.length))])

const KIND_LABELS = {
  target: { zh: '目标', en: 'target' },
  yours: { zh: '你的', en: 'yours' },
  faint: { zh: '原信号', en: 'original' },
  error: { zh: '误差', en: 'error' },
  seen: { zh: '看起来', en: 'looks like' },
}
const fmt = (v) => (Number.isFinite(v) ? (Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3)) : '—')

// Which column the pointer is over, in viewBox units, from a pointer event on the svg.
const pointerX = (event, width) => {
  const box = event.currentTarget.getBoundingClientRect()
  return ((event.clientX - box.left) / box.width) * width
}

// A line plot over one image width. `lines`: [{ curve, kind, steps, label }] where kind picks the
// stroke (target, yours, faint, error, seen) and `steps` draws an array of samples as flat steps
// (pixels). `dots`: [{ u, v, kind }] drawn as stems with a dot (kind 'sample') or a hollow ring
// ('ring'). Pointing at the plot (or tapping it) reads every line at that spot; with dots it snaps
// to the nearest sample, and with step lines to the pixel. `span` is how many pixels the width is.
export function Plot({ lines = [], dots = [], width = 600, height = 200, lo = 0, hi = 1, ticks = [0, 0.5, 1], tickLabel = (t) => t, label, span = 32, left = 30, children }) {
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
    const u = Math.min(1, Math.max(0, (pointerX(event, width) - left) / (width - left - right)))
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
        ...lines.map((line) => ({ kind: line.kind, label: L(line.label ?? KIND_LABELS[line.kind] ?? ''), v: valueAt(line.curve, at.u) })),
        ...dots.filter((d) => at.sample !== undefined && Math.abs(d.u - at.u) < 1e-9).map((d) => ({ kind: d.kind === 'ring' ? 'ring' : 'sample', label: L(d.label) ?? (d.kind === 'ring' ? tr('参照点', 'reference') : tr('采到的值', 'sampled value')), v: d.v, dot: true })),
      ]
    : []
  const where = !at ? '' : at.sample !== undefined ? tr(`第 ${at.sample} 个点 / ${at.of}`, `point ${at.sample} / ${at.of}`) : at.pixel !== undefined ? `x = ${at.pixel}` : `x = ${(at.u * span).toFixed(1)} px`

  return (
    <div className="wv-plot-wrap">
      <svg className="wv-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={tr(`${L(label) ?? ''}：指向一处读数`, `${L(label) ?? ''}: point at a spot to read it`)} onPointerMove={pick} onPointerDown={pick} onPointerLeave={leave}>
        {ticks.map((t) => (
          <g key={t}>
            <line className={`wv-grid ${t === 0 && lo < 0 ? 'is-zero' : ''}`} x1={left} x2={width - right} y1={y(t)} y2={y(t)} />
            <text className="wv-tick" x={left - 6} y={y(t) + 4}>{tickLabel(t)}</text>
          </g>
        ))}
        {lines.map((line, i) => <path key={i} className={`wv-line is-${line.kind}`} d={path(line)} />)}
        {dots.map((dot, i) => (
          <g key={i} className={`wv-dot is-${dot.kind ?? 'sample'}`}>
            {dot.kind !== 'ring' && dot.kind !== 'point' && <line x1={x(dot.u)} x2={x(dot.u)} y1={y(Math.max(lo, Math.min(hi, 0)))} y2={y(dot.v)} />}
            <circle cx={x(dot.u)} cy={y(dot.v)} r={dot.kind === 'ring' ? 6 : dot.kind === 'point' ? 4.5 : 3.6} />
          </g>
        ))}
        {children?.({ x, y })}
        {at && (
          <g className="wv-pick">
            <line x1={x(at.u)} x2={x(at.u)} y1={top} y2={height - bottom} />
            {readings.filter((r) => !r.dot).map((r, i) => <circle key={i} className={`is-${r.kind}`} cx={x(at.u)} cy={y(r.v)} r={4} />)}
          </g>
        )}
      </svg>
      {at && (
        <div className={`wv-tip ${at.u > 0.55 ? 'is-left' : ''}`} style={{ left: `${(x(at.u) / width) * 100}%` }}>
          <i>{where}</i>
          {readings.map((r, index) => (
            <span key={index}><em className={`is-${r.kind}`} />{r.label}<b>{fmt(r.v)}</b></span>
          ))}
        </div>
      )}
    </div>
  )
}

// The stage list of a multi-step board: one goal row per stage, passed ones ticked. Stages up to
// the furthest one reached can be reopened.
export function Stages({ stages, current, passed, reached, onPick }) {
  return (
    <ol className="bk-goals" aria-label={tr('步骤', 'Steps')}>
      {stages.map((stage, index) => {
        const done = passed[index]
        const open = index <= reached
        return (
          <li key={index} className={`bk-goal wv-goal-row ${done ? 'is-pass' : ''} ${index === current ? 'is-current' : ''} ${open ? '' : 'is-locked'}`}>
            {done ? <Check size={16} /> : <Circle size={14} />}
            {open && index !== current ? <button onClick={() => onPick(index)}>{L(stage.title)}</button> : <span>{L(stage.title)}</span>}
            <small>{index + 1} / {stages.length}</small>
          </li>
        )
      })}
    </ol>
  )
}

// One row of the image as pixels, darkest at 0 and lightest at 1.
export function Strip({ label, values }) {
  const n = values.length
  return (
    <figure className="wv-strip">
      <svg viewBox={`0 0 ${n} 1`} preserveAspectRatio="none" aria-hidden="true">
        {values.map((value, x) => {
          const g = Math.round(255 * Math.min(1, Math.max(0, value)))
          return <rect key={x} x={x} y={0} width={1.02} height={1} fill={`rgb(${g},${g},${g})`} />
        })}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  )
}
