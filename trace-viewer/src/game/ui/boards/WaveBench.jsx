import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { L, tr } from '../../../../../games/kit/shell/i18n.js'
import { PHONE, useMedia } from '../../../../../games/kit/shell/useMedia.js'
import { piText } from '../../engine/pi.js'
import { Plot, Stages } from './WaveKit.jsx'
import './waves.css'

// 2-1 一道波: a wave c + A·cos(2π·k·x/N + φ) with one knob per number. Each step opens one knob and asks the player to
// lay their wave on the target, so they see what that number does to the curve and to the stripes it draws; the last
// step opens all four. φ moves in quarters of π.

const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2))
const phaseText = (q) => (q === 0 ? '0' : piText((q * Math.PI) / 4))

export default function WaveBench({ level, onSolve }) {
  const w = level.wave
  const phone = useMedia(PHONE)
  const [values, setValues] = useState(() => w.stages.map((s) => ({ ...s.start })))
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => w.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const s = w.stages[stage]
  const v = values[stage]
  const match = w.same(v, s.target)

  const set = (knob, value) => {
    const next = { ...v, [knob]: value }
    setValues(values.map((old, i) => (i === stage ? next : old)))
    if (w.same(next, s.target) && !passed[stage]) {
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const advance = () => {
    setStage(stage + 1)
    setReached(Math.max(reached, stage + 1))
  }

  const curve = (p) => (u) => w.at(p, u * w.N)
  const formula = (p, open) => {
    const mark = (knob, text) => (open.includes(knob) ? <b>{text}</b> : text)
    const phase = phaseText(p.phi)
    return <>{mark('c', fmt(p.c))} + {mark('A', fmt(p.A))}·cos(2π·{mark('k', p.k)}·x/{w.N}{p.phi < 0 ? ' − ' : ' + '}{mark('phi', p.phi < 0 ? phase.replace('−', '') : phase)})</>
  }

  return (
    <div className="bk wv wv-bench">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          <Plot width={phone ? 340 : 600} height={phone ? 200 : 240} label={tr('你的波和目标', 'Your wave and the target')} lines={[{ curve: curve(s.target), kind: 'target', label: tr('目标', 'target') }, { curve: curve(v), kind: 'yours', label: tr('你的', 'yours') }]} />
          <div className="wv-legend">
            <span><i className="is-target" />{tr('目标', 'Target')}</span>
            <span><i />{tr('你的波', 'Your wave')}</span>
          </div>
          <div className="wv-strips" aria-label={tr('同一行画成像素', 'The same row drawn as pixels')}>
            <Strip label={tr('目标', 'Target')} values={w.row(s.target)} />
            <Strip label={tr('你的', 'Yours')} values={w.row(v)} />
          </div>
          <p className="wv-formula">{formula(v, s.knobs)}</p>
        </section>

        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr(`第 ${stage + 1} 步`, `Step ${stage + 1}`)} · {L(s.title)}</span>
              <p className="wv-stage-note">{L(s.note)}</p>
            </div>
            {s.knobs.map((knob) => {
              const { min, max, step, label } = w.knobs[knob]
              const value = v[knob]
              return (
                <label key={knob} className="bk-field">
                  <span>{L(label)}</span>
                  <input className="bk-range" type="range" min={min} max={max} step={step} value={value} style={{ '--fill': `${((value - min) / (max - min)) * 100}%` }} onChange={(event) => set(knob, Number(event.target.value))} />
                  <output>{knob === 'phi' ? phaseText(value) : fmt(value)}</output>
                </label>
              )
            })}
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{L(s.win)}</> : tr('还没和目标重合。', 'Not on the target yet.')}</p>
              {passed[stage] && stage < w.stages.length - 1 && <button className="bk-btn is-primary" onClick={advance}>{tr('下一步', 'Next step')} <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={w.stages} current={stage} passed={passed} reached={reached} onPick={setStage} />
        </div>
      </div>
    </div>
  )
}

// One row of the image as pixels, darkest at 0 and lightest at 1.
function Strip({ label, values }) {
  const n = values.length
  return (
    <figure className="wv-strip">
      <svg viewBox={`0 0 ${n} 1`} preserveAspectRatio="none" aria-hidden="true">
        {values.map((value, x) => {
          const g = Math.round(255 * Math.min(1, Math.max(0, value)))
          return <rect key={x} x={x} y={0} width={1.02} height={1} fill={`rgb(${g},${g},${g})`} />
        })}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  )
}
