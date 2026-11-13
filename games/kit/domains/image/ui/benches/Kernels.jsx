import { useEffect } from 'react'
import { ArrowRight, Check, Timer, X } from 'lucide-react'
import { tr } from '../../../../shell/i18n.js'
import ImageView from '../ImageView.jsx'
import { rangeOf } from '../display.js'
import './kernels.css'

// The kernel sprint's round (bench model `racer`): the input and what one kernel made of it, under a draining clock;
// and four kernel cards to answer with (a tap, or the keys 1–4). Answering one of four pictures against a clock is a
// play no knob can stand in for.

const fraction = (div) => (div === 1 ? '' : `÷ ${div}`)

// One kernel card: the 3×3 numbers as the 3×3 kernel part reads them, tinted by sign.
function KernelCard({ kernel }) {
  const peak = Math.max(...kernel.cells.map(Math.abs))
  return (
    <span className="racer-kernel">
      <span className="racer-grid">
        {kernel.cells.map((c, i) => {
          const share = Math.round((Math.abs(c) / peak) * 34)
          const tint = c > 0 ? `color-mix(in srgb, var(--accent) ${share}%, var(--paper))` : c < 0 ? `color-mix(in srgb, var(--ink) ${Math.round(share * 0.7)}%, var(--paper))` : 'var(--paper)'
          return <i key={i} style={{ background: tint }} className={c ? '' : 'is-zero'}>{c}</i>
        })}
      </span>
      <small>{fraction(kernel.div)}</small>
    </span>
  )
}

export function KernelRound({ ctx }) {
  const { round, seconds } = ctx.view
  const p = ctx.process
  const timed = !ctx.values.untimed
  const range = rangeOf(round.output)
  return (
    <div className="racer-stage">
      <div className="racer-clock" aria-hidden="true">
        {timed && !p.feedback && <i key={`${p.attempt}-${p.index}`} style={{ animationDuration: `${seconds}s` }} />}
      </div>
      <div className="racer-pair">
        <figure>
          <ImageView img={round.input} range={{ lo: 0, hi: 1 }} size={184} theme={ctx.theme} />
          <figcaption className="bk-caption">{tr('输入', 'Input')}</figcaption>
        </figure>
        <ArrowRight className="racer-arrow" size={20} strokeWidth={1.5} />
        <figure>
          <ImageView img={round.output} range={range} size={184} theme={ctx.theme} />
          <figcaption className="bk-caption">{tr('输出', 'Output')}{range.lo < 0 ? tr('（灰 = 0）') : ''}</figcaption>
        </figure>
      </div>
      <p className="bk-caption racer-time">{timed ? <><Timer size={13} /> {tr(`第 ${p.index + 1} 轮 · ${seconds.toFixed(1)} 秒`, `Round ${p.index + 1} · ${seconds.toFixed(1)} s`)}</> : tr(`第 ${p.index + 1} 轮 · 不限时`, `Round ${p.index + 1} · no time limit`)}</p>
    </div>
  )
}

export function KernelChoices({ ctx }) {
  const { round } = ctx.view
  const p = ctx.process
  const answer = (i) => ctx.act({ act: 'answer' }, i)

  useEffect(() => {
    const onKey = (event) => {
      if (/input|select|textarea/i.test(document.activeElement?.tagName)) return
      if (/^[1-4]$/.test(event.key)) {
        event.preventDefault()
        ctx.act({ act: 'answer' }, Number(event.key) - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ctx])

  return (
    <div className="racer-choices" role="group" aria-label={tr('选择核')}>
      {round.choices.map((k, i) => {
        const state = p.feedback ? (i === round.answer ? 'is-right' : i === p.feedback.chosen ? 'is-wrong' : 'is-dim') : ''
        return (
          <button key={`${p.index}-${i}`} className={`racer-choice ${state}`} onClick={() => answer(i)} disabled={Boolean(p.feedback)} aria-label={tr(`选项 ${i + 1}`, `Option ${i + 1}`)}>
            <span className="racer-key">{i + 1}</span>
            <KernelCard kernel={ctx.model.kernels[k]} />
            {state === 'is-right' && <Check className="racer-mark" size={16} />}
            {state === 'is-wrong' && <X className="racer-mark" size={16} />}
          </button>
        )
      })}
    </div>
  )
}
