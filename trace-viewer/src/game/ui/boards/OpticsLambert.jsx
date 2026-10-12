import { useEffect, useRef, useState } from 'react'
import { Check, RotateCw, X } from 'lucide-react'
import ImageView from '../ImageView.jsx'
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
  const dial = useRef(null)
  const dragging = useRef(false)
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
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = true
    fromPointer(event)
  }
  const keys = (event) => {
    const change = { ArrowLeft: [0, -15], ArrowRight: [0, 15], ArrowUp: [5, 0], ArrowDown: [-5, 0] }[event.key]
    if (!change) return
    event.preventDefault()
    update({ ...setting, el: setting.el + change[0], az: setting.az + change[1] })
  }

  const [lx, ly] = lampXY(setting)
  const ghost = twin && lampXY(twin)

  return (
    <div className="optics optics-lambert">
      <div className="optics-lambert-controls">
        <figure className="optics-dial">
          <svg
            ref={dial}
            viewBox={`${-R - 14} ${-R - 14} ${2 * R + 28} ${2 * R + 28}`}
            role="slider"
            tabIndex={0}
            aria-label="灯的方向"
            aria-valuetext={`方位 ${setting.az}°，高度 ${setting.el}°`}
            onPointerDown={press}
            onPointerMove={(event) => dragging.current && fromPointer(event)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
            onKeyDown={keys}
          >
            <circle className="optics-dial-sky" r={R} />
            {[30, 60].map((el) => <circle key={el} className="optics-dial-ring" r={R * Math.cos((el * Math.PI) / 180)} />)}
            {/* the sheet's ridges, as seen from above: they turn with the turntable */}
            <g className="optics-dial-ridges" transform={stage === 2 ? 'rotate(90)' : undefined}>
              {[-45, -15, 15, 45].map((x) => <line key={x} x1={x} y1={-R * 0.55} x2={x} y2={R * 0.55} />)}
            </g>
            {ghost && <circle className="optics-lamp is-ghost" cx={ghost[0]} cy={ghost[1]} r={8} />}
            <line className="optics-lamp-arm" x1={0} y1={0} x2={lx} y2={ly} />
            <circle className="optics-lamp" cx={lx} cy={ly} r={8} />
          </svg>
          <figcaption>灯（从上往下看；边缘 = 贴着地平线）</figcaption>
        </figure>
        <label className="optics-slider">
          <span>反射率 ρ</span>
          <input type="range" min={0.2} max={1} step={0.05} value={setting.rho} onChange={(event) => update({ ...setting, rho: Number(event.target.value) })} />
          <b>{setting.rho.toFixed(2)}</b>
        </label>
        <p className="optics-readout">{fmt(setting)}</p>
      </div>

      <div className="optics-shots">
        <ShotRow label="照片 A" photo={m.photoA} mine={mineA} ok={okA} tolerance={m.TOLERANCE} theme={theme} />
        {stage === 2 && <ShotRow label="照片 B · 转 90° 后" photo={m.photoB} mine={mineB} ok={okB} tolerance={m.TOLERANCE} theme={theme} />}

        {twin && (
          <div className="optics-twin">
            <figure>
              <ImageView img={m.render(twin, stage === 2)} size={96} theme={theme} />
              <figcaption>{stage === 2 ? '它在 B 下' : '它在 A 下'}</figcaption>
            </figure>
            <div>
              <p className={`optics-twin-head ${stage === 2 ? 'is-bad' : 'is-ok'}`}>
                {stage === 2 ? <X size={14} /> : <Check size={14} />}
                {stage === 2 ? '这一组对不上 B' : '这一组也和照片 A 一模一样'}
              </p>
              <p className="optics-readout">{fmt(twin)}</p>
              {stage === 1 && (
                <button className="optics-button" onClick={() => setStage(2)}><RotateCw size={14} /> 转台转 90°，再拍一张</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ShotRow({ label, photo, mine, ok, tolerance, theme }) {
  return (
    <section className={`optics-shot ${ok ? 'is-ok' : 'is-bad'}`}>
      <h3 className="panel-label">{label}</h3>
      <div className="optics-shot-images">
        <figure>
          <ImageView img={photo} size={190} theme={theme} />
          <figcaption>照片</figcaption>
        </figure>
        <figure>
          <ImageView img={mine} size={190} theme={theme} />
          <figcaption>你的渲染</figcaption>
        </figure>
        <figure>
          <ImageView img={mine} against={photo} tolerance={tolerance} size={190} theme={theme} />
          <figcaption>{ok ? <><Check size={12} /> 每格都对上</> : <><X size={12} /> 亮色格对不上</>}</figcaption>
        </figure>
      </div>
    </section>
  )
}
