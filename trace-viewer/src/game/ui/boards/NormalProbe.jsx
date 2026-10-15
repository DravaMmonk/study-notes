import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react'
import { PHONE, useMedia } from '../useMedia.js'
import { css, tokenRGB } from '../views/views.js'
import { Stages } from './WaveKit.jsx'
import FigureStage from '../FigureStage.jsx'
import './waves.css'
import './light.css'

const RIM = 0.97 // the furthest a point may go: a surface almost on its side

// Facing as words: which way the surface leans and how far.
const describe = ([x, y]) => {
  const r = Math.hypot(x, y)
  if (r < 0.08) return '几乎脸朝天'
  const tilt = Math.round((Math.asin(Math.min(1, r)) * 180) / Math.PI)
  const angle = (Math.atan2(-y, x) * 180) / Math.PI
  const names = ['右', '右上', '上', '左上', '左', '左下', '下', '右下']
  return `朝${names[Math.round(((angle + 360) % 360) / 45) % 8]}歪 ${tilt}°`
}

// 3-3 一个亮度不够: a facing is a point on a disc seen from above (centre = facing up). Each disc is
// shaded by how bright every facing would be under one lamp; the player drags the point until the
// brightness matches the photo, and sees that a whole line of facings matches.
export default function NormalProbe({ level, onSolve, theme }) {
  const m = level.normal
  const phone = useMedia(PHONE)
  const [points, setPoints] = useState(() => m.stages.map(() => m.start))
  const [first, setFirst] = useState(null)
  const [lines, setLines] = useState(false)
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => m.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const [active, setActive] = useState('A')
  const s = m.stages[stage]
  const point = points[stage]
  const match = m.passes(s, point, first)
  const lit = s.lamps.includes(active) ? active : s.lamps[0]
  const bench = useMemo(
    () => ({ point, active: lit, tolerance: m.tolerance, lamps: Object.fromEntries(s.lamps.map((lamp) => [lamp, { dir: m.lamps[lamp].dir, photo: m.photo[lamp] }])) }),
    [point, lit, m, s],
  )

  const move = (next) => {
    setPoints(points.map((p, i) => (i === stage ? next : p)))
    if (m.passes(s, next, first) && !passed[stage]) {
      if (stage === 0) setFirst(next)
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const advance = () => {
    setStage(stage + 1)
    setReached(Math.max(reached, stage + 1))
  }

  // Equal-brightness lines: shown once the first photo is matched, or on request in the last step.
  const showLines = stage === 1 || (stage === 0 && passed[0]) || lines || (stage === 2 && passed[2])
  const size = s.lamps.length > 1 ? (phone ? 150 : 200) : phone ? 200 : 220

  return (
    <div className="bk wv np">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          <figure className="np-bench">
            <FigureStage name="normal-studio" theme={theme} props={bench} onChange={(change) => (change.point ? move(change.point) : change.active && setActive(change.active))} />
            <figcaption className="bk-caption">在台面上拖动，法线杆跟着手指歪{s.lamps.length > 1 ? ' · 点一盏灯，看它那张照片' : ''} · 近处的灰阶尺：游标是现在的亮度，小旗是照片里的亮度</figcaption>
          </figure>
          <div className={`np-discs is-${s.lamps.length}`}>
            {s.lamps.map((lamp) => (
              <Disc key={lamp} m={m} lamp={lamp} point={point} onMove={move} size={size} showLine={showLines} first={stage === 1 ? first : null} theme={theme} />
            ))}
          </div>
          <div className="np-readings">
            {s.lamps.map((lamp) => {
              const value = m.shade(point, lamp)
              const ok = Math.abs(value - m.photo[lamp]) <= m.tolerance
              return (
                <div key={lamp} className={`bk-stat ${ok ? 'is-pass' : ''}`}>
                  <b>{value.toFixed(3)}</b>
                  <span>{m.lamps[lamp].label}下的亮度 · 照片里 {m.photo[lamp].toFixed(3)}</span>
                </div>
              )
            })}
            <div className="bk-stat"><b className="np-facing">{describe(point)}</b><span>现在这块表面的朝向</span></div>
          </div>
        </section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">第 {stage + 1} 步 · {s.title}</span>
              <p className="wv-stage-note">{s.note}</p>
            </div>
            {stage === 2 && !passed[2] && (
              <button className="bk-btn" onClick={() => setLines(!lines)}>{lines ? <EyeOff size={14} /> : <Eye size={14} />}{lines ? '藏起等亮线' : '显示等亮线'}</button>
            )}
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">
                {match ? <><Check size={15} />对上了。</> : stage === 1 && first && Math.hypot(point[0] - first[0], point[1] - first[1]) < (s.apart ?? 0) && s.lamps.every((l) => Math.abs(m.shade(point, l) - m.photo[l]) <= m.tolerance) ? '亮度对了，但离第一个答案太近。' : '拖动圆点。'}
              </p>
              {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={advance}>下一步 <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={m.stages} current={stage} passed={passed} reached={reached} onPick={setStage} />
        </div>
      </div>
    </div>
  )
}

function Disc({ m, lamp, point, onMove, size, showLine, first, theme }) {
  const canvas = useRef(null)
  const dragging = useRef(false)
  const half = size / 2
  const at = ([x, y]) => [half + x * (half - 4), half + y * (half - 4)]

  useEffect(() => {
    const node = canvas.current
    if (!node) return
    const dpr = window.devicePixelRatio || 1
    const n = Math.round(size * dpr)
    node.width = n
    node.height = n
    const ctx = node.getContext('2d')
    const image = ctx.createImageData(n, n)
    const back = tokenRGB('--canvas', [243, 241, 235])
    for (let py = 0; py < n; py++) {
      for (let px = 0; px < n; px++) {
        const x = ((px + 0.5) / n) * 2 - 1
        const y = ((py + 0.5) / n) * 2 - 1
        const inside = x * x + y * y <= 1
        const g = inside ? Math.round(255 * m.shade([x, y], lamp)) : null
        image.data.set(inside ? [g, g, g, 255] : [...back, 0], (py * n + px) * 4)
      }
    }
    ctx.putImageData(image, 0, 0)
    ctx.strokeStyle = css(tokenRGB('--rule', [191, 185, 172]))
    ctx.lineWidth = dpr
    ctx.beginPath()
    ctx.arc(n / 2, n / 2, n / 2 - dpr, 0, Math.PI * 2)
    ctx.stroke()
  }, [m, lamp, size, theme])

  const pick = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    let x = ((event.clientX - box.left) / box.width) * 2 - 1
    let y = ((event.clientY - box.top) / box.height) * 2 - 1
    const r = Math.hypot(x, y)
    if (r > RIM) [x, y] = [(x / r) * RIM, (y / r) * RIM]
    onMove([Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000])
  }
  const [hx, hy] = at(point)
  const l = m.lamps[lamp].dir
  const [lx, ly] = at([l[0], l[1]])
  const contour = showLine ? isoLine(m, lamp, size, at) : ''

  return (
    <figure className="np-disc" style={{ width: size }}>
      <div
        className="np-surface"
        style={{ width: size, height: size }}
        onPointerDown={(event) => {
          dragging.current = true
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            // A synthetic pointer cannot be captured; the click still moves the point.
          }
          pick(event)
        }}
        onPointerMove={(event) => dragging.current && pick(event)}
        onPointerUp={() => {
          dragging.current = false
        }}
        onPointerCancel={() => {
          dragging.current = false
        }}
      >
        <canvas ref={canvas} style={{ width: size, height: size }} aria-hidden="true" />
        <svg viewBox={`0 0 ${size} ${size}`} className="np-overlay" role="img" aria-label={`朝向盘，${m.lamps[lamp].label}`}>
          <circle className="np-ring" cx={half} cy={half} r={(half - 4) * Math.sin(Math.PI / 6)} />
          <circle className="np-ring" cx={half} cy={half} r={(half - 4) * Math.sin(Math.PI / 3)} />
          <text className="np-ring-text" x={half + 3} y={half - (half - 4) * Math.sin(Math.PI / 6) - 3}>30°</text>
          <text className="np-ring-text" x={half + 3} y={half - (half - 4) * Math.sin(Math.PI / 3) - 3}>60°</text>
          {contour && <path className="np-iso" d={contour} />}
          <g className="np-lamp" transform={`translate(${lx} ${ly})`}>
            <circle r={9} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1={12 * Math.cos((a * Math.PI) / 180)} y1={12 * Math.sin((a * Math.PI) / 180)} x2={16 * Math.cos((a * Math.PI) / 180)} y2={16 * Math.sin((a * Math.PI) / 180)} />)}
          </g>
          {first && <circle className="np-first" cx={at(first)[0]} cy={at(first)[1]} r={8} />}
          <line className="np-stem" x1={half} y1={half} x2={hx} y2={hy} />
          <circle className="np-handle" cx={hx} cy={hy} r={9} />
        </svg>
      </div>
      <figcaption className="bk-caption">{m.lamps[lamp].label}照着 · 灯标 = 正对这盏灯的朝向{showLine ? ' · 金线 = 和照片一样亮的所有朝向' : ''}</figcaption>
    </figure>
  )
}

// The line through every facing as bright as the photo, by marching squares on a 72 × 72 grid.
function isoLine(m, lamp, size, at) {
  const n = 72
  const target = m.photo[lamp]
  const value = (i, j) => {
    const x = (i / n) * 2 - 1
    const y = (j / n) * 2 - 1
    return x * x + y * y > 1 ? null : m.shade([x, y], lamp) - target
  }
  const point = (i, j) => at([(i / n) * 2 - 1, (j / n) * 2 - 1])
  let d = ''
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]
      const crossings = []
      for (let k = 0; k < 4; k++) {
        const [a, b] = [corners[k], corners[(k + 1) % 4]]
        const [va, vb] = [value(...a), value(...b)]
        if (va === null || vb === null) continue
        if ((va < 0) !== (vb < 0)) {
          const t = va / (va - vb)
          crossings.push(point(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
        }
      }
      for (let k = 0; k + 1 < crossings.length; k += 2) d += `M${crossings[k][0].toFixed(1)},${crossings[k][1].toFixed(1)}L${crossings[k + 1][0].toFixed(1)},${crossings[k + 1][1].toFixed(1)}`
    }
  }
  return d
}
