import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Footprints, RotateCcw } from 'lucide-react'
import { PHONE, useMedia } from '../useMedia.js'
import { css, mix, tokenRGB } from '../views/views.js'
import { Plot, Stages } from './WaveKit.jsx'
import './waves.css'
import './train.css'

const W_RANGE = [-1, 2] // the one-knob stages draw w across this span
const MAP = { w: [-1, 2.5], b: [-0.5, 1.5] } // the two-knob stage's map

// 4-1 下山: one knob, then two. The left plot is the data and the model's line; the right shows the
// loss as a function of the knob(s): a bowl, then a valley seen from above with the gradient arrow.
export default function Descent({ level, onSolve, theme }) {
  const m = level.descent
  const phone = useMedia(PHONE)
  const [stage, setStage] = useState(0)
  const s = m.stages[stage]
  const [state, setState] = useState(s.start)
  const [rate, setRate] = useState(0.5)
  const [steps, setSteps] = useState(0)
  const [trail, setTrail] = useState([s.start])
  const [passed, setPassed] = useState(() => m.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const loss = m.loss(s.rule, state.w, state.b)
  const { gw, gb } = m.grad(s.rule, state.w, state.b)
  const outOfSteps = s.budget && steps >= s.budget && loss > m.goal

  const arrive = (next, used) => {
    setState(next)
    setTrail((t) => [...t, next].slice(-400))
    const ok = m.loss(s.rule, next.w, next.b) <= m.goal && (!s.budget || used <= s.budget)
    if (ok && !passed[stage]) {
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const walk = (count) => {
    let next = state
    let used = steps
    for (let i = 0; i < count && used < s.budget; i++) {
      next = m.step(s, next, rate)
      used += 1
      if (!Number.isFinite(next.w) || Math.abs(next.w) > 1e6) break
      if (m.loss(s.rule, next.w, next.b) <= m.goal) break
    }
    setSteps(used)
    arrive(next, used)
  }
  const reset = (index = stage) => {
    const start = m.stages[index].start
    setState(start)
    setSteps(0)
    setTrail([start])
  }
  const go = (index) => {
    setStage(index)
    reset(index)
  }

  const width = phone ? 340 : 600
  const fmt = (v) => (Math.abs(v) > 999 ? v.toExponential(1) : v.toFixed(3))
  const status = passed[stage] && loss <= m.goal ? '到底了。' : outOfSteps ? `${s.budget} 步用完了，换个学习率再来。` : loss > 50 ? '冲出去了：每一步都越过谷底，越冲越远。' : s.mode === 'drag' ? '拖动 w。' : '按「走一步」。'

  return (
    <div className="bk wv ds">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          <div className="ds-plots">
            <div>
              <span className="bk-label">样本和你的模型</span>
              <Plot
                width={width}
                height={phone ? 170 : 180}
                lo={-0.2}
                hi={1.2}
                ticks={[0, 0.5, 1]}
                span={1}
                label="样本点和模型直线"
                lines={[{ curve: (u) => state.w * u + state.b, kind: 'yours', label: '模型' }]}
                dots={m.xs.map((x) => ({ u: x, v: m.rules[s.rule](x), kind: 'ring', label: '样本' }))}
              />
              <p className="bk-caption">横轴：输入亮度 · 纵轴：输出 · 空心点：要学的样本</p>
            </div>
            <div>
              <span className="bk-label">{s.mode === 'step2' ? '误差地形（越暗越低）' : '误差随 w 的变化'}</span>
              {s.mode === 'step2' ? (
                <LossMap m={m} rule={s.rule} state={state} trail={trail} grad={{ gw, gb }} width={width} theme={theme} showMin={passed[stage]} />
              ) : (
                <Plot
                  width={width}
                  height={phone ? 170 : 180}
                  lo={0}
                  hi={1}
                  ticks={[0, 0.5, 1]}
                  span={1}
                  label="误差曲线"
                  lines={s.mode === 'drag' && !passed[stage] ? [] : [{ curve: (u) => m.loss(s.rule, W_RANGE[0] + u * (W_RANGE[1] - W_RANGE[0])), kind: 'target', label: '误差' }]}
                  dots={trail.filter((p) => Number.isFinite(p.w)).map((p) => ({ u: (p.w - W_RANGE[0]) / (W_RANGE[1] - W_RANGE[0]), v: m.loss(s.rule, p.w), kind: 'sample', label: '走过的位置' }))}
                >
                  {({ x, y }) => {
                    const u = (state.w - W_RANGE[0]) / (W_RANGE[1] - W_RANGE[0])
                    if (u < 0 || u > 1 || s.mode === 'drag') return null
                    const du = 0.12
                    const slope = gw * (W_RANGE[1] - W_RANGE[0])
                    return (
                      <g className="ds-tangent">
                        <line x1={x(u - du)} y1={y(loss - slope * du)} x2={x(u + du)} y2={y(loss + slope * du)} />
                        <circle cx={x(u)} cy={y(loss)} r={5} />
                      </g>
                    )
                  }}
                </Plot>
              )}
              <p className="bk-caption">{s.mode === 'step2' ? '横轴 w · 纵轴 b · 金色箭头 = 梯度（上坡）· 线 = 走过的路' : '横轴：w 从 −1 到 2 · 实心点：走过的位置'}</p>
            </div>
          </div>
          <div className="bk-stats">
            <div className={`bk-stat ${loss <= m.goal ? 'is-pass' : ''}`}><b>{fmt(loss)}</b><span>误差（要 ≤ {m.goal}）</span></div>
            <div className="bk-stat"><b>{fmt(state.w)}{s.mode === 'step2' ? ` · ${fmt(state.b)}` : ''}</b><span>{s.mode === 'step2' ? 'w · b' : 'w'}</span></div>
            {s.mode !== 'drag' && <div className="bk-stat"><b>{s.mode === 'step2' ? `${fmt(gw)} · ${fmt(gb)}` : fmt(gw)}</b><span>脚下的坡度{s.mode === 'step2' ? '（对 w · 对 b）' : ''}</span></div>}
            {s.budget && <div className={`bk-stat ${outOfSteps ? 'is-fail' : ''}`}><b>{steps} / {s.budget}</b><span>已走的步数</span></div>}
          </div>
        </section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">第 {stage + 1} 步 · {s.title}</span>
              <p className="wv-stage-note">{s.note}</p>
            </div>
            {s.mode === 'drag' ? (
              <label className="bk-field">
                <span>w</span>
                <input className="bk-range" type="range" min={W_RANGE[0]} max={W_RANGE[1]} step={0.05} value={state.w} style={{ '--fill': `${((state.w - W_RANGE[0]) / (W_RANGE[1] - W_RANGE[0])) * 100}%` }} onChange={(event) => arrive({ ...state, w: Number(event.target.value) }, 0)} />
                <output>{state.w.toFixed(2)}</output>
              </label>
            ) : (
              <>
                <label className="bk-field">
                  <span>学习率</span>
                  <input className="bk-range" type="range" min={m.rate.min} max={m.rate.max} step={m.rate.step} value={rate} style={{ '--fill': `${((rate - m.rate.min) / (m.rate.max - m.rate.min)) * 100}%` }} onChange={(event) => setRate(Number(event.target.value))} />
                  <output>{rate.toFixed(1)}</output>
                </label>
                <p className="bk-caption">每一步：w ← w − 学习率 × 坡度{s.mode === 'step2' ? '，b 也一样' : ''}</p>
                <div className="bk-row">
                  <button className="bk-btn is-primary" disabled={steps >= s.budget || (passed[stage] && loss <= m.goal)} onClick={() => walk(1)}><Footprints size={15} />走一步</button>
                  {s.mode === 'step2' && <button className="bk-btn" disabled={steps >= s.budget || (passed[stage] && loss <= m.goal)} onClick={() => walk(10)}>走 10 步</button>}
                  <button className="bk-btn" onClick={() => reset()}><RotateCcw size={14} />回到起点</button>
                </div>
              </>
            )}
            <div className="wv-next">
              <p className={`bk-verdict ${passed[stage] && loss <= m.goal ? 'is-pass' : outOfSteps || loss > 50 ? 'is-fail' : ''}`} aria-live="polite">{passed[stage] && loss <= m.goal && <Check size={15} />}{status}</p>
              {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={() => { go(stage + 1); setReached(Math.max(reached, stage + 1)) }}>下一步 <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={m.stages} current={stage} passed={passed} reached={reached} onPick={go} />
        </div>
      </div>
    </div>
  )
}

// The two-knob loss seen from above: shaded by height with contour lines, the path walked, and the
// gradient at the current point as an arrow (scaled down so it stays on the map).
function LossMap({ m, rule, state, trail, grad, width, theme, showMin }) {
  const canvas = useRef(null)
  const height = Math.round(width * 0.62)
  const toX = (w) => ((w - MAP.w[0]) / (MAP.w[1] - MAP.w[0])) * width
  const toY = (b) => height - ((b - MAP.b[0]) / (MAP.b[1] - MAP.b[0])) * height

  useEffect(() => {
    const node = canvas.current
    if (!node) return
    const dpr = window.devicePixelRatio || 1
    node.width = Math.round(width * dpr)
    node.height = Math.round(height * dpr)
    const ctx = node.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const low = tokenRGB('--ink', [40, 38, 33])
    const high = tokenRGB('--canvas', [243, 241, 235])
    const cell = 4
    for (let py = 0; py < height; py += cell) {
      for (let px = 0; px < width; px += cell) {
        const w = MAP.w[0] + ((px + cell / 2) / width) * (MAP.w[1] - MAP.w[0])
        const b = MAP.b[1] - ((py + cell / 2) / height) * (MAP.b[1] - MAP.b[0])
        const t = Math.min(1, Math.sqrt(m.loss(rule, w, b) / 0.6))
        ctx.fillStyle = css(mix(low, high, 0.25 + 0.75 * t))
        ctx.fillRect(px, py, cell, cell)
      }
    }
  }, [m, rule, width, height, theme])

  const path = trail.filter((p) => Number.isFinite(p.w) && Number.isFinite(p.b)).map((p, i) => `${i ? 'L' : 'M'}${toX(p.w).toFixed(1)},${toY(p.b).toFixed(1)}`).join('')
  const size = Math.hypot(grad.gw, grad.gb)
  const scale = size > 1e-9 ? Math.min(60, 40 * size) / size : 0
  const [cx, cy] = [toX(state.w), toY(state.b)]
  // Screen y grows downward while b grows upward.
  const tip = [cx + grad.gw * scale, cy - grad.gb * scale]
  const levels = [0.003, 0.01, 0.03, 0.08, 0.2, 0.45]
  return (
    <div className="ds-map" style={{ width: '100%', aspectRatio: `${width} / ${height}` }}>
      <canvas ref={canvas} style={{ width: '100%', height: '100%' }} aria-hidden="true" />
      <svg viewBox={`0 0 ${width} ${height}`} className="ds-map-overlay" role="img" aria-label="两个旋钮的误差地形">
        {levels.map((level) => <path key={level} className="ds-contour" d={contour(m, rule, level, width, height)} />)}
        <path className="ds-path" d={path} />
        {showMin && <circle className="ds-min" cx={toX(0.5)} cy={toY(0.2)} r={6} />}
        {size > 1e-6 && (
          <g className="ds-grad">
            <line x1={cx} y1={cy} x2={tip[0]} y2={tip[1]} />
            <circle cx={tip[0]} cy={tip[1]} r={3} />
          </g>
        )}
        <circle className="ds-here" cx={cx} cy={cy} r={6} />
      </svg>
    </div>
  )
}

function contour(m, rule, level, width, height) {
  const nx = 70
  const ny = Math.round(nx * (height / width))
  const at = (i, j) => m.loss(rule, MAP.w[0] + (i / nx) * (MAP.w[1] - MAP.w[0]), MAP.b[1] - (j / ny) * (MAP.b[1] - MAP.b[0])) - level
  const point = (i, j) => [(i / nx) * width, (j / ny) * height]
  let d = ''
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]
      const hits = []
      for (let k = 0; k < 4; k++) {
        const [a, b] = [corners[k], corners[(k + 1) % 4]]
        const [va, vb] = [at(...a), at(...b)]
        if ((va < 0) !== (vb < 0)) {
          const t = va / (va - vb)
          hits.push(point(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
        }
      }
      for (let k = 0; k + 1 < hits.length; k += 2) d += `M${hits[k][0].toFixed(1)},${hits[k][1].toFixed(1)}L${hits[k + 1][0].toFixed(1)},${hits[k + 1][1].toFixed(1)}`
    }
  }
  return d
}
