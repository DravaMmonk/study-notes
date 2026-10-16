import { useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { L, keyOf, tr } from '../../i18n.js'
import ImageView from '../ImageView.jsx'
import { PHONE, useMedia } from '../useMedia.js'
import { Plot, Stages } from './WaveKit.jsx'
import './waves.css'
import './light.css'

const FULL = { lo: 0, hi: 1 }
const ROW = 7 // the cross-section follows the F's middle bar
const LINE_KINDS = { A: 'target', B: 'yours', C: 'error', D: 'seen' }

// 3-7 整体变亮: the player sets the edge threshold, the photos are the lighting. Each photo shows its
// edge map against the outline we want; the cross-section overlays every photo's slope along one
// row, so brightening (curve unchanged) and dimming (curve squashed) are seen, not told.
export default function LightChange({ level, onSolve, theme }) {
  const m = level.change
  const phone = useMedia(PHONE)
  const [s, setS] = useState(m.start)
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => m.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const st = m.stages[stage]
  const match = m.passes(st, s)

  const update = (next) => {
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
    // The dim photo's own threshold starts where the shared one is, so the miss is seen first.
    if (stage === 0) setS({ ...s, tC: s.t })
  }

  const photos = st.photos.map((key) => m.photos.find((p) => p.key === key))
  const relative = st.controls.includes('relative') && s.relative
  const slopeRow = (img) => {
    const g = m.gradmag(img)
    const peak = relative ? Math.max(...g.data) : 1
    return Array.from(g.data.slice(ROW * 16, ROW * 16 + 16), (v) => v / peak)
  }
  const lines = photos.map((p) => ({ curve: slopeRow(p.img), kind: LINE_KINDS[p.key], steps: true, label: p.label }))
  const thresholds = st.controls.includes('tC') ? [['t', s.t], ['tC', s.tC]] : [[relative ? { zh: '门槛', en: 'threshold' } : 't', relative ? s.r : s.t]]
  const hi = relative ? 1.1 : 0.3
  const width = phone ? 340 : 600
  const size = phone ? 72 : 92

  return (
    <div className="bk wv lc">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          <div className="lc-cards">
            <figure className="lc-card is-truth">
              <span className="bk-label">{tr('要找的边', 'Edges to find')}</span>
              <ImageView img={m.truth} range={FULL} size={size} theme={theme} />
              <figcaption className="bk-caption">{tr('字母 F 的轮廓', 'Outline of the letter F')}</figcaption>
            </figure>
            {photos.map((p) => {
              const { t, relative: rel } = m.thresholdFor(st, p.key, s)
              const mask = m.edgesAt(p.img, t, rel)
              const missing = m.truth.data.filter((v, i) => v && !mask.data[i]).length
              const extra = mask.data.filter((v, i) => v && !m.truth.data[i]).length
              const ok = missing + extra <= m.missAllowed
              return (
                <figure key={p.key} className={`lc-card ${ok ? 'is-pass' : 'is-fail'}`}>
                  <span className="bk-label">{L(p.label)}</span>
                  <div className="lc-pair">
                    <ImageView img={p.img} range={FULL} size={size} theme={theme} />
                    <ImageView img={mask} range={FULL} size={size} theme={theme} />
                  </div>
                  <figcaption className={`lc-verdict ${ok ? 'is-pass' : 'is-fail'}`}>
                    {ok ? <Check size={13} /> : <X size={13} />}
                    {ok ? tr('边找对了', 'Edges right') : tr(`漏 ${missing} · 多 ${extra}`, `${missing} missed · ${extra} extra`)}
                    <small>{rel ? tr(`÷ 最陡 > ${t.toFixed(2)}`, `÷ steepest > ${t.toFixed(2)}`) : `> ${t.toFixed(3)}`}</small>
                  </figcaption>
                </figure>
              )
            })}
          </div>
          <div>
            <span className="bk-label">{tr(`第 ${ROW} 行的坡度`, `Slope along row ${ROW}`)}{relative ? tr('（除以各自最陡的坡度）', " (divided by each photo's steepest slope)") : ''}</span>
            <Plot width={width} height={phone ? 170 : 200} lo={0} hi={hi} ticks={relative ? [0, 0.5, 1] : [0, 0.1, 0.2]} span={16} label={tr('各张照片的坡度剖面', 'Slope cross-section of each photo')} lines={lines}>
              {({ x, y }) => (
                <g className="lc-threshold">
                  {thresholds.map(([name, v]) => (
                    <g key={keyOf(name)}>
                      <line x1={x(0)} x2={x(1)} y1={y(v)} y2={y(v)} />
                      <text x={x(1) - 4} y={y(v) - 5} textAnchor="end">{L(name)}</text>
                    </g>
                  ))}
                </g>
              )}
            </Plot>
            <div className="wv-legend">
              {photos.map((p) => <span key={p.key}><i className={`is-${LINE_KINDS[p.key]}`} />{L(p.label)}</span>)}
            </div>
          </div>
        </section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr(`第 ${stage + 1} 步`, `Step ${stage + 1}`)} · {L(st.title)}</span>
              <p className="wv-stage-note">{L(st.note)}</p>
            </div>
            <div>
              {st.controls.includes('relative') && (
                <label className="bk-check lc-ruler">
                  <input type="checkbox" checked={s.relative} onChange={(event) => update({ ...s, relative: event.target.checked })} />
                  {tr('用最陡的边当尺子', 'Use the steepest edge as a ruler')}
                </label>
              )}
              {st.controls.filter((key) => key !== 'relative').map((key) => {
                const shown = key === 'r' && !s.relative ? 't' : key
                const knob = m.knobs[shown]
                return (
                  <label key={shown} className="bk-field">
                    <span>{L(knob.label)}</span>
                    <input className="bk-range" type="range" min={knob.min} max={knob.max} step={knob.step} value={s[shown]} style={{ '--fill': `${((s[shown] - knob.min) / (knob.max - knob.min)) * 100}%` }} onChange={(event) => update({ ...s, [shown]: Number(event.target.value) })} />
                    <output>{s[shown].toFixed(shown === 'r' ? 2 : 3)}</output>
                  </label>
                )
              })}
            </div>
            {st.controls.includes('tC') && (
              <div className="bk-stats">
                <div className="bk-stat"><b>{(s.tC / s.t).toFixed(2)}</b><span>tC ÷ t</span></div>
                <div className="bk-stat"><b>0.40</b><span>{tr('灯暗到原来的', 'Lamp now ÷ before')}</span></div>
              </div>
            )}
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{tr('每张照片的边都找对了。', "Every photo's edges are right.")}</> : tr('还有照片的边没找对。', "Some photos' edges are still wrong.")}</p>
              {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={advance}>{tr('下一步', 'Next')} <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={m.stages} current={stage} passed={passed} reached={reached} onPick={setStage} />
        </div>
      </div>
    </div>
  )
}
