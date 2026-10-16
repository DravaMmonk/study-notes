import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import { PHONE, useMedia } from '../../../../../games/kit/shell/useMedia.js'
import './depthgen.css'
import { tr } from '../../../../../games/kit/shell/i18n.js'

// 8-3 骗过鉴定员: the player sets how a turn splits between the judge and the generator and
// plays turns. A greedy generator drives both pens onto the judge's favourite spot (mode
// collapse) and then hops between the humps; a patient schedule settles one pen on each hump.
//
// One chart, one x axis (the data value, −4…4): the histograms on top, the judge's D(x) under
// them, and the pens' history under that, newest turn at the top, so a pen's trace starts where it
// stands in the histogram.

const BINS = 32
const TRACE = 60
const REDUCED = '(prefers-reduced-motion: reduce)'
const lerp = (from, to, e) => to.map((b, i) => (from[i] ?? b) + (b - (from[i] ?? b)) * e)
const pct = (x) => `${Math.round(x * 100)}%`

// Animate numbers towards their target (ease-out); reduced motion shows the target at once.
function useEased(target, ms) {
  const reduced = useMedia(REDUCED)
  const [shown, setShown] = useState(target)
  const last = useRef(target)
  useEffect(() => {
    if (reduced) {
      last.current = target
      return undefined
    }
    const from = last.current
    const start = performance.now()
    let frame = 0
    const tick = (now) => {
      const k = Math.min(1, (now - start) / ms)
      const value = lerp(from, target, 1 - (1 - k) ** 3)
      last.current = value
      setShown(value)
      if (k < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reduced, ms])
  return reduced ? target : shown
}

// The rendered width of an element, so the chart's viewBox is drawn 1:1 and its text stays legible.
function useWidth(fallback) {
  const [node, setNode] = useState(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    if (!node) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))))
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  return [setNode, width]
}

function Goal({ pass, children, value }) {
  return (
    <li className={`bk-goal ${pass ? 'is-pass' : ''}`}>
      {pass ? <Check size={16} /> : <X size={16} />}
      <span>{children}</span>
      <b>{value}</b>
    </li>
  )
}

function Choice({ label, options, value, onChange, format, disabled }) {
  return (
    <div className="gan-choice">
      <span className="bk-label">{label}</span>
      <div className="bk-seg gan-seg" role="group" aria-label={label}>
        {options.map((option) => (
          <button key={option} aria-pressed={value === option} disabled={disabled} onClick={() => onChange(option)}>{format(option)}</button>
        ))}
      </div>
    </div>
  )
}

export default function GanDuel({ level, onSolve }) {
  const m = level.model
  const phone = useMedia(PHONE)
  const [state, setState] = useState(m.start)
  const [schedule, setSchedule] = useState(m.DEFAULT)
  const [running, setRunning] = useState(0)
  const solved = useRef(false)
  const [frame, width] = useWidth(600)

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

  // The drawing eases between turns; the readouts always show the true state.
  const target = useMemo(() => [...state.pens, ...state.w], [state])
  const eased = useEased(target, 200)
  const pens = eased.slice(0, 2)
  const w = eased.slice(2)

  const measure = m.measure(state)
  const real = useMemo(() => m.histogram(m.REAL, BINS), [m])
  const fake = m.histogram(m.fakes(pens), BINS)
  const merged = Math.abs(state.pens[0] - state.pens[1]) < 0.01
  const busy = running > 0

  // Geometry, in screen pixels.
  const X0 = 30
  const X1 = width - 14
  const px = (x) => X0 + ((Math.max(-4, Math.min(4, x)) + 4) / 8) * (X1 - X0)
  const binW = (X1 - X0) / BINS
  const HT = 30 // histogram top
  const HH = phone ? 118 : 190
  const HB = HT + HH // histogram base
  const DT = HB + 36 // D(x) band
  const DH = phone ? 58 : 90
  const TT = DT + DH + 32 // pen trace
  const TH = phone ? 100 : 180
  const H = TT + TH + 8
  const scale = (HH - 6) / 0.3 // a whole collapsed hump still fits
  const bar = (h) => Math.min(h * scale, HH - 2)
  const dY = (p) => DT + DH - p * DH
  const curve = Array.from({ length: 161 }, (_, i) => -4 + i * 0.05).map((x) => `${px(x).toFixed(1)},${dY(m.D(w, x)).toFixed(1)}`)
  const history = state.history.slice(-TRACE).reverse()
  const traceY = (i) => TT + (i / (TRACE - 1)) * TH
  const ticks = phone ? [-4, -2, 0, 2, 4] : [-4, -3, -2, -1, 0, 1, 2, 3, 4]

  const set = (key) => (value) => setSchedule((s) => ({ ...s, [key]: value }))
  const reset = () => {
    setRunning(0)
    setState(m.start())
  }

  const stage = (
    <section className="bk-stage gan-stage">
      <div className="gan-head">
        <span className="gan-key"><i className="is-real" />{tr('真实数据', 'Real data')}</span>
        <span className="gan-key"><i className="is-fake" />{tr('生成器画的', 'Generated')}</span>
        <span className="gan-key"><i className="is-pen0" />{tr('笔 1', 'Pen 1')}</span>
        <span className="gan-key"><i className="is-pen1" />{tr('笔 2', 'Pen 2')}</span>
        <span className="bk-chip gan-turn">{tr(`第 ${state.turn} 回合`, `Round ${state.turn}`)}</span>
      </div>
      <div className="gan-frame" ref={frame}>
        <svg className="gan-chart" viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={tr('真实数据和生成样本的分布、鉴定员的判断 D(x)，以及两支笔随回合的位置', "The distributions of real and generated samples, the judge's judgement D(x), and the two pens' positions round by round")}>
          {/* histograms */}
          {real.map((h, i) => <rect key={`r${i}`} className="gan-real" x={X0 + i * binW + 1} y={HB - bar(h)} width={Math.max(1, binW - 2)} height={bar(h)} />)}
          {fake.map((h, i) => (h > 0 ? <rect key={`f${i}`} className="gan-fake" x={X0 + i * binW + 2.5} y={HB - bar(h)} width={Math.max(1, binW - 5)} height={bar(h)} /> : null))}
          <line className="gan-axis" x1={X0} x2={X1} y1={HB} y2={HB} />
          {ticks.map((x) => <text key={x} className="gan-tick" x={px(x)} y={HB + 24} textAnchor="middle">{x < 0 ? `−${-x}` : x}</text>)}

          {/* D(x) */}
          <rect className="gan-band" x={X0} y={DT} width={X1 - X0} height={DH} rx="4" />
          <line className="gan-half" x1={X0} x2={X1} y1={dY(0.5)} y2={dY(0.5)} />
          <text className="gan-tick" x={X0 - 6} y={DT + 4} textAnchor="end">1</text>
          <text className="gan-tick" x={X0 - 6} y={dY(0.5) + 4} textAnchor="end">.5</text>
          <text className="gan-tick" x={X0 - 6} y={DT + DH + 2} textAnchor="end">0</text>
          <polyline className="gan-dcurve" points={curve.join(' ')} />

          {/* pen history: newest turn at the top */}
          {[-2, 2].map((x) => <line key={x} className="gan-guide" x1={px(x)} x2={px(x)} y1={TT} y2={TT + TH} />)}
          {[0, 1].map((k) => <polyline key={k} className={`gan-trace is-${k}`} points={history.map((p, i) => `${px(p[k]).toFixed(1)},${traceY(i).toFixed(1)}`).join(' ')} />)}

          {/* the pens: one line through all three panels */}
          {pens.map((p, k) => (
            <g key={k} className={`gan-pen is-${k}`}>
              <line className="gan-pen-line" x1={px(p)} x2={px(p)} y1={HT} y2={TT} />
              <path className="gan-pen-mark" d={`M${px(p)} ${HB + 1} l-5.5 9 h11 Z`} />
              <circle className="gan-pen-dot" cx={px(p)} cy={dY(m.D(w, p))} r="3.5" />
              <circle className="gan-pen-dot" cx={px(p)} cy={TT} r="3" />
            </g>
          ))}

          {/* titles last, on a paper halo, so the pen lines pass behind them */}
          <text className="gan-title is-on-band" x={X0 + 8} y={DT + 16}>{tr('鉴定员 D(x)：觉得 x 是真数据的把握', 'Judge D(x): how sure it is that x is real')}</text>
          <text className="gan-title" x={X0} y={TT - 10}>{tr(`两支笔走过的位置 ↓ 越往下越早（最近 ${TRACE} 回合）`, `Where the two pens have been ↓ lower is earlier (last ${TRACE} rounds)`)}</text>
        </svg>
      </div>
      <p className={`bk-verdict gan-verdict ${merged && state.turn > 0 ? 'is-fail' : ''}`} aria-live="polite">
        {merged && state.turn > 0 ? tr('两支笔重合了，再也分不开：模式坍塌。', 'The two pens have merged and can no longer separate: mode collapse.') : tr('笔 1 和笔 2 各画一半样本；竖线是它们此刻的位置。', 'Pen 1 and pen 2 each draw half the samples; the vertical lines are where they are now.')}
      </p>
    </section>
  )

  const goals = (
    <section className="bk-panel gan-goals">
      <span className="bk-label">{tr(`目标 · 同时满足，连续 ${m.WIN} 回合`, `Goals · all at once, ${m.WIN} rounds in a row`)}</span>
      <ul className="bk-goals">
        <Goal pass={measure.left >= 0.4} value={pct(measure.left)}>{tr('左堆', 'Left cluster')} <small>≥ 40%</small></Goal>
        <Goal pass={measure.right >= 0.4} value={pct(measure.right)}>{tr('右堆', 'Right cluster')} <small>≥ 40%</small></Goal>
        <Goal pass={Math.abs(measure.accuracy - 0.5) <= 0.05} value={`${(measure.accuracy * 100).toFixed(1)}%`}>{tr('准确率', 'Accuracy')} <small>50 ± 5%</small></Goal>
        <Goal pass={state.streak >= m.WIN} value={`${Math.min(state.streak, m.WIN)} / ${m.WIN}`}>{tr('连续达标', 'Streak')}</Goal>
      </ul>
    </section>
  )

  const actions = (
    <div className="gan-actions">
      <button className="bk-btn is-primary" disabled={busy} onClick={() => setState((s) => m.turn(s, schedule))}>{tr('走 1 回合', 'Play 1 round')}</button>
      <button className="bk-btn" disabled={busy} onClick={() => setRunning(10)}>{busy ? tr(`还剩 ${running} 回合`, `${running} ${running === 1 ? 'round' : 'rounds'} left`) : tr('走 10 回合', 'Play 10 rounds')}</button>
      <button className="bk-btn gan-reset" onClick={reset} aria-label={tr('重来', 'Start over')}><RotateCcw size={14} /><span>{tr('重来', 'Start over')}</span></button>
    </div>
  )

  const settings = (
    <section className="bk-panel gan-settings">
      <Choice label={tr('鉴定员每回合练', 'Judge trains per round')} options={m.OPTIONS.dSteps} value={schedule.dSteps} onChange={set('dSteps')} format={(v) => tr(`${v} 步`, `${v} ${v === 1 ? 'step' : 'steps'}`)} disabled={busy} />
      <Choice label={tr('生成器每回合练', 'Generator trains per round')} options={m.OPTIONS.gSteps} value={schedule.gSteps} onChange={set('gSteps')} format={(v) => tr(`${v} 步`, `${v} ${v === 1 ? 'step' : 'steps'}`)} disabled={busy} />
      <Choice label={tr('生成器步长', 'Generator step size')} options={m.OPTIONS.gRate} value={schedule.gRate} onChange={set('gRate')} format={(v) => String(v)} disabled={busy} />
      {!phone && actions}
    </section>
  )

  if (phone) {
    return (
      <div className="bk gan">
        {stage}
        {goals}
        {actions}
        {settings}
      </div>
    )
  }

  return (
    <div className="bk gan">
      <div className="bk-split gan-split">
        {stage}
        <div className="bk-stack">
          {goals}
          {settings}
        </div>
      </div>
    </div>
  )
}
