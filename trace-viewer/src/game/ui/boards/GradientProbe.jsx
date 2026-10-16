import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { fromFn } from '../../engine/image.js'
import { L, tr } from '../../i18n.js'
import ImageView from '../ImageView.jsx'
import { PHONE, useMedia } from '../useMedia.js'
import { useTween } from './optics-motion.js'
import { Plot, Stages } from './WaveKit.jsx'
import './waves.css'
import './light.css'

const N = 16
const FULL = { lo: 0, hi: 1 }
const ARROW = 40 // picture pixels per unit of slope

// 3-4 坡有多陡: a brightness landscape with a probe. The two cross-sections through the probe show
// how the brightness runs across and down; the player sets gx and gy so the tangent lines lie along
// them, and sees the two numbers become one arrow on the picture.
export default function GradientProbe({ level, onSolve, theme }) {
  const m = level.slope
  const phone = useMedia(PHONE)
  const [values, setValues] = useState(() => m.stages.map(() => ({ gx: 0, gy: 0 })))
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => m.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const s = m.stages[stage]
  const g = values[stage]
  const match = m.passes(s, g)
  const f = m.fields[s.field]
  const [px, py] = s.probe
  const truth = m.truth(s)
  const [tgx, tgy] = useTween([g.gx, g.gy])

  const turn = (key, value) => {
    const next = values.map((v, i) => (i === stage ? { ...v, [key]: value } : v))
    setValues(next)
    if (m.passes(s, next[stage]) && !passed[stage]) {
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const advance = () => {
    setStage(stage + 1)
    setReached(Math.max(reached, stage + 1))
  }

  const picture = fromFn(N, N, (x, y) => f(x, y))
  // Cross-sections as functions of u (0 … 1 across the picture), pixel centres at (j + 0.5) / N.
  const across = (u) => f(u * N - 0.5, py)
  const down = (u) => f(px, u * N - 0.5)
  const u0 = (k) => (k + 0.5) / N
  const tangent = (centre, value, slope) => ({ x, y }) => (
    <g className="gp-tangent">
      <line x1={x(u0(centre) - 3 / N)} y1={y(value - 3 * slope)} x2={x(u0(centre) + 3 / N)} y2={y(value + 3 * slope)} />
      <circle cx={x(u0(centre))} cy={y(value)} r={4.5} />
    </g>
  )
  const width = phone ? 340 : 480
  const size = Math.hypot(g.gx, g.gy)
  const angle = (Math.atan2(-g.gy, g.gx) * 180) / Math.PI

  return (
    <div className="bk wv gp">
      <div className="bk-split">
        <section className="bk-stage gp-stage">
          <figure className="gp-picture">
            <ImageView img={picture} range={FULL} size={240} theme={theme} />
            <svg className="gp-overlay" viewBox={`0 0 ${N} ${N}`} aria-hidden="true">
              <line className="gp-cross" x1={0} x2={N} y1={py + 0.5} y2={py + 0.5} />
              <line className="gp-cross" x1={px + 0.5} x2={px + 0.5} y1={0} y2={N} />
              {passed[stage] && <Arrow className="gp-true" x={px + 0.5} y={py + 0.5} dx={truth.gx * ARROW} dy={truth.gy * ARROW} />}
              <Arrow className="gp-arrow" x={px + 0.5} y={py + 0.5} dx={tgx * ARROW} dy={tgy * ARROW} />
              <circle className="gp-probe" cx={px + 0.5} cy={py + 0.5} r={0.45} />
            </svg>
            <figcaption className="bk-caption">{tr('越亮越高 · 金色箭头 = (gx, gy)', 'Brighter is higher · gold arrow = (gx, gy)')}{passed[stage] ? tr(' · 绿色 = 真实梯度', ' · green = the true gradient') : ''}</figcaption>
          </figure>
          <div className="gp-sections">
            <div>
              <span className="bk-label">{tr(`横剖面：第 ${py} 行，往右走`, `Horizontal cross-section: row ${py}, going right`)}</span>
              <Plot width={width} height={phone ? 130 : 140} span={N} label={tr('横剖面', 'Horizontal cross-section')} lines={[{ curve: across, kind: 'target', label: tr('亮度', 'brightness') }]}>
                {tangent(px, f(px, py), tgx)}
              </Plot>
            </div>
            <div>
              <span className="bk-label">{tr(`竖剖面：第 ${px} 列，往下走`, `Vertical cross-section: column ${px}, going down`)}</span>
              <Plot width={width} height={phone ? 130 : 140} span={N} label={tr('竖剖面', 'Vertical cross-section')} lines={[{ curve: down, kind: 'target', label: tr('亮度', 'brightness') }]}>
                {tangent(py, f(px, py), tgy)}
              </Plot>
            </div>
          </div>
        </section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr(`第 ${stage + 1} 步`, `Step ${stage + 1}`)} · {L(s.title)}</span>
              <p className="wv-stage-note">{L(s.note)}</p>
            </div>
            <div>
              {['gx', 'gy'].map((key) => {
                const knob = m.knobs[key]
                const locked = !s.knobs.includes(key)
                return (
                  <label key={key} className={`bk-field ${locked ? 'gp-locked' : ''}`}>
                    <span>{L(knob.label)}</span>
                    <input className="bk-range" type="range" disabled={locked} min={knob.min} max={knob.max} step={knob.step} value={g[key]} style={{ '--fill': `${((g[key] - knob.min) / (knob.max - knob.min)) * 100}%` }} aria-valuetext={g[key].toFixed(2)} onChange={(event) => turn(key, Number(event.target.value))} />
                    <output>{g[key] >= 0 ? '+' : ''}{g[key].toFixed(2)}</output>
                  </label>
                )
              })}
            </div>
            <div className="bk-stats">
              <div className="bk-stat"><b>{size.toFixed(3)}</b><span>{tr('有多陡 √(gx²+gy²)', 'Steepness √(gx²+gy²)')}</span></div>
              <div className="bk-stat"><b>{size > 1e-6 ? `${Math.round(angle)}°` : '—'}</b><span>{tr('朝哪边（右 = 0°，上 = 90°）', 'Direction (right = 0°, up = 90°)')}</span></div>
            </div>
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{tr('两条斜线都贴住了。', 'Both lines lie along their curves.')}</> : tr('让金色斜线贴住剖面曲线。', 'Make the gold lines lie along the cross-section curves.')}</p>
              {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={advance}>{tr('下一步', 'Next')} <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={m.stages} current={stage} passed={passed} reached={reached} onPick={setStage} />
        </div>
      </div>
    </div>
  )
}

function Arrow({ x, y, dx, dy, className }) {
  const length = Math.hypot(dx, dy)
  if (length < 0.2) return null
  const [ux, uy] = [dx / length, dy / length]
  const tip = [x + dx, y + dy]
  const head = Math.min(1.1, length * 0.45)
  return (
    <g className={className}>
      <line x1={x} y1={y} x2={tip[0] - ux * head * 0.6} y2={tip[1] - uy * head * 0.6} />
      <polygon points={`${tip[0]},${tip[1]} ${tip[0] - ux * head - uy * head * 0.55},${tip[1] - uy * head + ux * head * 0.55} ${tip[0] - ux * head + uy * head * 0.55},${tip[1] - uy * head - ux * head * 0.55}`} />
    </g>
  )
}
