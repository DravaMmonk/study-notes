import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { L, tr } from '../../../../shell/i18n.js'
import { PHONE, useMedia } from '../../../../shell/useMedia.js'
import { Plot, Stages, Strip } from './WaveKit.jsx'
import './waves.css'

// 2-2 叠加: one amplitude knob per frequency, the sine waves added up on a middle line of 0.5. Each step asks the
// player to stack their curve onto a target: first two waves they can read off, then the nearest these waves come to
// a square wave.

export default function SumBench({ level, onSolve }) {
  const b = level.sum
  const phone = useMedia(PHONE)
  const blank = () => b.ks.map(() => 0)
  const [values, setValues] = useState(() => b.stages.map(blank))
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => b.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const s = b.stages[stage]
  const amps = values[stage]
  const gap = b.gap(amps, s.target)
  const match = gap <= b.tolerance

  const set = (index, value) => {
    const next = amps.map((a, i) => (i === index ? value : a))
    setValues(values.map((old, i) => (i === stage ? next : old)))
    if (b.gap(next, s.target) <= b.tolerance && !passed[stage]) {
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const advance = () => {
    setStage(stage + 1)
    setReached(Math.max(reached, stage + 1))
  }

  const curve = (a) => (u) => b.at(a, u * b.N)
  const used = amps.map((a, i) => [a, b.ks[i]]).filter(([a]) => a)
  const mean = b.row(amps).reduce((sum, v) => sum + v, 0) / b.N
  const step = b.step

  return (
    <div className="bk wv wv-bench">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          <Plot width={phone ? 340 : 600} height={phone ? 200 : 240} label={tr('你叠加出的曲线与目标', 'Your curve and the target')} lines={[{ curve: curve(s.target), kind: 'target', label: tr('目标', 'target') }, { curve: curve(amps), kind: 'yours', label: tr('你的', 'yours') }]} />
          <div className="wv-legend">
            <span><i className="is-target" />{tr('目标', 'Target')}</span>
            <span><i />{tr('你叠加出的', 'Yours')}</span>
          </div>
          <div className="wv-strips" aria-label={tr('同一行画成像素', 'The same row drawn as pixels')}>
            <Strip label={tr('目标', 'Target')} values={b.row(s.target)} />
            <Strip label={tr('你的', 'Yours')} values={b.row(amps)} />
          </div>
          <p className="wv-formula">
            0.5{used.length ? used.map(([a, k]) => <span key={k}> + <b>{a.toFixed(2)}</b>·sin(k={k})</span>) : null}
            <span className="wv-gap"> · {tr(`这一行的平均 ${mean.toFixed(3)}`, `row average ${mean.toFixed(3)}`)} · {tr(`最大误差 ${gap.toFixed(3)}，须不超过 ${b.tolerance}`, `largest error ${gap.toFixed(3)}, at most ${b.tolerance}`)}</span>
          </p>
        </section>

        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr(`第 ${stage + 1} 步`, `Step ${stage + 1}`)} · {L(s.title)}</span>
              <p className="wv-stage-note">{L(s.note)}</p>
            </div>
            {b.ks.map((k, i) => (
              <label key={k} className="bk-field">
                <span>{tr(`频率 ${k} 的振幅`, `Amplitude at frequency ${k}`)}</span>
                <input className="bk-range" type="range" min={0} max={b.max} step={step} value={amps[i]} style={{ '--fill': `${(amps[i] / b.max) * 100}%` }} onChange={(event) => set(i, Number(event.target.value))} />
                <output>{amps[i].toFixed(2)}</output>
              </label>
            ))}
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{L(s.win)}</> : tr('尚未与目标重合。', 'Not on the target yet.')}</p>
              {passed[stage] && stage < b.stages.length - 1 && <button className="bk-btn is-primary" onClick={advance}>{tr('下一步', 'Next step')} <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={b.stages} current={stage} passed={passed} reached={reached} onPick={setStage} />
        </div>
      </div>
    </div>
  )
}
