import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import ImageView from '../ImageView.jsx'
import { useMedia } from '../../../../shell/useMedia.js'
import { tr } from '../../../../shell/i18n.js'
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
    ? ['is-fail', tr('坍缩：所有视图都挤向同一方向，彼此无法区分。', 'Collapsed: every view is squeezed into the same direction, so none can be told apart.')]
    : report.pass
      ? ['is-pass', tr('通过：每个视图都能认出自己的搭档。', 'Passed: every view recognises its partner.')]
      : ['', state.t ? tr('继续训练，观察各点的移动方向。', 'Keep training and watch where the dots move.') : tr('尚未训练：编码器的权重是随机的。', 'Not trained yet: the encoder weights are random.')]

  return (
    <div className="bk contrast">
      <div className="bk-split contrast-split">
        <section className="bk-stage contrast-stage">
          <div className="contrast-stage-head">
            <span className="bk-label">{tr('嵌入平面 · 测验视图', 'Embedding plane · quiz views')}</span>
            <span className="bk-chip contrast-step">{tr(`第 ${state.t} 步`, `Step ${state.t}`)}</span>
          </div>
          <svg className="contrast-plane" viewBox="-1.32 -1.32 2.64 2.64" role="img" aria-label={tr('嵌入平面：每个视图是单位圆上的一点', 'Embedding plane: each view is a point on the unit circle')}>
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
          <p className="bk-caption contrast-legend"><span>{tr('● 第 1 个视图', '● First view')}</span><span>{tr('○ 第 2 个视图', '○ Second view')}</span><span>{tr('— 连线连接同一张图的两个视图', '— A line joins the two views of the same image')}</span></p>
        </section>

        <div className="bk-stack">
          <section className="bk-panel">
            <span className="bk-label">{tr('目标', 'Goals')}</span>
            <ul className="bk-goals">
              <Goal pass={report.worst >= m.GOAL} value={pct(report.worst)}>
                {tr('认对搭档的最低概率', 'Lowest chance of picking the partner')} <small>≥ {pct(m.GOAL)}</small>
              </Goal>
              <Goal pass={!report.collapsed} value={report.negative.toFixed(2)}>
                {tr('负对平均 sim，不坍缩', 'Mean sim of negative pairs, no collapse')} <small>≤ {m.COLLAPSE}</small>
              </Goal>
            </ul>
          </section>

          <section className="bk-panel contrast-controls">
            <p className="contrast-formula">
              ℓ = <span>−sim(a, a⁺)/τ</span> <span className={push ? '' : 'is-off'}>+ log Σ<sub>k≠a</sub> exp(sim(a, k)/τ)</span>
            </p>
            <div className="bk-row contrast-checks">
              <label className="bk-check">
                <input type="checkbox" checked disabled /> {tr('拉近搭档（分子）', 'Pull partners close (numerator)')}
              </label>
              <label className="bk-check">
                <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} /> {tr('推开其他视图（分母）', 'Push other views away (denominator)')}
              </label>
            </div>
            <div className="bk-row">
              <button className="bk-btn" onClick={() => train(1)}>{tr('训练 1 步', 'Train 1 step')}</button>
              <button className="bk-btn is-primary" onClick={() => train(20)}>{tr('训练 20 步', 'Train 20 steps')}</button>
              <button className="bk-btn contrast-reset" onClick={reset}><RotateCcw size={14} /> {tr('重置编码器', 'Reset encoder')}</button>
            </div>
            <LossLine losses={state.losses} positive={report.positive} />
          </section>

          <figure className="bk-panel contrast-matrix">
            <figcaption className="bk-label">{tr(`每行在其余 ${us.length - 1} 个视图里选搭档`, `Each row picks a partner from the other ${us.length - 1} views`)} · τ = {m.TAU}</figcaption>
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
                        aria-label={k === a ? undefined : tr(`${tag(a)} 选 ${tag(k)}：${pct(p)}`, `${tag(a)} picks ${tag(k)}: ${pct(p)}`)}
                      >
                        {k === a ? '' : p >= 0.095 ? Math.round(p * 100) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="bk-caption">{tr('数字为选中各视图的概率（%）；粗框标出真正的搭档。', 'Numbers are the probability of each pick (%); the bold frame marks the true partner.')}</p>
          </figure>
        </div>
      </div>
    </div>
  )
}

function LossLine({ losses, positive }) {
  const tail = <> · {tr('正对平均 sim', 'mean sim of positive pairs')} <b>{positive.toFixed(2)}</b></>
  if (losses.length < 2) return <p className="bk-note contrast-curve-empty">{tr('训练后在此显示损失曲线', 'The loss curve appears here after training')}{tail}</p>
  const max = Math.max(...losses)
  const min = Math.min(...losses)
  const span = Math.max(1e-9, max - min)
  const points = losses.map((v, i) => `${(i / (losses.length - 1)) * 200},${56 - ((v - min) / span) * 52}`)
  return (
    <figure className="contrast-curve">
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" role="img" aria-label={tr('损失曲线', 'Loss curve')}>
        <polyline points={points.join(' ')} />
      </svg>
      <figcaption className="bk-caption">{tr('损失', 'Loss')} <b>{losses.at(-1).toFixed(2)}</b> · {tr(`最近 ${losses.length} 步`, `last ${losses.length} steps`)}{tail}</figcaption>
    </figure>
  )
}
