import { useEffect, useId, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { PHONE, useMedia } from '../../../../shell/useMedia.js'
import { useTween } from './optics-motion.js'
import './optics.css'
import { L as T, tr } from '../../../../shell/i18n.js'

// 0-5 暗箱: a camera obscura on a table, seen from the side, in millimetres. Drag the pinhole plate
// and the screen, pick a hole; every ray drawn is the actual construction through the hole's edges.
// The inset is the screen seen from the front: the image's size, blur and brightness come from the
// same model the goals read.

const TABLE_Y = -140 // mm, the tabletop under the axis
const HEAD = { length: 18, width: 16 }

// Drawing scale. On a phone the side view is stretched upwards (k) so it is tall enough to read in a
// narrow column; straight lines stay straight, so every similar triangle is still true. u widens
// the parts and their grips, fs is the label size in viewBox units (≥ 11 px on screen either way).
const DESK = { k: 1, u: 1, fs: 11, x0: -100, x1: 715 }
const PHONE_LAYOUT = { k: 2, u: 2.2, fs: 27, x0: -118, x1: 690 }

// The arrow as a polygon in its own plane (x across, y up), base on the axis.
const arrowShape = (height, shaft) => [
  [-shaft / 2, 0], [shaft / 2, 0], [shaft / 2, height - HEAD.length], [HEAD.width / 2, height - HEAD.length],
  [0, height], [-HEAD.width / 2, height - HEAD.length], [-shaft / 2, height - HEAD.length],
]
const pts = (list) => list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')

export default function OpticsObscura({ level, onSolve }) {
  const m = level.model
  const phone = useMedia(PHONE)
  const L = phone ? PHONE_LAYOUT : DESK
  const blurId = useId()
  const [state, setState] = useState(m.START)
  const [dragging, setDragging] = useState(null) // 'plate' | 'screen' while a pointer holds one
  const svg = useRef(null)
  const drag = useRef(null)
  const fired = useRef(false)
  const goals = m.goals(m.view(state))
  const done = goals.every((g) => g.ok)

  // The drawing follows a tweened copy of the state, so a new hole or a key nudge glides into place.
  const [tZ, tS, tD] = useTween([state.Z, state.s, state.D], { instant: Boolean(dragging) })
  const v = m.view({ Z: tZ, s: tS, D: tD })

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
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { part, offset: worldX(event) - (part === 'plate' ? state.Z : state.s) }
    setDragging(part)
  }
  const slide = (event) => {
    if (drag.current) move(drag.current.part, worldX(event) - drag.current.offset)
  }
  const drop = () => {
    drag.current = null
    setDragging(null)
  }
  const nudge = (part) => (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -1, ArrowUp: 1 }[event.key]
    if (!step) return
    event.preventDefault()
    move(part, (part === 'plate' ? state.Z : state.s) + step * (event.shiftKey ? 10 : 1))
  }

  // Side view: world y up, SVG y down, stretched by k.
  const { k, u, fs } = L
  const Y = (y) => -y * k
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

  const tableTop = Y(TABLE_Y)
  const dimY = tableTop + 12 * k + fs * 0.9
  const top = Y(116) - fs * 1.9
  const bottom = dimY + fs * 2
  const viewBox = `${L.x0} ${top.toFixed(1)} ${L.x1 - L.x0} ${(bottom - top).toFixed(1)}`
  const grip = 22 * u // half-width of a part's touch area
  const label = (name, value) => (phone ? `${name} ${value}` : `${name} = ${value} mm`)

  return (
    <div className="bk optics optics-obscura">
      <figure className="bk-stage optics-figure">
        <svg ref={svg} className="optics-drag" viewBox={viewBox} style={{ '--fs': `${fs}px` }} role="img" aria-label={tr('暗箱侧视图', 'Camera obscura, side view')} onPointerMove={slide} onPointerUp={drop} onPointerCancel={drop}>
          <line className="optics-axis" x1={L.x0 + 20} y1={0} x2={m.TABLE + 40} y2={0} />
          <rect className="optics-table" x={-40} y={tableTop} width={m.TABLE + 70} height={9 * k} rx={2} />
          {/* the object */}
          <rect className="optics-post" x={-1.5 * u} y={0} width={3 * u} height={tableTop} />
          <polygon className="optics-arrow" points={pts(arrowShape(m.ARROW, m.SHAFT).map(([x, y]) => [x * u, Y(y)]))} />
          {/* light through the hole, from the tip and from the base */}
          <polygon className="optics-cone" points={tip.poly} style={{ opacity: 0.18 + 0.5 * glow }} />
          <polygon className="optics-cone is-base" points={base.poly} style={{ opacity: 0.12 + 0.4 * glow }} />
          <line className="optics-ray" x1={0} y1={Y(m.ARROW)} x2={s} y2={Y(tip.centre)} />
          <line className="optics-ray is-base" x1={0} y1={0} x2={s} y2={0} />

          {/* pinhole plate: two halves with the hole between */}
          <g className={`optics-handle ${dragging === 'plate' ? 'is-dragging' : ''}`} tabIndex={0} role="slider" aria-label={tr('孔板位置 Z', 'Pinhole plate position Z')} aria-valuenow={state.Z} aria-valuemin={m.PLATE[0]} aria-valuemax={m.PLATE[1]} aria-valuetext={`Z = ${state.Z} mm`} onPointerDown={grab('plate')} onKeyDown={nudge('plate')}>
            <rect className="optics-grip" x={Z - grip} y={Y(116) - fs * 1.6} width={grip * 2} height={tableTop - Y(116) + fs * 1.6 + 9 * k} rx={6 * u} />
            <rect className="optics-plate" x={Z - 2 * u} y={Y(116)} width={4 * u} height={Y(D / 2) - Y(116)} />
            <rect className="optics-plate" x={Z - 2 * u} y={Y(-D / 2)} width={4 * u} height={tableTop - Y(-D / 2)} />
            <Foot x={Z} y={tableTop} u={u} k={k} />
            <text className="optics-tag" x={Z} y={Y(116) - fs * 0.5}>{tr('孔板', 'Plate')}</text>
          </g>

          {/* screen */}
          <g className={`optics-handle ${dragging === 'screen' ? 'is-dragging' : ''}`} tabIndex={0} role="slider" aria-label={tr('屏幕位置', 'Screen position')} aria-valuenow={state.s} aria-valuemin={state.Z + m.GAP} aria-valuemax={m.TABLE} aria-valuetext={`f = ${state.s - state.Z} mm`} onPointerDown={grab('screen')} onKeyDown={nudge('screen')}>
            <rect className="optics-grip" x={s - grip + 2 * u} y={Y(60) - fs * 1.6} width={grip * 2} height={tableTop - Y(60) + fs * 1.6 + 9 * k} rx={6 * u} />
            <rect className="optics-screen" x={s} y={Y(60)} width={4 * u} height={tableTop - Y(60)} />
            <line className="optics-image" x1={s} y1={0} x2={s} y2={Y(v.image)} style={{ opacity: glow, strokeWidth: Math.max(1.5, v.blur * k) }} />
            <Foot x={s + 2 * u} y={tableTop} u={u} k={k} />
            <text className="optics-tag" x={s + 2 * u} y={Y(60) - fs * 0.5}>{tr('屏幕', 'Screen')}</text>
          </g>

          {/* dimensions, read from the real state */}
          <Dimension x0={0} x1={Z} y={dimY} fs={fs} label={label('Z', state.Z)} />
          <Dimension x0={Z} x1={s} y={dimY} fs={fs} label={label('f', state.s - state.Z)} />
          <text className="optics-tag is-left" x={-8 * u} y={Y(m.ARROW / 2) + fs * 0.35}>{phone ? `X ${m.ARROW}` : `X = ${m.ARROW} mm`}</text>
        </svg>
        <figcaption className="bk-caption">{phone ? tr('左右拖孔板和屏幕 · 单位 mm', 'Drag the plate and screen sideways · units: mm') : tr('左右拖孔板和屏幕（也可聚焦后按方向键，Shift 一次 10 mm）', 'Drag the plate and screen sideways (or focus one and use the arrow keys; Shift moves 10 mm)')}</figcaption>
      </figure>

      <div className="optics-lower">
        <section className="bk-panel optics-holes-panel">
          <span className="bk-label">{tr('孔径 D', 'Aperture D')}</span>
          <div className="bk-seg optics-holes" role="radiogroup" aria-label={tr('孔径', 'Aperture')}>
            {m.HOLES.map((hole) => (
              <button key={hole} role="radio" aria-checked={state.D === hole} className={state.D === hole ? 'is-active' : ''} onClick={() => setState((st) => ({ ...st, D: hole }))}>
                <svg viewBox="-14 -14 28 28" aria-hidden="true"><circle r={hole * 4.6} /></svg>
                <span>{hole} mm</span>
              </button>
            ))}
          </div>
        </section>

        <figure className="bk-panel is-quiet optics-inset">
          <svg viewBox="-26 -12 52 72" role="img" aria-label={tr('屏幕正面', 'Screen, front view')}>
            <defs>
              <filter id={blurId} filterUnits="userSpaceOnUse" x={-26} y={-12} width={52} height={72}>
                <feGaussianBlur stdDeviation={v.blur / 4} />
              </filter>
            </defs>
            <rect className="optics-inset-bg" x={-26} y={-12} width={52} height={72} />
            {Array.from({ length: 12 }, (_, i) => i * 5).map((mm) => (
              <g key={mm}>
                <line className="optics-tick" x1={-26} y1={mm} x2={mm % 10 ? -24.5 : -23} y2={mm} />
                {mm % 10 === 0 && mm > 0 && <text className="optics-tick-label" x={-22} y={mm + 1.4}>{mm}</text>}
              </g>
            ))}
            <line className="optics-goal-line" x1={-14} y1={m.GOAL.height} x2={26} y2={m.GOAL.height} />
            <line className="optics-inset-axis" x1={-26} y1={0} x2={26} y2={0} />
            <polygon className="optics-inset-image" points={pts(image.map(([x, y]) => [x, -y]))} filter={`url(#${CSS.escape(blurId)})`} style={{ opacity: glow }} />
          </svg>
          <figcaption className="bk-caption">{tr('屏幕正面 · mm', 'Screen, front view · mm')}</figcaption>
        </figure>

        <ul className="bk-goals optics-goals" aria-live="polite">
          {goals.map((g) => (
            <li key={g.key} className={`bk-goal ${g.ok ? 'is-pass' : ''}`}>
              {g.ok ? <Check size={16} /> : <X size={16} />}
              <span>{T(g.label)} <small>{tr('需', 'need')} {g.need}</small></span>
              <b>{g.value}</b>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// A part's foot on the table, with two small chevrons: the cue that it slides.
function Foot({ x, y, u, k }) {
  const w = 13 * u
  const h = 6 * k
  return (
    <g className="optics-foot">
      <rect x={x - w} y={y - h} width={w * 2} height={h} rx={h / 2} />
      <path d={`M${x - w + 3 * u} ${y - h / 2} l${3 * u} ${-h / 3} v${(h * 2) / 3} z M${x + w - 3 * u} ${y - h / 2} l${-3 * u} ${-h / 3} v${(h * 2) / 3} z`} />
    </g>
  )
}

function Dimension({ x0, x1, y, fs, label }) {
  const tick = fs * 0.45
  return (
    <g className="optics-dim">
      <line x1={x0} y1={y - tick} x2={x0} y2={y + tick} />
      <line x1={x1} y1={y - tick} x2={x1} y2={y + tick} />
      <line x1={x0} y1={y} x2={x1} y2={y} />
      <text className="optics-tag" x={(x0 + x1) / 2} y={y + fs * 1.3}>{label}</text>
    </g>
  )
}
