import { useState } from 'react'
import { tr } from './i18n.js'

function LossCurve({ losses }) {
  if (!losses.length) return <p className="panel-note">{tr('尚未训练。每训练一步，所有可学习的权重都朝误差减小的方向微调一点。')}</p>
  const all = losses.flatMap(({ train, check }) => [train, check]).filter((v) => v !== null && Number.isFinite(v))
  const low = Math.log(Math.min(...all) + 1e-9)
  const high = Math.log(Math.max(...all) + 1e-9)
  const line = (key) => losses.map((loss, i) => {
    if (!Number.isFinite(loss[key])) return null
    return `${i * 240 / Math.max(1, losses.length - 1)},${56 - (Math.log(loss[key] + 1e-9) - low) * 52 / Math.max(1e-9, high - low)}`
  }).filter(Boolean).join(' ')
  const last = losses.at(-1)
  return (
    <figure className="loss">
      <svg viewBox="0 0 240 60" role="img" aria-label={tr('损失曲线')}>
        <polyline className="loss-area" points={`0,60 ${line('train')} 240,60`} />
        <polyline points={line('train')} />
        {last.check !== null && <polyline className="loss-check" points={line('check')} />}
      </svg>
      <figcaption>
        {tr('训练误差', 'Training loss')} {last.train.toExponential(1)}
        {last.check !== null && <> · {tr('新样本误差', 'New-sample loss')} {last.check.toExponential(1)}</>}
        <span>{tr('对数刻度')}</span>
      </figcaption>
    </figure>
  )
}

export function useTraining(task, board, change, training) {
  const [losses, setLosses] = useState([])
  const [rate, setRate] = useState(() => training?.rate(task))
  const clear = () => setLosses([])
  if (!training?.has(board)) return { clear, panel: null }
  const train = (steps) => {
    const { circuit, history } = training.train(task, board, rate, steps)
    setLosses((old) => [...old, ...history].slice(-80))
    change(circuit)
  }
  const rates = training.rates(task)
  const panel = (
    <section>
      <h3 className="panel-label">{tr('训练')}</h3>
      <div className="train-buttons">
        {rates && <label className="train-rate">
          <span>{tr('学习率')}</span>
          <select value={rate} onChange={(event) => setRate(Number(event.target.value))}>
            {rates.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>}
        <button type="button" onClick={() => train(1)}>{tr('训练 1 步')}</button>
        <button type="button" onClick={() => train(10)}>{tr('训练 10 步')}</button>
        <button type="button" onClick={() => { change(training.reset(board)); clear() }}>{tr('重置参数')}</button>
      </div>
      <LossCurve losses={losses} />
    </section>
  )
  return { clear, panel }
}
