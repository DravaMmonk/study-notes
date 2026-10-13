import { useEffect, useState } from 'react'
import { ArrowRight, Check, Footprints, Pause, Play, RotateCcw } from 'lucide-react'
import { PHONE, useMedia } from '../useMedia.js'
import { useTween } from './optics-motion.js'
import Knob from './Knob.jsx'
import Landscape from './Landscape.jsx'
import { Plot, Stages } from './WaveKit.jsx'
import './waves.css'
import './train.css'

const KNOB_W = [-1, 2.5]
const KNOB_B = [-0.6, 1.4]
const LOG_LO = -4
const LOG_HI = 0.5

// 4-1 下山: one knob, then two. The error is a landscape over the knobs, drawn in 3D: the ball is
// the model, its path the steps taken, the gold arrow the uphill gradient, the dashed arc where the
// next step lands. With one knob the ball runs on a rail (b = 0), a slice through the landscape.
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
  // The ball glides between steps; everything else reads the real position.
  const [tw, tb] = useTween([Number.isFinite(state.w) ? Math.max(-50, Math.min(50, state.w)) : 0, Number.isFinite(state.b) ? Math.max(-50, Math.min(50, state.b)) : 0], { ms: 360 })
  const shown = { w: tw, b: tb }

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
    setAuto(false)
    const start = m.stages[index].start
    setState(start)
    setSteps(0)
    setTrail([start])
  }
  const go = (index) => {
    setAuto(false)
    setStage(index)
    reset(index)
  }

  // 「让机器自己调」: one step every half second until the bottom, the step budget, or a blow-up.
  const [auto, setAuto] = useState(false)
  const finished = (passed[stage] && loss <= m.goal) || (s.budget && steps >= s.budget) || !(loss < 50)
  useEffect(() => {
    if (!auto) return undefined
    const timer = setTimeout(() => (finished ? setAuto(false) : walk(1)), s.mode === 'step2' ? 170 : 520)
    return () => clearTimeout(timer)
    // Re-arm after each step only, not on every animation frame of the gliding ball.
  }, [auto, steps, state, rate]) // eslint-disable-line react-hooks/exhaustive-deps

  const width = phone ? 340 : 600
  const fmt = (v) => (Math.abs(v) > 999 ? v.toExponential(1) : v.toFixed(3))
  const status = passed[stage] && loss <= m.goal ? '到底了。' : outOfSteps ? `${s.budget} 步用完了，换个学习率再来。` : loss > 50 ? '冲出去了：每一步都越过谷底，越冲越远。' : s.mode === 'drag' ? '转动旋钮 w。' : auto ? '机器在调……' : '按「让机器自己调」或「走一步」。'

  return (
    <div className="bk wv ds">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          <div>
            <span className="bk-label">误差地形 · 地面是旋钮（w 横着，b 往里），越高误差越大</span>
            <Landscape m={m} rule={s.rule} state={shown} trail={trail} rail={s.mode !== 'step2'} next={s.mode === 'drag' || (passed[stage] && loss <= m.goal) ? null : m.step(s, state, rate)} grad={{ gw, gb }} width={width} theme={theme} solved={passed[stage]} />
            <div className="wv-legend ls-legend">
              <span><i className="ls-key-ball" />你现在的位置</span>
              {s.mode !== 'step2' && <span><i className="ls-key-rail" />只能沿这条线走（b 固定为 0）</span>}
              {s.mode !== 'drag' && <span><i className="ls-key-grad" />上坡方向（梯度）</span>}
              {s.mode !== 'drag' && <span><i className="ls-key-next" />按「走一步」会落在哪</span>}
              <span className="ls-scale">高度按误差的平方根画，谷底和陡坡都看得清</span>
            </div>
          </div>
          <div className="ds-machine">
            <div className="ds-knobs">
              <span className="bk-label">旋钮{s.mode === 'drag' ? '（转它）' : '（机器在转）'}</span>
              <div className="ds-knob-row">
                <Knob label="w" value={state.w} min={KNOB_W[0]} max={KNOB_W[1]} onChange={s.mode === 'drag' ? (w) => arrive({ ...state, w }, 0) : null} size={phone ? 104 : 112} />
                {s.mode === 'step2' && <Knob label="b" value={state.b} min={KNOB_B[0]} max={KNOB_B[1]} size={phone ? 104 : 112} />}
              </div>
            </div>
            <div className="ds-model">
              <span className="bk-label">旋钮决定这条线 · 线离样本越远误差越大</span>
              <Plot
                width={phone ? 340 : 360}
                height={150}
                lo={-0.2}
                hi={1.2}
                ticks={[0, 0.5, 1]}
                span={1}
                label="样本点和模型直线"
                lines={[{ curve: (u) => shown.w * u + shown.b, kind: 'yours', label: '模型' }]}
                dots={m.xs.map((x) => ({ u: x, v: m.rules[s.rule](x), kind: 'ring', label: '样本' }))}
              >
                {({ x, y }) => (
                  <g className="ds-miss">
                    {m.xs.map((v) => <line key={v} x1={x(v)} x2={x(v)} y1={y(m.rules[s.rule](v))} y2={y(shown.w * v + shown.b)} />)}
                  </g>
                )}
              </Plot>
              <p className="bk-caption">输出 = {state.w.toFixed(2)} × 输入{s.mode === 'step2' ? ` + ${state.b.toFixed(2)}` : ''} · 红色竖线：每个样本差了多少</p>
            </div>
          </div>
          <div className="ds-history">
            <span className="bk-label">每一步之后的误差（对数刻度）</span>
            <Plot
              width={width}
              height={phone ? 110 : 120}
              lo={LOG_LO}
              hi={LOG_HI}
              ticks={[-3, -2, -1, 0]}
              tickLabel={(t) => (t === 0 ? '1' : `0.${'0'.repeat(-t - 1)}1`)}
              left={44}
              span={Math.max(2, trail.length)}
              label="误差随步数"
              lines={[]}
              dots={trail.map((p, i) => ({ u: (i + 0.5) / Math.max(2, trail.length), v: Math.max(LOG_LO, Math.min(LOG_HI, Math.log10(Math.max(1e-6, m.loss(s.rule, p.w, p.b))))), kind: 'point', label: `第 ${i} 步` }))}
            >
              {({ x, y }) => <line className="ds-goal" x1={x(0)} x2={x(1)} y1={y(Math.log10(m.goal))} y2={y(Math.log10(m.goal))} />}
            </Plot>
          </div>
          <div className="bk-stats">
            <div className={`bk-stat ${loss <= m.goal ? 'is-pass' : ''}`}><b>{fmt(loss)}</b><span>误差（要 ≤ {m.goal}）</span></div>
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
              <p className="bk-caption">转动左下的旋钮 w（拖着转一圈，或用方向键）。看那条线怎么转、小球怎么在地形上走。</p>
            ) : (
              <>
                <label className="bk-field">
                  <span>学习率</span>
                  <input className="bk-range" type="range" min={m.rate.min} max={m.rate.max} step={m.rate.step} value={rate} style={{ '--fill': `${((rate - m.rate.min) / (m.rate.max - m.rate.min)) * 100}%` }} onChange={(event) => setRate(Number(event.target.value))} />
                  <output>{rate.toFixed(1)}</output>
                </label>
                <p className="bk-caption">每一步：w ← w − 学习率 × 坡度{s.mode === 'step2' ? '，b 也一样' : ''}</p>
                <button className="bk-btn is-primary ds-auto" disabled={finished && !auto} onClick={() => setAuto(!auto)}>{auto ? <><Pause size={16} />暂停</> : <><Play size={16} />让机器自己调</>}</button>
                <div className="bk-row">
                  <button className="bk-btn" disabled={auto || finished} onClick={() => walk(1)}><Footprints size={15} />走一步</button>
                  {s.mode === 'step2' && <button className="bk-btn" disabled={auto || finished} onClick={() => walk(10)}>走 10 步</button>}
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
