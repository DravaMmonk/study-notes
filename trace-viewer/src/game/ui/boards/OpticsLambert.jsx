import { useEffect, useRef, useState } from 'react'
import { Check, RotateCw, X } from 'lucide-react'
import ImageView from '../ImageView.jsx'
import { useTween } from './optics-motion.js'
import './optics.css'

// 3-3 朗伯台: a corrugated matte sheet under one lamp. The dial is the sky seen from above (rim =
// horizon, centre = straight overhead); drag the lamp, set the albedo, and compare your render with
// the photo pixel by pixel. The first match reveals a twin that matches just as well; the second
// photo (the sheet turned 90°) shows which one was real.

const R = 92 // dial radius in its own units
const lampXY = ({ el, az }) => {
  const r = R * Math.cos((el * Math.PI) / 180)
  return [r * Math.cos((az * Math.PI) / 180), r * Math.sin((az * Math.PI) / 180)]
}
const fmt = (s) => `ρ ${s.rho.toFixed(2)} · 方位 ${s.az}° · 高度 ${s.el}°`

export default function OpticsLambert({ level, onSolve, theme }) {
  const m = level.model
  const [setting, setSetting] = useState(m.START)
  const [twin, setTwin] = useState(null)
  const [stage, setStage] = useState(1)
  const [dragging, setDragging] = useState(false)
  const dial = useRef(null)
  const shotB = useRef(null)
  const fired = useRef(false)

  const mineA = m.render(setting)
  const mineB = m.render(setting, true)
  const okA = m.matches(setting)
  const okB = m.matches(setting, true)
  const done = stage === 2 && okA && okB

  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true
      onSolve()
    }
  }, [done, onSolve])

  // The second photo appears above the dial: bring it into view when the table turns.
  useEffect(() => {
    if (stage !== 2) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    shotB.current?.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
  }, [stage])

  const update = (raw) => {
    const next = m.snap(raw)
    setSetting(next)
    if (stage === 1 && !twin && m.matches(next)) setTwin(m.twinOf(next))
  }

  const fromPointer = (event) => {
    const point = dial.current.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const p = point.matrixTransform(dial.current.getScreenCTM().inverse())
    const r = Math.min(R, Math.hypot(p.x, p.y))
    update({ ...setting, el: (Math.acos(r / R) * 180) / Math.PI, az: (Math.atan2(p.y, p.x) * 180) / Math.PI })
  }
  const press = (event) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    fromPointer(event)
  }
  const keys = (event) => {
    const change = { ArrowLeft: [0, -15], ArrowRight: [0, 15], ArrowUp: [5, 0], ArrowDown: [-5, 0] }[event.key]
    if (!change) return
    event.preventDefault()
    update({ ...setting, el: setting.el + change[0], az: setting.az + change[1] })
  }

  // The lamp glides between the snapped grid points instead of hopping.
  const [lx, ly] = useTween(lampXY(setting), { ms: 160 })
  const ghost = twin && lampXY(twin)
  const fill = `${((setting.rho - 0.2) / 0.8) * 100}%`
  const goals = [
    { key: 'A', label: '照片 A', ok: okA, value: m.worst(mineA, m.photoA) },
    ...(stage === 2 ? [{ key: 'B', label: '照片 B', ok: okB, value: m.worst(mineB, m.photoB) }] : []),
  ]

  return (
    <div className="bk optics optics-lambert">
      <div className="optics-shots">
        <ShotRow label="照片 A" photo={m.photoA} mine={mineA} ok={okA} tolerance={m.TOLERANCE} theme={theme} />
        {stage === 2 && <ShotRow ref={shotB} label="照片 B · 转 90° 后" photo={m.photoB} mine={mineB} ok={okB} tolerance={m.TOLERANCE} theme={theme} />}
      </div>

      <aside className="bk-panel optics-lamp-panel">
        <figure className="optics-dial">
          <svg
            ref={dial}
            viewBox={`${-R - 14} ${-R - 14} ${2 * R + 28} ${2 * R + 28}`}
            role="slider"
            tabIndex={0}
            aria-label="灯的方向"
            aria-valuetext={`方位 ${setting.az}°，高度 ${setting.el}°`}
            onPointerDown={press}
            onPointerMove={(event) => dragging && fromPointer(event)}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            onKeyDown={keys}
          >
            <circle className="optics-dial-sky" r={R} />
            {[30, 60].map((el) => <circle key={el} className="optics-dial-ring" r={R * Math.cos((el * Math.PI) / 180)} />)}
            {/* the sheet's ridges, as seen from above: they turn with the turntable */}
            <g className="optics-dial-ridges" style={{ transform: stage === 2 ? 'rotate(90deg)' : 'none' }}>
              {[-45, -15, 15, 45].map((x) => <line key={x} x1={x} y1={-R * 0.55} x2={x} y2={R * 0.55} />)}
            </g>
            {[30, 60].map((el) => (
              <text key={el} className="optics-dial-label" x={0} y={R * Math.cos((el * Math.PI) / 180) - 4}>{el}°</text>
            ))}
            {ghost && <circle className="optics-lamp is-ghost" cx={ghost[0]} cy={ghost[1]} r={9} />}
            <line className="optics-lamp-arm" x1={0} y1={0} x2={lx} y2={ly} />
            <circle className={`optics-lamp ${dragging ? 'is-dragging' : ''}`} cx={lx} cy={ly} r={9} />
          </svg>
          <figcaption className="bk-caption">灯：从上往下看，边缘 = 贴着地平线，圆心 = 正上方</figcaption>
        </figure>

        <label className="bk-field">
          <span>反射率 ρ</span>
          <input className="bk-range" type="range" min={0.2} max={1} step={0.05} value={setting.rho} style={{ '--fill': fill }} onChange={(event) => update({ ...setting, rho: Number(event.target.value) })} />
          <output>{setting.rho.toFixed(2)}</output>
        </label>
        <p className="bk-caption optics-readout">{fmt(setting)}</p>

        <ul className="bk-goals" aria-live="polite">
          {goals.map((g) => (
            <li key={g.key} className={`bk-goal ${g.ok ? 'is-pass' : ''}`}>
              {g.ok ? <Check size={16} /> : <X size={16} />}
              <span>{g.label} 每格对上 <small>最大差 ≤ {m.TOLERANCE}</small></span>
              <b>{g.value.toFixed(2)}</b>
            </li>
          ))}
        </ul>
      </aside>

      {twin && (
        <div className={`bk-panel optics-twin ${stage === 2 ? 'is-settled' : ''}`}>
          <figure>
            <ImageView img={m.render(twin, stage === 2)} size={96} theme={theme} />
            <figcaption className="bk-caption">{stage === 2 ? '它在 B 下' : '它在 A 下'}</figcaption>
          </figure>
          <div>
            <p className="bk-title optics-twin-head">
              {stage === 2 ? <X size={16} /> : <Check size={16} />}
              {stage === 2 ? '这一组对不上 B' : '这一组也和照片 A 一模一样'}
            </p>
            <p className="bk-caption">{fmt(twin)}</p>
            {stage === 1 && (
              <button className="bk-btn is-primary" onClick={() => setStage(2)}><RotateCw size={15} /> 转台转 90°，再拍一张</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ShotRow({ ref, label, photo, mine, ok, tolerance, theme }) {
  return (
    <section ref={ref} className={`bk-stage optics-shot ${ok ? 'is-pass' : ''}`}>
      <span className="bk-label">{label}</span>
      <div className="optics-shot-images">
        <figure>
          <ImageView img={photo} size={190} theme={theme} />
          <figcaption className="bk-caption">照片</figcaption>
        </figure>
        <figure>
          <ImageView img={mine} size={190} theme={theme} />
          <figcaption className="bk-caption">你的渲染</figcaption>
        </figure>
        <figure>
          <ImageView img={mine} against={photo} tolerance={tolerance} size={190} theme={theme} />
          <figcaption className={`bk-caption optics-diff ${ok ? 'is-pass' : ''}`}>{ok ? <><Check size={12} /> 每格都对上</> : <><X size={12} /> 红格对不上</>}</figcaption>
        </figure>
      </div>
    </section>
  )
}
