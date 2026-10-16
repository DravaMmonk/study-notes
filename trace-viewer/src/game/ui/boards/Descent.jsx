import { useEffect, useState } from 'react'
import { ArrowRight, Check, Footprints, Pause, Play, RotateCcw } from 'lucide-react'
import { L, tr } from '../../../../../games/kit/shell/i18n.js'
import { PHONE, useMedia } from '../../../../../games/kit/shell/useMedia.js'
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
  const status = passed[stage] && loss <= m.goal ? tr('到底了。', 'You reached the bottom.') : outOfSteps ? tr(`${s.budget} 步用完了，换个学习率再来。`, `All ${s.budget} steps are used up. Try another learning rate.`) : loss > 50 ? tr('冲出去了：每一步都越过谷底，越冲越远。', 'It shot off: every step overshoots the bottom and lands further away.') : s.mode === 'drag' ? tr('转动旋钮 w。', 'Turn the knob w.') : auto ? tr('机器在调……', 'The machine is tuning…') : tr('按「让机器自己调」或「走一步」。', 'Press "Let the machine tune it" or "Take a step".')

  const landscape = (
          <div>
            <span className="bk-label">{tr('误差地形 · 地面是旋钮（w 横着，b 往里），越高误差越大', 'Error landscape · the floor is the knobs (w across, b going back); the higher, the larger the error')}</span>
            <Landscape m={m} rule={s.rule} state={shown} trail={trail} rail={s.mode !== 'step2'} next={s.mode === 'drag' || (passed[stage] && loss <= m.goal) ? null : m.step(s, state, rate)} grad={{ gw, gb }} width={width} theme={theme} solved={passed[stage]} />
            <div className="wv-legend ls-legend">
              <span><i className="ls-key-ball" />{tr('你现在的位置', 'Where you are now')}</span>
              {s.mode !== 'step2' && <span><i className="ls-key-rail" />{tr('只能沿这条线走（b 固定为 0）', 'You can only move along this line (b is fixed at 0)')}</span>}
              {s.mode !== 'drag' && <span><i className="ls-key-grad" />{tr('上坡方向（梯度）', 'Uphill direction (gradient)')}</span>}
              {s.mode !== 'drag' && <span><i className="ls-key-next" />{tr('按「走一步」会落在哪', 'Where "Take a step" will land')}</span>}
              <span className="ls-scale">{tr('高度按误差的平方根画，谷底和陡坡都看得清', 'Height is drawn as the square root of the error, so the valley floor and the steep walls both show clearly')}</span>
            </div>
          </div>
  )
  const knobs = (
            <div className="ds-knobs">
              <span className="bk-label">{s.mode === 'drag' ? tr('旋钮（转它）', 'Knob (turn it)') : tr('旋钮（机器在转）', 'Knobs (the machine turns them)')}</span>
              <div className="ds-knob-row">
                <Knob label="w" value={state.w} min={KNOB_W[0]} max={KNOB_W[1]} onChange={s.mode === 'drag' ? (w) => arrive({ ...state, w }, 0) : null} size={phone ? 104 : 112} />
                {s.mode === 'step2' && <Knob label="b" value={state.b} min={KNOB_B[0]} max={KNOB_B[1]} size={phone ? 104 : 112} />}
              </div>
            </div>
  )
  const model = (
            <div className="ds-model">
              <span className="bk-label">{tr('旋钮决定这条线 · 线离样本越远误差越大', 'The knobs set this line · the further it is from the samples, the larger the error')}</span>
              <Plot
                width={phone ? 340 : 360}
                height={150}
                lo={-0.2}
                hi={1.2}
                ticks={[0, 0.5, 1]}
                span={1}
                label={tr('样本点和模型直线', 'Samples and the model line')}
                lines={[{ curve: (u) => shown.w * u + shown.b, kind: 'yours', label: tr('模型', 'model') }]}
                dots={m.xs.map((x) => ({ u: x, v: m.rules[s.rule](x), kind: 'ring', label: tr('样本', 'sample') }))}
              >
                {({ x, y }) => (
                  <g className="ds-miss">
                    {m.xs.map((v) => <line key={v} x1={x(v)} x2={x(v)} y1={y(m.rules[s.rule](v))} y2={y(shown.w * v + shown.b)} />)}
                  </g>
                )}
              </Plot>
              <p className="bk-caption">{tr('输出', 'output')} = {state.w.toFixed(2)} × {tr('输入', 'input')}{s.mode === 'step2' ? ` + ${state.b.toFixed(2)}` : ''} · {tr('红色竖线：每个样本差了多少', 'red lines: how far off each sample is')}</p>
            </div>
  )
  const history = (
          <div className="ds-history">
            <span className="bk-label">{tr('每一步之后的误差（对数刻度）', 'Error after each step (log scale)')}</span>
            <Plot
              width={width}
              height={phone ? 110 : 120}
              lo={LOG_LO}
              hi={LOG_HI}
              ticks={[-3, -2, -1, 0]}
              tickLabel={(t) => (t === 0 ? '1' : `0.${'0'.repeat(-t - 1)}1`)}
              left={44}
              span={Math.max(2, trail.length)}
              label={tr('误差随步数', 'Error by step')}
              lines={[]}
              dots={trail.map((p, i) => ({ u: (i + 0.5) / Math.max(2, trail.length), v: Math.max(LOG_LO, Math.min(LOG_HI, Math.log10(Math.max(1e-6, m.loss(s.rule, p.w, p.b))))), kind: 'point', label: tr(`第 ${i} 步`, `step ${i}`) }))}
            >
              {({ x, y }) => <line className="ds-goal" x1={x(0)} x2={x(1)} y1={y(Math.log10(m.goal))} y2={y(Math.log10(m.goal))} />}
            </Plot>
          </div>
  )
  const stats = (
          <div className="bk-stats">
            <div className={`bk-stat ${loss <= m.goal ? 'is-pass' : ''}`}><b>{fmt(loss)}</b><span>{tr(`误差（要 ≤ ${m.goal}）`, `Error (must be ≤ ${m.goal})`)}</span></div>
            {s.mode !== 'drag' && <div className="bk-stat"><b>{s.mode === 'step2' ? `${fmt(gw)} · ${fmt(gb)}` : fmt(gw)}</b><span>{s.mode === 'step2' ? tr('脚下的坡度（对 w · 对 b）', 'Slope underfoot (for w · for b)') : tr('脚下的坡度', 'Slope underfoot')}</span></div>}
            {s.budget && <div className={`bk-stat ${outOfSteps ? 'is-fail' : ''}`}><b>{steps} / {s.budget}</b><span>{tr('已走的步数', 'Steps taken')}</span></div>}
          </div>
  )
  const panel = (
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr(`第 ${stage + 1} 步`, `Step ${stage + 1}`)} · {L(s.title)}</span>
              <p className="wv-stage-note">{L(s.note)}</p>
            </div>
            {s.mode === 'drag' ? (
              <p className="bk-caption">{tr('转动旋钮 w（拖着转，或用方向键）。看那条线怎么转、小球怎么在地形上走。', 'Turn the knob w (drag it round, or use the arrow keys). Watch how the line turns and how the ball moves over the landscape.')}</p>
            ) : (
              <>
                <label className="bk-field">
                  <span>{tr('学习率', 'Learning rate')}</span>
                  <input className="bk-range" type="range" min={m.rate.min} max={m.rate.max} step={m.rate.step} value={rate} style={{ '--fill': `${((rate - m.rate.min) / (m.rate.max - m.rate.min)) * 100}%` }} onChange={(event) => setRate(Number(event.target.value))} />
                  <output>{rate.toFixed(1)}</output>
                </label>
                <p className="bk-caption">{s.mode === 'step2' ? tr('每一步：w ← w − 学习率 × 坡度，b 也一样', 'Each step: w ← w − learning rate × slope, and the same for b') : tr('每一步：w ← w − 学习率 × 坡度', 'Each step: w ← w − learning rate × slope')}</p>
                <button className="bk-btn is-primary ds-auto" disabled={finished && !auto} onClick={() => setAuto(!auto)}>{auto ? <><Pause size={16} />{tr('暂停', 'Pause')}</> : <><Play size={16} />{tr('让机器自己调', 'Let the machine tune it')}</>}</button>
                <div className="bk-row">
                  <button className="bk-btn" disabled={auto || finished} onClick={() => walk(1)}><Footprints size={15} />{tr('走一步', 'Take a step')}</button>
                  {s.mode === 'step2' && <button className="bk-btn" disabled={auto || finished} onClick={() => walk(10)}>{tr('走 10 步', 'Take 10 steps')}</button>}
                  <button className="bk-btn" onClick={() => reset()}><RotateCcw size={14} />{tr('回到起点', 'Back to start')}</button>
                </div>
              </>
            )}
            <div className="wv-next">
              <p className={`bk-verdict ${passed[stage] && loss <= m.goal ? 'is-pass' : outOfSteps || loss > 50 ? 'is-fail' : ''}`} aria-live="polite">{passed[stage] && loss <= m.goal && <Check size={15} />}{status}</p>
              {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={() => { go(stage + 1); setReached(Math.max(reached, stage + 1)) }}>{tr('下一步', 'Next step')} <ArrowRight size={15} /></button>}
            </div>
          </section>
  )
  const stageList = <Stages stages={m.stages} current={stage} passed={passed} reached={reached} onPick={go} />

  // On a phone the landscape and the knobs stay pinned at the top (the page pins a board's first
  // block when it fits), and everything that explains them scrolls below.
  if (phone) {
    return (
      <div className="bk wv ds">
        <div className="bk-split">
          <section className="bk-stage ds-pinned">
            {landscape}
            <div className="ds-phone-knobs">{knobs}</div>
          </section>
          <div className="bk-stack">
            {panel}
            <section className="bk-panel bk-stack">
              {model}
              {history}
              {stats}
            </section>
            {stageList}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="bk wv ds">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          {landscape}
          <div className="ds-machine">
            {knobs}
            {model}
          </div>
          {history}
          {stats}
        </section>
        <div className="bk-stack">
          {panel}
          {stageList}
        </div>
      </div>
    </div>
  )
}
