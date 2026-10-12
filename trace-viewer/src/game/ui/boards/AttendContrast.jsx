import { useMemo, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import ImageView from '../ImageView.jsx'
import './AttendContrast.css'

const QUIZ_SEED = 901
const pct = (x) => `${Math.round(x * 100)}%`

// 5-3 拉近与推开: a linear encoder puts every view on the unit circle. Train it with the pull term
// alone or with InfoNCE's denominator as well, and watch the quiz views (never trained on) move.
export default function AttendContrast({ level, onSolve, theme }) {
  const m = level.model
  const [state, setState] = useState(() => ({ model: m.init(), t: 0, losses: [] }))
  const [push, setPush] = useState(false)
  const solved = useRef(false)

  const quiz = useMemo(() => m.batch(QUIZ_SEED), [m])
  const us = useMemo(() => quiz.map((v) => m.encode(state.model, v.f).u), [quiz, state.model, m])
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

  return (
    <div className="contrast">
      <section className="contrast-plane">
        <svg viewBox="-1.32 -1.32 2.64 2.64" role="img" aria-label="嵌入平面：每个视图是单位圆上的一点">
          <line className="plane-axis" x1="-1.25" y1="0" x2="1.25" y2="0" />
          <line className="plane-axis" x1="0" y1="-1.25" x2="0" y2="1.25" />
          <circle className="plane-circle" cx="0" cy="0" r="1" />
          {m.NAMES.map((_, i) => {
            const [a, b] = [us[2 * i], us[2 * i + 1]]
            return <line key={i} className="plane-pair" x1={a[0]} y1={-a[1]} x2={b[0]} y2={-b[1]} />
          })}
          {us.map((u, i) => (
            <g key={i}>
              <circle className={`plane-dot ${i % 2 ? 'is-second' : ''}`} cx={u[0]} cy={-u[1]} r="0.035" />
              <text className="plane-label" x={u[0] * 1.13} y={-u[1] * 1.13 + 0.035}>{m.NAMES[quiz[i].image]}</text>
            </g>
          ))}
        </svg>
        <p className={`contrast-status ${report.collapsed ? 'is-collapsed' : report.pass ? 'is-pass' : ''}`} aria-live="polite">
          {report.collapsed ? '坍缩：所有视图挤到了同一个方向，谁也认不出谁。' : report.pass ? '通过：每个视图都认得出自己的搭档。' : `第 ${state.t} 步`}
        </p>
      </section>

      <section className="contrast-side">
        <div className="contrast-loss">
          <p className="contrast-formula">
            ℓ = <span>−sim(a, a⁺)/τ</span> <span className={push ? '' : 'is-off'}>+ log Σ<sub>k≠a</sub> exp(sim(a, k)/τ)</span>
          </p>
          <label className="contrast-toggle">
            <input type="checkbox" checked disabled /> 拉近搭档（分子）
          </label>
          <label className="contrast-toggle">
            <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} /> 推开其他视图（分母）
          </label>
          <div className="contrast-buttons">
            <button onClick={() => train(1)}>训练 1 步</button>
            <button onClick={() => train(20)}>训练 20 步</button>
            <button className="is-quiet" onClick={reset}><RotateCcw size={13} /> 重置编码器</button>
          </div>
          <LossLine losses={state.losses} />
        </div>

        <dl className="contrast-readout">
          <div><dt>正对平均 sim</dt><dd>{report.positive.toFixed(2)}</dd></div>
          <div className={report.collapsed ? 'is-bad' : ''}><dt>负对平均 sim</dt><dd>{report.negative.toFixed(2)}</dd></div>
          <div className={report.worst >= m.GOAL ? 'is-good' : 'is-bad'}><dt>最低认对概率</dt><dd>{pct(report.worst)} <small>目标 ≥ {pct(m.GOAL)}</small></dd></div>
        </dl>

        <figure className="contrast-matrix">
          <figcaption>测验视图：每行在其余 {us.length - 1} 个视图里选搭档（τ = {m.TAU}）</figcaption>
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
                    <ImageView img={quiz[a].img} size={22} range={{ lo: 0, hi: 1 }} theme={theme} />
                    {tag(a)}
                  </th>
                  {row.map((p, k) => (
                    <td
                      key={k}
                      className={k === a ? 'is-self' : k === (a ^ 1) ? 'is-partner' : ''}
                      style={k === a ? undefined : { background: `color-mix(in srgb, var(--accent) ${Math.round(p * 100)}%, var(--paper))` }}
                      title={k === a ? '' : `${tag(a)} 选 ${tag(k)}：${pct(p)}`}
                    >
                      {k === a ? '' : p >= 0.095 ? Math.round(p * 100) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </section>
    </div>
  )
}

function LossLine({ losses }) {
  if (losses.length < 2) return <p className="contrast-note">损失曲线会画在这里。</p>
  const max = Math.max(...losses)
  const min = Math.min(...losses)
  const span = Math.max(1e-9, max - min)
  const points = losses.map((v, i) => `${(i / (losses.length - 1)) * 200},${56 - ((v - min) / span) * 52}`)
  return (
    <figure className="contrast-curve">
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" role="img" aria-label="损失曲线">
        <polyline points={points.join(' ')} />
      </svg>
      <figcaption>损失 {losses.at(-1).toFixed(2)}</figcaption>
    </figure>
  )
}
