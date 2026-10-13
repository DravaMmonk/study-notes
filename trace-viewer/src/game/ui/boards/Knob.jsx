import { useRef } from 'react'
import { useTween } from './optics-motion.js'

const SWEEP = 135 // degrees either side of straight up

// A rotary knob. Turn it by dragging round its centre (or with the arrow keys); without onChange it
// only shows the value, turning smoothly when something else (the trainer) changes it.
export default function Knob({ label, value, min, max, step = 0.05, onChange, size = 112, accent }) {
  const face = useRef(null)
  const turning = useRef(false)
  const safe = Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min
  const [shown] = useTween([safe], { ms: 320 })
  const angle = -SWEEP + ((shown - min) / (max - min)) * 2 * SWEEP
  const r = size / 2
  const polar = (deg, radius) => [r + radius * Math.sin((deg * Math.PI) / 180), r - radius * Math.cos((deg * Math.PI) / 180)]
  const arc = (from, to, radius) => {
    const [x1, y1] = polar(from, radius)
    const [x2, y2] = polar(to, radius)
    return `M${x1},${y1} A${radius},${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${x2},${y2}`
  }
  const zero = Math.max(min, Math.min(max, 0))
  const zeroAngle = -SWEEP + ((zero - min) / (max - min)) * 2 * SWEEP
  const snap = (v) => Math.max(min, Math.min(max, Math.round(v / step) * step))
  const fromPointer = (event) => {
    const box = face.current.getBoundingClientRect()
    const dx = event.clientX - (box.left + box.width / 2)
    const dy = event.clientY - (box.top + box.height / 2)
    const deg = Math.max(-SWEEP, Math.min(SWEEP, (Math.atan2(dx, -dy) * 180) / Math.PI))
    const next = snap(min + ((deg + SWEEP) / (2 * SWEEP)) * (max - min))
    if (Math.abs(next - value) > 1e-9) onChange(Number(next.toFixed(4)))
  }
  const ticks = Array.from({ length: 11 }, (_, i) => -SWEEP + (i * 2 * SWEEP) / 10)
  const [px, py] = polar(angle, r * 0.5)
  const off = Number.isFinite(value) && (value < min || value > max)

  return (
    <figure className={`knob ${onChange ? 'is-live' : ''} ${off ? 'is-off' : ''}`} style={{ '--knob-accent': accent }}>
      <svg
        ref={face}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(safe.toFixed(3))}
        aria-readonly={!onChange}
        tabIndex={onChange ? 0 : -1}
        onPointerDown={(event) => {
          if (!onChange) return
          turning.current = true
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            // A pointer that is already gone cannot be captured; the gesture still works.
          }
          fromPointer(event)
        }}
        onPointerMove={(event) => turning.current && fromPointer(event)}
        onPointerUp={() => {
          turning.current = false
        }}
        onPointerCancel={() => {
          turning.current = false
        }}
        onKeyDown={(event) => {
          if (!onChange) return
          const delta = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step }[event.key]
          if (delta === undefined) return
          event.preventDefault()
          onChange(Number(snap(value + delta).toFixed(4)))
        }}
      >
        <path className="knob-track" d={arc(-SWEEP, SWEEP, r - 6)} />
        <path className="knob-fill" d={angle >= zeroAngle ? arc(zeroAngle, angle, r - 6) : arc(angle, zeroAngle, r - 6)} />
        {ticks.map((t) => {
          const [x1, y1] = polar(t, r - 13)
          const [x2, y2] = polar(t, r - 17)
          return <line key={t} className="knob-tick" x1={x1} y1={y1} x2={x2} y2={y2} />
        })}
        <circle className="knob-body" cx={r} cy={r} r={r * 0.62} />
        <circle className="knob-cap" cx={r} cy={r} r={r * 0.5} />
        <line className="knob-pointer" x1={r} y1={r} x2={px} y2={py} />
        <circle className="knob-dot" cx={px} cy={py} r={3.2} />
      </svg>
      <figcaption>
        <span>{label}</span>
        <b>{Number.isFinite(value) ? (Math.abs(value) > 99 ? value.toExponential(1) : value.toFixed(2)) : '—'}</b>
      </figcaption>
    </figure>
  )
}
