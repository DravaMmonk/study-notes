import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import ImageView from '../ImageView.jsx'
import { PHONE, useMedia } from '../useMedia.js'
import { Plot, Stages } from './WaveKit.jsx'
import './waves.css'
import './light.css'

const FULL = { lo: 0, hi: 1 }
const ROW = 7 // the row the cross-section follows: through the F's middle bar

const format = (key, v) => (key === 'b' ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}` : key === 'a' ? `×${v.toFixed(2)}` : v.toFixed(2))

// 3-6 整体变亮: one scene under changing light. The picture, its edge map at a threshold, and the
// cross-section of one row with its slope, so adding light (curve lifted) and dimming it (curve
// squashed) can be told apart by what they do to the slope.
export default function LightChange({ level, onSolve, theme }) {
  const m = level.change
  const phone = useMedia(PHONE)
  const [s, setS] = useState(m.start)
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => m.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const st = m.stages[stage]
  const match = m.passes(st, s)

  const turn = (key, value) => {
    const next = { ...s, [key]: value }
    setS(next)
    if (m.passes(st, next) && !passed[stage]) {
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const advance = () => {
    setStage(stage + 1)
    setReached(Math.max(reached, stage + 1))
  }

  const mine = m.relit(s)
  const edges = m.edgesOf(mine, s.t)
  const slope = m.gradmag(mine)
  const count = edges.data.reduce((a, b) => a + b, 0)
  const wanted = m.original.data.reduce((a, b) => a + b, 0)
  const missing = m.original.data.filter((v, i) => v && !edges.data[i]).length
  const extra = edges.data.filter((v, i) => v && !m.original.data[i]).length
  const target = st.goal === 'photo' ? m.relit({ ...st.target }) : null
  const row = (img) => Array.from(img.data.slice(ROW * img.w, (ROW + 1) * img.w))
  const width = phone ? 340 : 600
  const size = phone ? 100 : 150

  return (
    <div className="bk wv lc">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          <div className="lc-pictures">
            <figure>
              {target ? <ImageView img={target} range={FULL} size={size} theme={theme} /> : <ImageView img={m.original} range={FULL} size={size} theme={theme} />}
              <figcaption className="bk-caption">{target ? '目标照片' : '要的边（原来的边缘图）'}</figcaption>
            </figure>
            <figure>
              <ImageView img={mine} range={FULL} size={size} theme={theme} />
              <span className="lc-row" style={{ top: `${((ROW + 0.5) / 16) * 100}%` }} aria-hidden="true" />
              <figcaption className="bk-caption">你的图 · 金线是剖面那一行</figcaption>
            </figure>
            <figure>
              <ImageView img={edges} range={FULL} size={size} theme={theme} />
              <figcaption className={`bk-caption ${missing || extra ? 'is-fail' : ''}`}>边缘图：坡度 &gt; {s.t.toFixed(2)}</figcaption>
            </figure>
          </div>
          <div>
            <span className="bk-label">第 {ROW} 行的剖面</span>
            <Plot width={width} height={phone ? 160 : 190} lo={0} hi={1.2} ticks={[0, 0.5, 1]} span={16} label="亮度和坡度" lines={[{ curve: row(mine), kind: 'yours', steps: true, label: '亮度' }, { curve: row(slope), kind: 'error', steps: true, label: '坡度' }]}>
              {({ x, y }) => (
                <g className="lc-threshold">
                  <line x1={x(0)} x2={x(1)} y1={y(s.t)} y2={y(s.t)} />
                  <text x={x(1) - 4} y={y(s.t) - 5} textAnchor="end">门槛 t</text>
                </g>
              )}
            </Plot>
            <div className="wv-legend"><span><i />亮度</span><span><i className="is-error" />坡度（梯度大小）</span><span><i className="is-target" />门槛：坡度超过它才算边</span></div>
          </div>
        </section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">第 {stage + 1} 步 · {st.title}</span>
              <p className="wv-stage-note">{st.note}</p>
            </div>
            <div>
              {st.knobs.map((key) => {
                const knob = m.knobs[key]
                return (
                  <label key={key} className="bk-field">
                    <span>{knob.label}</span>
                    <input className="bk-range" type="range" min={knob.min} max={knob.max} step={knob.step} value={s[key]} style={{ '--fill': `${((s[key] - knob.min) / (knob.max - knob.min)) * 100}%` }} aria-valuetext={format(key, s[key])} onChange={(event) => turn(key, Number(event.target.value))} />
                    <output>{format(key, s[key])}</output>
                  </label>
                )
              })}
            </div>
            <div className="bk-stats">
              <div className={`bk-stat ${missing ? 'is-fail' : 'is-pass'}`}><b>{missing}</b><span>漏掉的边像素</span></div>
              <div className={`bk-stat ${extra ? 'is-fail' : 'is-pass'}`}><b>{extra}</b><span>多出来的</span></div>
              <div className="bk-stat"><b>{count}/{wanted}</b><span>边像素 / 原来</span></div>
            </div>
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{st.goal === 'photo' ? '和目标照片一样了。' : '边一条不少。'}</> : st.goal === 'photo' ? '还和目标照片不一样。' : '边缘图还和原来不一样。'}</p>
              {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={advance}>下一步 <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={m.stages} current={stage} passed={passed} reached={reached} onPick={setStage} />
        </div>
      </div>
    </div>
  )
}
