import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { L, tr } from '../../i18n.js'
import ImageView from '../ImageView.jsx'
import { PHONE, useMedia } from '../useMedia.js'
import { useTween } from './optics-motion.js'
import { Band, Plot, Stages } from './WaveKit.jsx'
import './waves.css'

const FULL = { lo: 0, hi: 1 }
const KEYS = ['c', 'A', 'k', 'phase', 'kx', 'ky']
const format = (key, v) => (key === 'phase' ? `${v}°` : key === 'A' || key === 'c' ? v.toFixed(2) : key === 'ky' && v > 0 ? `+${v}` : `${v}`)

// 2-1 一道波: four target stripes, one at a time. The knobs are a wave's four numbers (and, for the
// last stripe, its two frequencies across and down); each stage adds the knob it is about.
export default function WaveTuner({ level, onSolve, theme }) {
  const t = level.tuner
  const phone = useMedia(PHONE)
  const [p, setP] = useState(t.start)
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => t.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const s = t.stages[stage]
  const match = t.matches(s, p)

  const turn = (key, value) => {
    const next = { ...p, [key]: value }
    setP(next)
    if (t.matches(s, next) && !passed[stage]) {
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const pick = (index) => setStage(index)
  const advance = () => {
    setStage(stage + 1)
    setReached(Math.max(reached, stage + 1))
  }

  // The drawing glides between knob steps; pass and fail read the real knobs.
  const shownValues = useTween(KEYS.map((key) => p[key]))
  const shown = Object.fromEntries(KEYS.map((key, i) => [key, shownValues[i]]))
  const width = phone ? 340 : 600
  const target = s.target
  const yours = t.curve(shown)

  return (
    <div className="bk wv wv-tuner">
      <div className="bk-split">
        <section className="bk-stage">
          {s.twoD ? (
            <TwoD t={t} target={target} shown={shown} p={p} theme={theme} />
          ) : (
            <>
              <div className="wv-rows">
                <div className="wv-row"><span>{tr('目标', 'Target')}</span><Band curve={t.curve(target)} label={tr('目标条纹', 'Target stripes')} /></div>
                <div className="wv-row"><span>{tr('你的波', 'Your wave')}</span><Band curve={yours} label={tr('你的条纹', 'Your stripes')} /></div>
              </div>
              <Plot width={width} height={phone ? 190 : 230} label={tr('一行像素的亮度曲线', 'Brightness along one row of pixels')} lines={[{ curve: t.curve(target), kind: 'target' }, { curve: yours, kind: 'yours', label: tr('你的波', 'your wave') }]} />
              <div className="wv-legend"><span><i className="is-target" />{tr('目标', 'Target')}</span><span><i />{tr('你的波', 'Your wave')}</span><span>{tr('横轴：一幅图的宽度', 'Across: one image width')}</span></div>
              <p className="wv-formula">{tr('亮度', 'Brightness')} = <b>{p.c.toFixed(2)}</b> + <b>{p.A.toFixed(2)}</b> · cos(2π · <b>{p.k}</b> · u + <b>{p.phase}°</b>)</p>
            </>
          )}
        </section>

        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr(`第 ${stage + 1} 条`, `Pattern ${stage + 1}`)} · {L(s.title)}</span>
              <p className="wv-stage-note">{L(s.note)}</p>
            </div>
            <div>
              {s.knobs.map((key) => {
                const knob = t.knobs[key]
                const fill = `${((p[key] - knob.min) / (knob.max - knob.min)) * 100}%`
                return (
                  <label key={key} className="bk-field">
                    <span>{L(knob.label)}</span>
                    <input className="bk-range" type="range" min={knob.min} max={knob.max} step={knob.step} value={p[key]} style={{ '--fill': fill }} aria-valuetext={format(key, p[key])} onChange={(event) => turn(key, Number(event.target.value))} />
                    <output>{format(key, p[key])}</output>
                  </label>
                )
              })}
            </div>
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">
                {match ? <><Check size={15} />{tr('对上了。', 'It matches.')}</> : tr('还没对上。', 'Not matching yet.')}
              </p>
              {match && stage < t.stages.length - 1 && (
                <button className="bk-btn is-primary" onClick={advance}>{tr('下一条', 'Next pattern')} <ArrowRight size={15} /></button>
              )}
            </div>
          </section>
          <Stages stages={t.stages} current={stage} passed={passed} reached={reached} onPick={pick} />
        </div>
      </div>
    </div>
  )
}

// The last stage: the stripes as images, an arrow along (kx, ky) on yours, and where the wave sits
// on the plane of frequencies (the plane the spectrum is drawn on, two levels later).
function TwoD({ t, target, shown, p, theme }) {
  const yours = { ...target, kx: shown.kx, ky: shown.ky }
  const length = Math.min(13, 2.4 * Math.hypot(shown.kx, shown.ky))
  const angle = Math.atan2(shown.ky, shown.kx)
  const tip = [16 + length * Math.cos(angle), 16 + length * Math.sin(angle)]
  const head = (side) => [tip[0] - 2.6 * Math.cos(angle) + side * 1.6 * Math.sin(angle), tip[1] - 2.6 * Math.sin(angle) - side * 1.6 * Math.cos(angle)]
  return (
    <>
      <div className="wv-pair is-three">
        <figure>
          <ImageView img={t.planeWave(target)} range={FULL} size={220} theme={theme} />
          <figcaption className="bk-caption">{tr('目标', 'Target')}</figcaption>
        </figure>
        <figure>
          <ImageView img={t.planeWave(yours)} range={FULL} size={220} theme={theme} />
          {length > 0.5 && (
            <svg className="wv-arrow-layer" viewBox="0 0 32 32" aria-hidden="true">
              <line className="wv-arrow-halo" x1={16} y1={16} x2={tip[0]} y2={tip[1]} strokeWidth={1.4} />
              <line className="wv-arrow" x1={16} y1={16} x2={tip[0]} y2={tip[1]} strokeWidth={0.7} />
              <polygon className="wv-arrow-head" points={[tip, head(1), head(-1)].map((q) => q.join(',')).join(' ')} />
            </svg>
          )}
          <figcaption className="bk-caption">{tr('你的波 · 箭头 = (kx, ky)', 'Your wave · arrow = (kx, ky)')}</figcaption>
        </figure>
        <figure>
          <FrequencyPlane kx={shown.kx} ky={shown.ky} />
          <figcaption className="bk-caption">{tr('频率平面：一道波 = 一个点和它的镜像', 'Frequency plane: one wave = a dot and its mirror image')}</figcaption>
        </figure>
      </div>
      <p className="wv-formula">{tr('亮度', 'Brightness')} = 0.50 + 0.40 · cos(2π · (<b>{p.kx}</b>·x + <b>{p.ky}</b>·y) / 32)</p>
    </>
  )
}

function FrequencyPlane({ kx, ky }) {
  const R = 8
  const cell = 10
  const size = (2 * R + 1) * cell
  const at = (k) => (k + R) * cell + cell / 2
  return (
    <svg className="wv-plane" viewBox={`-14 -14 ${size + 28} ${size + 28}`} role="img" aria-label={tr(`频率平面上的点 (${Math.round(kx)}, ${Math.round(ky)})`, `Dot on the frequency plane at (${Math.round(kx)}, ${Math.round(ky)})`)}>
      <rect className="wv-plane-cell" x={0} y={0} width={size} height={size} rx={4} />
      {Array.from({ length: 2 * R }, (_, i) => (
        <g key={i}>
          <line className="wv-plane-cell" x1={(i + 1) * cell} x2={(i + 1) * cell} y1={0} y2={size} />
          <line className="wv-plane-cell" y1={(i + 1) * cell} y2={(i + 1) * cell} x1={0} x2={size} />
        </g>
      ))}
      <line className="wv-plane-axis" x1={at(0)} x2={at(0)} y1={0} y2={size} />
      <line className="wv-plane-axis" y1={at(0)} y2={at(0)} x1={0} x2={size} />
      <text className="wv-plane-text" x={size + 2} y={at(0) - 4} textAnchor="end">kx</text>
      <text className="wv-plane-text" x={at(0) + 4} y={size + 11}>ky</text>
      <circle className="wv-plane-dot is-mirror" cx={at(-kx)} cy={at(-ky)} r={4} />
      <circle className="wv-plane-dot" cx={at(kx)} cy={at(ky)} r={4.4} />
    </svg>
  )
}
