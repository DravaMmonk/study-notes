import { useEffect, useRef, useState } from 'react'
import './depthgen.css'

// 8-3 骗过鉴定员: the player sets how a turn splits between the discriminator and the generator and
// plays turns. A greedy generator drives both pens onto the discriminator's favourite spot (mode
// collapse) and then hops between the humps; a patient schedule settles one pen on each hump.

const X0 = 30
const X1 = 570
const px = (x) => X0 + ((x + 4) / 8) * (X1 - X0)
const BINS = 32
const BIN_W = (X1 - X0) / BINS
const HIST_BASE = 140
const HIST_SCALE = 360 // height per unit of probability in one bin
const D_TOP = 186
const D_H = 54

function Segmented({ label, options, value, onChange, format, disabled }) {
  return (
    <div className="dg-control">
      <span className="dg-label">{label}</span>
      <div className="dg-segments" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button key={option} role="radio" aria-checked={value === option} disabled={disabled} onClick={() => onChange(option)}>{format(option)}</button>
        ))}
      </div>
    </div>
  )
}

export default function GanDuel({ level, onSolve }) {
  const m = level.model
  const [state, setState] = useState(m.start)
  const [schedule, setSchedule] = useState(m.DEFAULT)
  const [running, setRunning] = useState(0)
  const solved = useRef(false)

  useEffect(() => {
    if (state.streak >= m.WIN && !solved.current) {
      solved.current = true
      onSolve()
    }
  }, [state.streak, m.WIN, onSolve])

  useEffect(() => {
    if (!running) return undefined
    const timer = setTimeout(() => {
      setState((s) => m.turn(s, schedule))
      setRunning((n) => n - 1)
    }, 110)
    return () => clearTimeout(timer)
  }, [running, schedule, m])

  const measure = m.measure(state)
  const real = m.histogram(m.REAL, BINS)
  const fake = m.histogram(m.fakes(state.pens), BINS)
  const curve = Array.from({ length: 161 }, (_, i) => -4 + i * 0.05).map((x) => `${px(x).toFixed(1)},${(D_TOP + D_H - m.D(state.w, x) * D_H).toFixed(1)}`)
  const merged = Math.abs(state.pens[0] - state.pens[1]) < 0.01
  const history = state.history.slice(-60)
  const trackX = (i) => X0 + (i / 59) * (X1 - X0)
  const trackY = (x) => 60 - (Math.max(-4, Math.min(4, x)) / 4) * 50

  const set = (key) => (value) => setSchedule((s) => ({ ...s, [key]: value }))
  const reset = () => {
    setRunning(0)
    setState(m.start())
  }

  return (
    <div className="dg dg-gan">
      <div className="dg-plots">
        <svg className="dg-plot" viewBox="0 0 600 250" role="img" aria-label="真实数据、生成样本和鉴定员的判断">
          {real.map((h, i) => <rect key={`r${i}`} className="dg-real" x={X0 + i * BIN_W + 1} y={HIST_BASE - h * HIST_SCALE} width={BIN_W - 2} height={h * HIST_SCALE} />)}
          {fake.map((h, i) => (h > 0 ? <rect key={`f${i}`} className="dg-fake" x={X0 + i * BIN_W + 3} y={HIST_BASE - Math.min(h * HIST_SCALE, HIST_BASE - 6)} width={BIN_W - 6} height={Math.min(h * HIST_SCALE, HIST_BASE - 6)} /> : null))}
          <line className="dg-axis" x1={X0} x2={X1} y1={HIST_BASE} y2={HIST_BASE} />
          {state.pens.map((p, i) => (
            <g key={i} transform={`translate(${px(Math.max(-4, Math.min(4, p)))}, ${HIST_BASE + 2})`}>
              <path className="dg-pen" d="M0 0 L-5 9 L5 9 Z" />
              <text className="dg-pen-label" x={i ? 7 : -7} y={9} textAnchor={i ? 'start' : 'end'}>{i + 1}</text>
            </g>
          ))}
          {[-4, -2, 0, 2, 4].map((x) => <text key={x} className="dg-tick" x={px(x)} y={HIST_BASE + 24} textAnchor="middle">{x}</text>)}
          <rect className="dg-dband" x={X0} y={D_TOP} width={X1 - X0} height={D_H} />
          <line className="dg-half" x1={X0} x2={X1} y1={D_TOP + D_H / 2} y2={D_TOP + D_H / 2} />
          <polyline className="dg-dcurve" points={curve.join(' ')} />
          <text className="dg-tick" x={X0 - 4} y={D_TOP + 4} textAnchor="end">1</text>
          <text className="dg-tick" x={X0 - 4} y={D_TOP + D_H / 2 + 3} textAnchor="end">½</text>
          <text className="dg-tick" x={X0 - 4} y={D_TOP + D_H + 3} textAnchor="end">0</text>
          <text className="dg-legend" x={X0} y={14}><tspan className="dg-real-ink">■ 真实数据</tspan>   <tspan className="dg-fake-ink">□ 生成器画的</tspan>   ▲ 两支笔</text>
          <text className="dg-legend" x={X0} y={D_TOP - 6}>鉴定员 D(x)：觉得 x 是真数据的把握</text>
        </svg>

        <svg className="dg-plot dg-track" viewBox="0 0 600 120" role="img" aria-label="两支笔的位置随回合变化">
          <line className="dg-guide" x1={X0} x2={X1} y1={trackY(2)} y2={trackY(2)} />
          <line className="dg-guide" x1={X0} x2={X1} y1={trackY(-2)} y2={trackY(-2)} />
          <text className="dg-tick" x={X0 - 4} y={trackY(2) + 3} textAnchor="end">2</text>
          <text className="dg-tick" x={X0 - 4} y={trackY(-2) + 3} textAnchor="end">−2</text>
          {[0, 1].map((k) => <polyline key={k} className={`dg-trace is-${k}`} points={history.map((pens, i) => `${trackX(i).toFixed(1)},${trackY(pens[k]).toFixed(1)}`).join(' ')} />)}
          <text className="dg-legend" x={X1} y={116} textAnchor="end">两支笔的位置 · 最近 60 回合</text>
        </svg>
      </div>

      <section className="dg-panel">
        <Segmented label="鉴定员每回合练" options={m.OPTIONS.dSteps} value={schedule.dSteps} onChange={set('dSteps')} format={(v) => `${v} 步`} disabled={running > 0} />
        <Segmented label="生成器每回合练" options={m.OPTIONS.gSteps} value={schedule.gSteps} onChange={set('gSteps')} format={(v) => `${v} 步`} disabled={running > 0} />
        <Segmented label="生成器步长" options={m.OPTIONS.gRate} value={schedule.gRate} onChange={set('gRate')} format={(v) => String(v)} disabled={running > 0} />

        <div className="dg-actions">
          <button className="dg-button is-primary" disabled={running > 0} onClick={() => setState((s) => m.turn(s, schedule))}>走 1 回合</button>
          <button className="dg-button" disabled={running > 0} onClick={() => setRunning(10)}>走 10 回合</button>
        </div>

        <dl className="dg-readout">
          <dt>回合</dt><dd>{state.turn}</dd>
          <dt>鉴定员准确率</dt><dd className={Math.abs(measure.accuracy - 0.5) <= 0.05 ? 'is-good' : ''}>{(measure.accuracy * 100).toFixed(1)}%</dd>
          <dt>落在左堆</dt><dd className={measure.left >= 0.4 ? 'is-good' : ''}>{Math.round(measure.left * 100)}%</dd>
          <dt>落在右堆</dt><dd className={measure.right >= 0.4 ? 'is-good' : ''}>{Math.round(measure.right * 100)}%</dd>
          <dt>连续达标</dt><dd>{Math.min(state.streak, m.WIN)} / {m.WIN} 回合</dd>
        </dl>
        <p className="dg-message is-bad" aria-live="polite">{merged && state.turn > 0 ? '两支笔重合了，再也分不开。' : ''}</p>

        <div className="dg-footer">
          <span className="dg-num">目标：两堆各 ≥ 40%，准确率 50% ± 5%</span>
          <button className="dg-link" onClick={reset}>重来</button>
        </div>
      </section>
    </div>
  )
}
