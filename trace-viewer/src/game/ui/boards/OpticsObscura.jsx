import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import './optics.css'

// 0-5 暗箱: a camera obscura on a table, seen from the side, in millimetres. Drag the pinhole plate
// and the screen, pick a hole; every ray drawn is the actual construction through the hole's edges.
// The inset is the screen seen from the front: the image's size, blur and brightness come from the
// same model the goals read.

const TABLE_Y = -140 // mm, the tabletop under the axis
const HEAD = { length: 18, width: 16 }

// The arrow as a polygon in its own plane (x across, y up), base on the axis.
const arrowShape = (height, shaft) => [
  [-shaft / 2, 0], [shaft / 2, 0], [shaft / 2, height - HEAD.length], [HEAD.width / 2, height - HEAD.length],
  [0, height], [-HEAD.width / 2, height - HEAD.length], [-shaft / 2, height - HEAD.length],
]
const pts = (list) => list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')

export default function OpticsObscura({ level, onSolve }) {
  const m = level.model
  const [state, setState] = useState(m.START)
  const svg = useRef(null)
  const drag = useRef(null)
  const fired = useRef(false)
  const v = m.view(state)
  const goals = m.goals(v)
  const done = goals.every((g) => g.ok)

  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true
      onSolve()
    }
  }, [done, onSolve])

  const move = (part, x) => setState((s) => m.clamp(part === 'plate' ? { ...s, Z: x, s: Math.max(s.s, x + m.GAP) } : { ...s, s: x }))
  const worldX = (event) => {
    const point = svg.current.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    return point.matrixTransform(svg.current.getScreenCTM().inverse()).x
  }
  const grab = (part) => (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { part, offset: worldX(event) - (part === 'plate' ? state.Z : state.s) }
  }
  const slide = (event) => {
    if (drag.current) move(drag.current.part, worldX(event) - drag.current.offset)
  }
  const drop = () => {
    drag.current = null
  }
  const nudge = (part) => (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
    if (!step) return
    event.preventDefault()
    move(part, (part === 'plate' ? state.Z : state.s) + step * (event.shiftKey ? 10 : 1))
  }

  // Side view: world y up, SVG y down.
  const Y = (y) => -y
  const { Z, f, D } = v
  const s = Z + f
  const cone = (y0) => {
    // From the object point (0, y0) through both hole edges to the screen.
    const hit = (h) => y0 + ((h - y0) * s) / Z
    return { poly: pts([[0, Y(y0)], [Z, Y(D / 2)], [s, Y(hit(D / 2))], [s, Y(hit(-D / 2))], [Z, Y(-D / 2)]]), centre: hit(0) }
  }
  const tip = cone(m.ARROW)
  const base = cone(0)
  const glow = Math.min(1, Math.max(0.06, v.light * 0.7))
  const image = arrowShape(m.ARROW, m.SHAFT).map(([x, y]) => [(-x * f) / Z, (-y * f) / Z])

  return (
    <div className="optics optics-obscura">
      <svg ref={svg} className="optics-stage" viewBox="-95 -132 815 320" role="img" aria-label="暗箱侧视图" onPointerMove={slide} onPointerUp={drop} onPointerCancel={drop}>
        <line className="optics-axis" x1={-60} y1={0} x2={m.TABLE + 50} y2={0} />
        <rect className="optics-table" x={-50} y={Y(TABLE_Y)} width={m.TABLE + 90} height={10} />
        {/* the object */}
        <line className="optics-post" x1={0} y1={Y(TABLE_Y)} x2={0} y2={0} />
        <polygon className="optics-arrow" points={pts(arrowShape(m.ARROW, m.SHAFT).map(([x, y]) => [x, Y(y)]))} />
        {/* light through the hole, from the tip and from the base */}
        <polygon className="optics-cone" points={tip.poly} style={{ opacity: 0.18 + 0.5 * glow }} />
        <polygon className="optics-cone is-base" points={base.poly} style={{ opacity: 0.12 + 0.4 * glow }} />
        <line className="optics-ray" x1={0} y1={Y(m.ARROW)} x2={s} y2={Y(tip.centre)} />
        <line className="optics-ray is-base" x1={0} y1={0} x2={s} y2={0} />
        {/* pinhole plate: two halves with the hole between */}
        <g className="optics-handle" tabIndex={0} role="slider" aria-label="孔板位置 Z" aria-valuenow={Z} aria-valuemin={m.PLATE[0]} aria-valuemax={m.PLATE[1]} onPointerDown={grab('plate')} onKeyDown={nudge('plate')}>
          <rect className="optics-grip" x={Z - 14} y={Y(116)} width={28} height={116 - TABLE_Y} />
          <rect className="optics-plate" x={Z - 2} y={Y(116)} width={4} height={116 - D / 2} />
          <rect className="optics-plate" x={Z - 2} y={Y(-D / 2)} width={4} height={D / 2 - TABLE_Y} />
          <text className="optics-tag" x={Z} y={Y(124)}>孔板</text>
        </g>
        {/* screen */}
        <g className="optics-handle" tabIndex={0} role="slider" aria-label="屏幕位置" aria-valuenow={s} aria-valuemin={Z + m.GAP} aria-valuemax={m.TABLE} onPointerDown={grab('screen')} onKeyDown={nudge('screen')}>
          <rect className="optics-grip" x={s - 14} y={Y(60)} width={28} height={60 - TABLE_Y} />
          <rect className="optics-screen" x={s} y={Y(60)} width={5} height={60 - TABLE_Y} />
          <line className="optics-image" x1={s - 1.5} y1={0} x2={s - 1.5} y2={Y(v.image)} style={{ opacity: glow, strokeWidth: Math.max(1.2, v.blur) }} />
          <text className="optics-tag" x={s} y={Y(68)}>屏幕</text>
        </g>
        {/* dimensions */}
        <Dimension x0={0} x1={Z} y={Y(TABLE_Y) + 26} label={`Z = ${Z} mm`} />
        <Dimension x0={Z} x1={s} y={Y(TABLE_Y) + 26} label={`f = ${f} mm`} />
        <text className="optics-dim-label is-left" x={-10} y={Y(m.ARROW / 2)}>X = {m.ARROW} mm</text>
      </svg>

      <div className="optics-row">
        <figure className="optics-inset">
          <svg viewBox="-26 -12 52 72" role="img" aria-label="屏幕正面">
            <defs>
              <filter id="obscura-blur" filterUnits="userSpaceOnUse" x={-26} y={-12} width={52} height={72}>
                <feGaussianBlur stdDeviation={v.blur / 4} />
              </filter>
            </defs>
            <rect className="optics-inset-bg" x={-26} y={-12} width={52} height={72} />
            {Array.from({ length: 12 }, (_, i) => i * 5).map((mm) => (
              <g key={mm}>
                <line className="optics-tick" x1={-26} y1={mm} x2={mm % 10 ? -24.5 : -23} y2={mm} />
                {mm % 10 === 0 && mm > 0 && <text className="optics-tick-label" x={-22} y={mm + 1}>{mm}</text>}
              </g>
            ))}
            <line className="optics-goal-line" x1={-26} y1={m.GOAL.height} x2={26} y2={m.GOAL.height} />
            <line className="optics-axis" x1={-26} y1={0} x2={26} y2={0} />
            <polygon className="optics-inset-image" points={pts(image.map(([x, y]) => [x, -y]))} filter="url(#obscura-blur)" style={{ opacity: glow }} />
          </svg>
          <figcaption>屏幕上（mm）</figcaption>
        </figure>

        <div className="optics-controls">
          <div>
            <h3 className="panel-label">孔径 D</h3>
            <div className="optics-holes" role="radiogroup" aria-label="孔径">
              {m.HOLES.map((hole) => (
                <button key={hole} role="radio" aria-checked={D === hole} className={D === hole ? 'is-active' : ''} onClick={() => setState((st) => ({ ...st, D: hole }))}>
                  <svg viewBox="-14 -14 28 28" aria-hidden="true"><circle r={hole * 4.6} /></svg>
                  <span>{hole} mm</span>
                </button>
              ))}
            </div>
          </div>
          <Goals goals={goals} />
        </div>
      </div>
    </div>
  )
}

function Dimension({ x0, x1, y, label }) {
  return (
    <g className="optics-dim">
      <line x1={x0} y1={y - 5} x2={x0} y2={y + 5} />
      <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} />
      <line x1={x0} y1={y} x2={x1} y2={y} />
      <text className="optics-dim-label" x={(x0 + x1) / 2} y={y + 15}>{label}</text>
    </g>
  )
}

function Goals({ goals }) {
  return (
    <ul className="optics-goals">
      {goals.map((g) => (
        <li key={g.key} className={g.ok ? 'is-ok' : 'is-bad'}>
          {g.ok ? <Check size={14} /> : <X size={14} />}
          <span>{g.label}</span>
          <b>{g.value}</b>
          <small>需 {g.need}</small>
        </li>
      ))}
    </ul>
  )
}
