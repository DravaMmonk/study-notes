import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import ImageView from '../ImageView.jsx'
import { useMedia } from '../useMedia.js'
import './AttendContrast.css'

const QUIZ_SEED = 901
const pct = (x) => `${Math.round(x * 100)}%`
const REDUCED = '(prefers-reduced-motion: reduce)'

// Ease every angle along the shorter way round the circle, so dots glide on the circle, not through it.
const mixAngles = (from, to, e) =>
  to.map((b, i) => {
    const a = from[i] ?? b
    return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e
  })

// Animate a value towards its target over `ms` (ease-out); reduced motion shows the target at once.
function useEased(target, ms, mix) {
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
      const value = mix(from, target, 1 - (1 - k) ** 3)
      last.current = value
      setShown(value)
      if (k < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reduced, ms, mix])
  return reduced ? target : shown
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

// 5-3 拉近与推开: a linear encoder puts every view on the unit circle. Train it with the pull term
// alone or with InfoNCE's denominator as well, and watch the quiz views (never trained on) move.
export default function AttendContrast({ level, onSolve, theme }) {
  const m = level.model
  const [state, setState] = useState(() => ({ model: m.init(), t: 0, losses: [] }))
  const [push, setPush] = useState(false)
  const solved = useRef(false)

  const quiz = useMemo(() => m.batch(QUIZ_SEED), [m])
  const us = useMemo(() => quiz.map((v) => m.encode(state.model, v.f).u), [quiz, state.model, m])
  const angles = useMemo(() => us.map((u) => Math.atan2(u[1], u[0])), [us])
  const shown = useEased(angles, 360, mixAngles)
  const report = useMemo(() => m.evaluate(state.model), [state.model, m])
  const rows = useMemo(() => us.map((_, a) => m.choice(us, a)), [us, m])

  const train = (steps) => {
    const result = m.train(state.model, state.t, steps, push)
    setState({ model: result.model, t: state.t + steps, losses: [...state.losses, ...result.losses].slice(-120) })
    if (!solved.current && m.evaluate(result.model).pass) {
      solved.current = true
      onSolve()
    }
  }
  const reset = () => setState({ model: m.init(), t: 0, losses: [] })

  const tag = (i) => `${m.NAMES[quiz[i].image]}${(i % 2) + 1}`
  const at = (i, r = 1) => [Math.cos(shown[i]) * r, -Math.sin(shown[i]) * r]
  const status = report.collapsed
    ? ['is-fail', '坍缩：所有视图挤到了同一个方向，谁也认不出谁。']
    : report.pass
      ? ['is-pass', '通过：每个视图都认得出自己的搭档。']
      : ['', state.t ? '继续训练，看点往哪里走。' : '还没训练：编码器是随机的。']

  return (
    <div className="bk contrast">
      <div className="bk-split contrast-split">
        <section className="bk-stage contrast-stage">
          <div className="contrast-stage-head">
            <span className="bk-label">嵌入平面 · 测验视图</span>
            <span className="bk-chip contrast-step">第 {state.t} 步</span>
          </div>
          <svg className="contrast-plane" viewBox="-1.32 -1.32 2.64 2.64" role="img" aria-label="嵌入平面：每个视图是单位圆上的一点">
            <line className="plane-axis" x1="-1.25" y1="0" x2="1.25" y2="0" />
            <line className="plane-axis" x1="0" y1="-1.25" x2="0" y2="1.25" />
            <circle className="plane-circle" cx="0" cy="0" r="1" />
            {m.NAMES.map((_, i) => {
              const [a, b] = [at(2 * i), at(2 * i + 1)]
              return <line key={i} className="plane-pair" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
            })}
            {us.map((_, i) => {
              const [x, y] = at(i)
              const [lx, ly] = at(i, 1.14)
              return (
                <g key={i}>
                  <circle className={`plane-dot ${i % 2 ? 'is-second' : ''}`} cx={x} cy={y} r="0.036" />
                  <text className="plane-label" x={lx} y={ly + 0.036}>{m.NAMES[quiz[i].image]}</text>
                </g>
              )
            })}
          </svg>
          <p className={`bk-verdict contrast-verdict ${status[0]}`} aria-live="polite">{status[1]}</p>
          <p className="bk-caption contrast-legend"><span>● 第 1 个视图</span><span>○ 第 2 个视图</span><span>— 连线连着同一张图的两个视图</span></p>
        </section>

        <div className="bk-stack">
          <section className="bk-panel">
            <span className="bk-label">目标</span>
            <ul className="bk-goals">
              <Goal pass={report.worst >= m.GOAL} value={pct(report.worst)}>
                认对搭档的最低概率 <small>≥ {pct(m.GOAL)}</small>
              </Goal>
              <Goal pass={!report.collapsed} value={report.negative.toFixed(2)}>
                负对平均 sim，不坍缩 <small>≤ {m.COLLAPSE}</small>
              </Goal>
            </ul>
          </section>

          <section className="bk-panel contrast-controls">
            <p className="contrast-formula">
              ℓ = <span>−sim(a, a⁺)/τ</span> <span className={push ? '' : 'is-off'}>+ log Σ<sub>k≠a</sub> exp(sim(a, k)/τ)</span>
            </p>
            <div className="bk-row contrast-checks">
              <label className="bk-check">
                <input type="checkbox" checked disabled /> 拉近搭档（分子）
              </label>
              <label className="bk-check">
                <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} /> 推开其他视图（分母）
              </label>
            </div>
            <div className="bk-row">
              <button className="bk-btn" onClick={() => train(1)}>训练 1 步</button>
              <button className="bk-btn is-primary" onClick={() => train(20)}>训练 20 步</button>
              <button className="bk-btn contrast-reset" onClick={reset}><RotateCcw size={14} /> 重置编码器</button>
            </div>
            <LossLine losses={state.losses} positive={report.positive} />
          </section>

          <figure className="bk-panel contrast-matrix">
            <figcaption className="bk-label">每行在其余 {us.length - 1} 个视图里选搭档 · τ = {m.TAU}</figcaption>
            <table>
              <thead>
                <tr>
                  <th />
                  {us.map((_, k) => <th key={k} scope="col">{tag(k)}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, a) => (
                  <tr key={a}>
                    <th scope="row">
                      <ImageView img={quiz[a].img} size={20} range={{ lo: 0, hi: 1 }} theme={theme} />
                      {tag(a)}
                    </th>
                    {row.map((p, k) => (
                      <td
                        key={k}
                        className={k === a ? 'is-self' : k === (a ^ 1) ? 'is-partner' : ''}
                        style={k === a ? undefined : { background: `color-mix(in srgb, var(--accent) ${Math.round(p * 100)}%, var(--paper))` }}
                        aria-label={k === a ? undefined : `${tag(a)} 选 ${tag(k)}：${pct(p)}`}
                      >
                        {k === a ? '' : p >= 0.095 ? Math.round(p * 100) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="bk-caption">数字是选中的概率（%）；粗框是真正的搭档。</p>
          </figure>
        </div>
      </div>
    </div>
  )
}

function LossLine({ losses, positive }) {
  const tail = <> · 正对平均 sim <b>{positive.toFixed(2)}</b></>
  if (losses.length < 2) return <p className="bk-note contrast-curve-empty">训练后，损失曲线画在这里{tail}</p>
  const max = Math.max(...losses)
  const min = Math.min(...losses)
  const span = Math.max(1e-9, max - min)
  const points = losses.map((v, i) => `${(i / (losses.length - 1)) * 200},${56 - ((v - min) / span) * 52}`)
  return (
    <figure className="contrast-curve">
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" role="img" aria-label="损失曲线">
        <polyline points={points.join(' ')} />
      </svg>
      <figcaption className="bk-caption">损失 <b>{losses.at(-1).toFixed(2)}</b> · 最近 {losses.length} 步{tail}</figcaption>
    </figure>
  )
}
