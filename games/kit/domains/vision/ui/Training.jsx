import Plot from '../../../shell/bench/Plot.jsx'
import Show from '../../../views/Show.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { numberText } from '../../../engine/number.js'
import { fromRows } from '../image.js'

// A training task's pictures (../run.js trainedBoard): the loss epoch by epoch under the results, and the learned
// parameter on a learnable card's face (the `learned` widget).

/** The training loss (and the validation loss, where there is a validation set) over the epochs. */
export function LossCurve({ training, phone }) {
  if (training.error) return <p className="rv-verdict is-fail" role="status">{L(training.error)}</p>
  const { train, validation } = training.curve
  const held = validation.filter((v) => v !== null)
  const hi = Math.max(1e-9, ...train, ...held)
  const lines = [{ curve: train, kind: 'yours', label: tr('训练误差', 'Training loss') }, ...(held.length ? [{ curve: held, kind: 'target', label: tr('验证误差', 'Validation loss') }] : [])]
  return (
    <figure className="vi-training">
      <Plot lines={lines} lo={0} hi={hi} ticks={[0, hi / 2, hi]} tickLabel={numberText} span={train.length} height={phone ? 120 : 140} />
      <figcaption>
        {tr(`训练 ${training.epochs} 轮`, `${training.epochs} epochs`)}
        {training.best && training.best !== training.epochs ? tr(`，留下第 ${training.best} 轮`, `, keeping epoch ${training.best}`) : ''}
        {training.blocked.length ? tr(`。梯度过不去：${training.blocked.join('、')}`, `. The gradient cannot pass: ${training.blocked.join(', ')}`) : ''}
      </figcaption>
    </figure>
  )
}

/** A learnable card's learned value: a number or a small table, read only; training changes it. */
export function Learned({ value }) {
  if (value === null || value === undefined) return <span className="vi-learned">{tr('未训练', 'untrained')}</span>
  if (typeof value === 'number') return <span className="vi-learned">{numberText(value)}</span>
  return <Show value={fromRows(value)} scene="card" views={['numbers']} />
}

export const WIDGETS = { learned: Learned }
