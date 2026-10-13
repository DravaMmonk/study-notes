import { useRef } from 'react'
import { Check, Circle } from 'lucide-react'

// Drawing pieces shared by chapter 2's wave boards (WaveTuner, WaveMixer, Equalizer, AliasProbe).
// Curves are functions of u, the position across one image width (0 … 1), or arrays of samples.
// Sizes are in viewBox units; callers pass a narrower width on phones so text stays ≥ 11 px.

const FINE = 160
const valueAt = (curve, u) => (typeof curve === 'function' ? curve(u) : curve[Math.min(curve.length - 1, Math.floor(u * curve.length))])

// A line plot over one image width. `lines`: [{ curve, kind, steps }] where kind picks the stroke
// (target, yours, faint, error) and `steps` draws an array of samples as flat steps (pixels).
// `dots`: [{ u, v, kind }] drawn as stems with a dot (kind 'sample') or a hollow ring ('ring').
export function Plot({ lines = [], dots = [], width = 600, height = 200, lo = 0, hi = 1, ticks = [0, 0.5, 1], label, children }) {
  const left = 30
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
    return Array.from({ length: FINE + 1 }, (_, i) => `${i ? 'L' : 'M'}${x(i / FINE).toFixed(1)},${y(valueAt(curve, i / FINE)).toFixed(1)}`).join('')
  }
  return (
    <svg className="wv-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {ticks.map((t) => (
        <g key={t}>
          <line className={`wv-grid ${t === 0 && lo < 0 ? 'is-zero' : ''}`} x1={left} x2={width - right} y1={y(t)} y2={y(t)} />
          <text className="wv-tick" x={left - 6} y={y(t) + 4}>{t}</text>
        </g>
      ))}
      {lines.map((line, i) => <path key={i} className={`wv-line is-${line.kind}`} d={path(line)} />)}
      {dots.map((dot, i) => (
        <g key={i} className={`wv-dot is-${dot.kind ?? 'sample'}`}>
          {dot.kind !== 'ring' && <line x1={x(dot.u)} x2={x(dot.u)} y1={y(Math.max(lo, Math.min(hi, 0)))} y2={y(dot.v)} />}
          <circle cx={x(dot.u)} cy={y(dot.v)} r={dot.kind === 'ring' ? 6 : 3.6} />
        </g>
      ))}
      {children?.({ x, y })}
    </svg>
  )
}

// One row of an image as a stripe of grey: what the curve looks like as pixels.
export function Band({ curve, width = 600, height = 30, label }) {
  const n = 96
  return (
    <svg className="wv-band" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
      {Array.from({ length: n }, (_, i) => {
        const g = Math.round(255 * Math.min(1, Math.max(0, valueAt(curve, (i + 0.5) / n))))
        return <rect key={i} x={(i / n) * width} y={0} width={width / n + 0.6} height={height} fill={`rgb(${g},${g},${g})`} />
      })}
    </svg>
  )
}

// A row of draggable bars, like the faders of a mixing desk. Dragging across columns paints them.
// `values` and `ghosts` (outlines drawn behind, e.g. the true amplitudes) are arrays of numbers;
// `under` optionally draws a small picture under each bar ({ x, y, w, h, index } → svg).
export function Bars({ values, onChange, min = 0, max = 1, step = 0.01, labels, ghosts, shadows, width = 600, height = 220, under, readOnly, label, valueText }) {
  const svg = useRef(null)
  const dragging = useRef(false)
  const n = values.length
  const foot = under ? 46 : 24
  const top = 10
  const col = width / n
  const span = height - top - foot
  const y = (v) => top + (1 - (v - min) / (max - min)) * span
  const zero = y(Math.max(min, Math.min(max, 0)))
  const snap = (v) => Math.min(max, Math.max(min, Math.round(v / step) * step))

  const setFrom = (event) => {
    const matrix = svg.current?.getScreenCTM()
    if (!matrix) return
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    const index = Math.min(n - 1, Math.max(0, Math.floor(point.x / col)))
    const value = snap(min + (1 - (point.y - top) / span) * (max - min))
    if (Math.abs(value - values[index]) > 1e-9) onChange(index, value)
  }
  const handlers = readOnly
    ? {}
    : {
        onPointerDown: (event) => {
          dragging.current = true
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            // A pointer that is already gone cannot be captured; the drag still works inside the bars.
          }
          setFrom(event)
        },
        onPointerMove: (event) => dragging.current && setFrom(event),
        onPointerUp: () => {
          dragging.current = false
        },
        onPointerCancel: () => {
          dragging.current = false
        },
      }
  const keyFor = (index) => (event) => {
    const delta = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step, PageUp: step * 10, PageDown: -step * 10 }[event.key]
    if (delta === undefined) return
    event.preventDefault()
    onChange(index, snap(values[index] + delta))
  }

  return (
    <svg ref={svg} className={`wv-bars ${readOnly ? 'is-readonly' : ''}`} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={label} {...handlers}>
      <line className="wv-grid" x1={0} x2={width} y1={zero} y2={zero} />
      {values.map((v, index) => {
        const x0 = index * col
        const barW = Math.min(30, col * 0.56)
        const cx = x0 + col / 2
        return (
          <g key={index}>
            {!readOnly && <rect className="wv-bar-track" x={cx - 2} y={top} width={4} height={span} rx={2} />}
            {shadows && <rect className="wv-bar-shadow" x={cx - barW / 2 - 3} y={Math.min(y(shadows[index]), zero)} width={barW + 6} height={Math.abs(zero - y(shadows[index]))} rx={3} />}
            <rect className="wv-bar" x={cx - barW / 2} y={Math.min(y(v), zero)} width={barW} height={Math.max(0.5, Math.abs(zero - y(v)))} rx={3} />
            {ghosts && <line className="wv-bar-ghost" x1={cx - barW / 2 - 4} x2={cx + barW / 2 + 4} y1={y(ghosts[index])} y2={y(ghosts[index])} />}
            {!readOnly && <rect className="wv-bar-cap" x={cx - barW / 2 - 2} y={y(v) - 3} width={barW + 4} height={6} rx={3} />}
            <text className="wv-bar-label" x={cx} y={height - foot + 16}>{labels?.[index] ?? index}</text>
            {under?.({ x: x0 + 4, y: height - foot + 22, w: col - 8, h: foot - 26, index })}
            {!readOnly && (
              <rect
                className="wv-bar-hit"
                x={x0}
                y={0}
                width={col}
                height={height}
                tabIndex={0}
                role="slider"
                aria-label={`${labels?.[index] ?? index}`}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={Number(v.toFixed(3))}
                aria-valuetext={valueText?.(index, v)}
                onKeyDown={keyFor(index)}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

// A tiny drawing of one wave, for labelling faders and components.
export function Squiggle({ x, y, w, h, k, form = 'sin' }) {
  const f = form === 'sin' ? Math.sin : Math.cos
  const d = Array.from({ length: 41 }, (_, i) => `${i ? 'L' : 'M'}${(x + (i / 40) * w).toFixed(1)},${(y + h / 2 - (h / 2) * f(2 * Math.PI * k * (i / 40))).toFixed(1)}`).join('')
  return <path className="wv-squiggle" d={d} />
}

// The stage list of a multi-step board: one goal row per stage, passed ones ticked. Stages up to
// the furthest one reached can be reopened.
export function Stages({ stages, current, passed, reached, onPick }) {
  return (
    <ol className="bk-goals" aria-label="步骤">
      {stages.map((stage, index) => {
        const done = passed[index]
        const open = index <= reached
        return (
          <li key={index} className={`bk-goal wv-goal-row ${done ? 'is-pass' : ''} ${index === current ? 'is-current' : ''} ${open ? '' : 'is-locked'}`}>
            {done ? <Check size={16} /> : <Circle size={14} />}
            {open && index !== current ? <button onClick={() => onPick(index)}>{stage.title}</button> : <span>{stage.title}</span>}
            <small>{index + 1} / {stages.length}</small>
          </li>
        )
      })}
    </ol>
  )
}
