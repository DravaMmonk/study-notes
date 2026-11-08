import { tr } from '../../../../shell/i18n.js'
import './apple-light.css'

// Each grayscale image uses the same 0–1 scale, so channels remain comparable as the light changes.
export function AppleChannels({ ctx }) {
  const values = ctx.view.channels
  return (
    <div className="apple-channels">
      <p>{tr('每张图的黑白表示该通道的数值：黑是 0，白是 1。', 'Each grayscale image shows its channel value: black is 0, white is 1.')}</p>
      <div className="apple-grid">
        <span />{['R', 'G', 'B'].map((channel) => <strong key={channel}>{channel}</strong>)}
        {values.map((colour, index) => (
          <div className="apple-row" key={index}>
            <b>{index === 0 ? 'A' : 'B'}</b>
            {colour.map((value, channel) => {
              const gray = Math.round(value * 255)
              return <figure key={channel}>
                <svg viewBox="0 0 64 64" role="img" aria-label={`${index === 0 ? 'A' : 'B'} ${['R', 'G', 'B'][channel]} ${value.toFixed(2)}`}>
                  <path d="M32 19 C26 12 12 14 10 29 C8 42 17 56 25 56 C28 56 30 54 32 54 C34 54 36 56 39 56 C47 56 56 42 54 29 C52 14 38 12 32 19 Z" fill={`rgb(${gray},${gray},${gray})`} stroke="var(--rule)" strokeWidth="1.5" />
                  <path d="M32 19 Q31 11 35 7" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <figcaption>{value.toFixed(2)}</figcaption>
              </figure>
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function AppleDecision({ ctx }) {
  return (
    <div className="bk-stack">
      {ctx.revealed && !ctx.pass && <p className="apple-feedback" role="status">{tr('再比较一下：看 R 在这只苹果的三个通道之和中占多少，再改变光照试试。', 'Compare again: look at the share of R in this apple’s three-channel total, then change the light and try again.')}</p>}
      <button type="button" className="bk-btn is-primary" disabled={ctx.values.pick === null} onClick={ctx.check}>{tr('检查选择', 'Check selection')}</button>
    </div>
  )
}
