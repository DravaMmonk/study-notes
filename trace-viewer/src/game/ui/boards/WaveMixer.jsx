import { useState } from 'react'
import { ArrowRight, Check, RotateCcw } from 'lucide-react'
import { PHONE, useMedia } from '../useMedia.js'
import { Band, Bars, Plot, Squiggle, Stages } from './WaveKit.jsx'
import './waves.css'

const LABELS = ['c', '1', '2', '3', '4', '5', '6', '7', '8']

// 2-2 叠加: nine faders, the average brightness and sines of frequency 1 … 8. The sum is drawn
// against three targets in turn; the error curve shows what is still missing.
export default function WaveMixer({ level, onSolve }) {
  const m = level.mixer
  const phone = useMedia(PHONE)
  const [bars, setBars] = useState(m.start)
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => m.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const s = m.stages[stage]
  const error = m.error(s, bars)
  const match = error <= s.tolerance

  const move = (index, value) => {
    const next = bars.map((v, i) => (i === index ? value : v))
    setBars(next)
    if (m.error(s, next) <= s.tolerance && !passed[stage]) {
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const advance = () => {
    setStage(stage + 1)
    setReached(Math.max(reached, stage + 1))
  }

  const width = phone ? 340 : 600
  const yours = m.sum(bars[0], bars)
  const residual = (u) => s.target(u) - yours(u)
  // The error plot widens to fit the error, in steps of 0.2, so it is never cut off.
  const reach = Math.max(0.2, Math.ceil(Math.max(...Array.from({ length: 129 }, (_, i) => Math.abs(residual(i / 128)))) * 5) / 5)
  // How far the error is from the goal, on a scale where the goal sits at 40 %.
  const meter = Math.min(100, (error / s.tolerance) * 40)

  const note = (
    <div>
      <span className="bk-label">第 {stage + 1} 条 · {s.title}</span>
      <p className="wv-stage-note">{s.note}</p>
    </div>
  )
  const plots = (
    <>
      <div className="wv-rows">
        <div className="wv-row"><span>目标</span><Band curve={s.target} label="目标" /></div>
        <div className="wv-row"><span>你的</span><Band curve={yours} label="你叠出来的" /></div>
      </div>
      <Plot width={width} height={phone ? 150 : 210} label="亮度曲线" lines={[{ curve: s.target, kind: 'target' }, { curve: yours, kind: 'yours', label: '你叠出来的' }]} />
      <Plot width={width} height={phone ? 76 : 104} lo={-reach} hi={reach} ticks={[-reach, 0, reach].map((v) => Number(v.toFixed(1)))} label="误差曲线" lines={[{ curve: residual, kind: 'error', label: '目标 − 你的' }]} />
      <div className="wv-legend"><span><i className="is-target" />目标</span><span><i />你叠出来的</span><span><i className="is-error" />误差 = 目标 − 你的</span></div>
      <div className={`wv-meter ${match ? 'is-pass' : ''}`}>
        <div className="wv-meter-track" aria-hidden="true">
          <div className="wv-meter-fill" style={{ width: `${meter}%` }} />
          <div className="wv-meter-mark" style={{ left: '40%' }} />
        </div>
        <span>误差 <b>{error.toFixed(3)}</b> / 需 ≤ {s.tolerance}</span>
      </div>
    </>
  )
  const faders = (
    <div>
      <span className="bk-label">推杆 · 拖动或用方向键</span>
      <Bars
        values={bars}
        onChange={move}
        min={0}
        max={m.max}
        step={m.step}
        labels={LABELS}
        ghosts={passed[stage] ? m.content(s.target) : null}
        width={phone ? 340 : 380}
        height={phone ? 210 : 250}
        label="平均亮度和各频率正弦波的振幅"
        valueText={(i, v) => `${i ? `频率 ${i}` : '平均亮度'} ${v.toFixed(2)}`}
        under={({ x, y, w, h, index }) => (index ? <Squiggle x={x} y={y} w={w} h={h} k={index} /> : <line className="wv-squiggle" x1={x} x2={x + w} y1={y + h / 2} y2={y + h / 2} />)}
      />
      <p className="bk-caption">{passed[stage] ? '绿线：目标里各频率真正的振幅。' : '每根推杆下面画着它那道波的样子。'}</p>
    </div>
  )
  const next = (
    <div className="wv-next">
      <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />拼上了。</> : '还差一点。'}</p>
      <button className="bk-btn" onClick={() => setBars(m.start)}><RotateCcw size={14} /> 归零</button>
      {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={advance}>下一条 <ArrowRight size={15} /></button>}
    </div>
  )
  const stages = <Stages stages={m.stages} current={stage} passed={passed} reached={reached} onPick={setStage} />

  // On a phone the faders sit right under the curves they change, in one card.
  if (phone) {
    return (
      <div className="bk wv wv-mixer">
        <section className="bk-stage bk-stack">{note}{plots}{faders}{next}</section>
        {stages}
      </div>
    )
  }
  return (
    <div className="bk wv wv-mixer">
      <div className="bk-split">
        <section className="bk-stage bk-stack">{plots}</section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">{note}{faders}{next}</section>
          {stages}
        </div>
      </div>
    </div>
  )
}
