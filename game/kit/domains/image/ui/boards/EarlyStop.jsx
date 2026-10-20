import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { L, tr } from '../../../../shell/i18n.js'
import { PHONE, useMedia } from '../../../../shell/useMedia.js'
import { Plot, Stages } from './WaveKit.jsx'
import './waves.css'
import './train.css'

// Losses span 0.005 … 2, so they are plotted as log10.
const LOG_LO = -2.5
const LOG_HI = 0.5
const logLoss = (v) => Math.log10(Math.max(1e-6, v))
const tickLabel = (t) => (10 ** t >= 1 ? (10 ** t).toFixed(0) : (10 ** t).toFixed(Math.max(0, -Math.floor(t))))

// 4-10 什么时候停: a curve fitted to ten noisy samples. Scrub through training (or set the weight
// penalty) and watch the fit, the training error and the error on new samples.
export default function EarlyStop({ level, onSolve }) {
  const m = level.stop
  const phone = useMedia(PHONE)
  const [s, setS] = useState(m.start)
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => m.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const st = m.stages[stage]
  const run = m.training()
  const match = m.passes(st, s)

  const update = (next) => {
    setS(next)
    if (m.passes(st, next) && !passed[stage]) {
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const go = (index) => setStage(index)

  const current = st.control === 'step' ? run[s.step] : m.regularised(m.lambdas[s.lambda])
  const x = (u) => -1 + 2 * u
  const width = phone ? 340 : 600
  // The history of the errors: along training steps, or along λ.
  const history = st.control === 'step' ? run.map((r) => [r.train, r.valid]) : m.lambdas.map((l) => { const r = m.regularised(l); return [r.train, r.valid] })
  const shownUpTo = st.control === 'step' ? s.step : history.length - 1
  const at = st.control === 'step' ? s.step : s.lambda
  const count = history.length

  return (
    <div className="bk wv es">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          <div>
            <span className="bk-label">{tr('模型画出的曲线', 'The curve the model draws')}</span>
            <Plot
              width={width}
              height={phone ? 180 : 210}
              lo={-1.6}
              hi={1.6}
              ticks={[-1, 0, 1]}
              span={2}
              label={tr('拟合的曲线', 'Fitted curve')}
              lines={[{ curve: (u) => m.predict(current.w, x(u)), kind: 'yours', label: tr('模型', 'model') }, { curve: (u) => m.data.truth(x(u)), kind: 'faint', label: tr('真实规律', 'true rule') }]}
              dots={[
                ...m.data.tx.map((v, i) => ({ u: (v + 1) / 2, v: m.data.ty[i], kind: 'point', label: tr('训练样本', 'training sample') })),
                ...m.data.vx.filter((_, i) => i % 3 === 0).map((v, i) => ({ u: (v + 1) / 2, v: m.data.vy[i * 3], kind: 'ring', label: tr('新样本', 'new sample') })),
              ]}
            />
            <div className="wv-legend"><span><i />{tr('模型', 'Model')}</span><span><i className="is-faint" />{tr('真实规律（模型看不到）', 'True rule (hidden from the model)')}</span><span><i className="is-ring" />{tr('新样本', 'New samples')}</span><span><i className="is-point" />{tr('训练样本', 'Training samples')}</span></div>
          </div>
          <div>
            <span className="bk-label">{st.control === 'step' ? tr('误差随训练步数（对数刻度）', 'Error by training step (log scale)') : tr('误差随 λ（对数刻度）', 'Error by λ (log scale)')}</span>
            <Plot
              width={width}
              height={phone ? 160 : 180}
              lo={LOG_LO}
              hi={LOG_HI}
              ticks={[-2, -1, 0]}
              tickLabel={tickLabel}
              left={40}
              span={count}
              label={tr('训练误差和新样本误差', 'Training error and new-sample error')}
              lines={[
                { curve: history.map((h, i) => (i <= shownUpTo ? logLoss(h[0]) : NaN)), kind: 'yours', label: tr('训练误差', 'training error') },
                { curve: history.map((h, i) => (i <= shownUpTo ? logLoss(h[1]) : NaN)), kind: 'error', label: tr('新样本误差', 'new-sample error') },
              ]}
            >
              {({ x: px, y }) => (
                <g className="es-now">
                  <line x1={px((at + 0.5) / count)} x2={px((at + 0.5) / count)} y1={y(LOG_HI)} y2={y(LOG_LO)} />
                </g>
              )}
            </Plot>
            <div className="wv-legend"><span><i />{tr('训练误差', 'Training error')}</span><span><i className="is-error" />{tr('新样本误差', 'New-sample error')}</span></div>
          </div>
          <div className="bk-stats">
            <div className="bk-stat"><b>{current.train.toFixed(4)}</b><span>{tr('训练误差', 'Training error')}</span></div>
            <div className={`bk-stat ${match ? 'is-pass' : ''}`}><b>{current.valid.toFixed(4)}</b><span>{tr('新样本误差', 'New-sample error')}</span></div>
          </div>
        </section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr(`第 ${stage + 1} 步`, `Step ${stage + 1}`)} · {L(st.title)}</span>
              <p className="wv-stage-note">{L(st.note)}</p>
            </div>
            {st.control === 'step' ? (
              <label className="bk-field">
                <span>{tr('训练了多少步', 'Steps trained')}</span>
                <input className="bk-range" type="range" min={0} max={run.length - 1} step={1} value={s.step} style={{ '--fill': `${(s.step / (run.length - 1)) * 100}%` }} onChange={(event) => update({ ...s, step: Number(event.target.value) })} />
                <output>{run[s.step].step.toLocaleString('en-US')}</output>
              </label>
            ) : (
              <label className="bk-field">
                <span>{tr('正则化强度 λ', 'Regularisation strength λ')}</span>
                <input className="bk-range" type="range" min={0} max={m.lambdas.length - 1} step={1} value={s.lambda} style={{ '--fill': `${(s.lambda / (m.lambdas.length - 1)) * 100}%` }} onChange={(event) => update({ ...s, lambda: Number(event.target.value) })} />
                <output>{m.lambdas[s.lambda].toExponential(0)}</output>
              </label>
            )}
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{tr('新样本的误差几乎最低了。', 'The error on new samples is about as low as it gets.')}</> : tr('新样本的误差还不够低。', 'The error on new samples is not low enough yet.')}</p>
              {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={() => { go(stage + 1); setReached(Math.max(reached, stage + 1)) }}>{tr('下一步', 'Next step')} <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={m.stages} current={stage} passed={passed} reached={reached} onPick={go} />
        </div>
      </div>
    </div>
  )
}
