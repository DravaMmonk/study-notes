import { useEffect, useRef, useState } from 'react'
import ImageView from '../ImageView.jsx'
import { useMedia } from '../../../../shell/useMedia.js'
import { L, tr } from '../../../../shell/i18n.js'
import './contrast.css'

// The pull-and-push bench's pictures (bench model `contrast`): the embedding plane, where a linear encoder puts every
// quiz view (never trained on) on the unit circle and the dots glide as it trains; and the table of each view's
// chances of picking each other view as its partner.

const REDUCED = '(prefers-reduced-motion: reduce)'
const pct = (x) => `${Math.round(x * 100)}%`

// Ease every angle along the shorter way round the circle, so dots glide on the circle, not through it.
const mixAngles = (from, to, e) =>
  to.map((b, i) => {
    const a = from[i] ?? b
    return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e
  })

// Animate the angles towards their targets over `ms` (ease-out); reduced motion shows the targets at once.
function useEased(target, ms) {
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
      const value = mixAngles(from, target, 1 - (1 - k) ** 3)
      last.current = value
      setShown(value)
      if (k < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reduced, ms])
  return reduced ? target : shown
}

const tagOf = (m, i) => `${m.NAMES[m.quiz[i].image]}${(i % 2) + 1}`

export function Embedding({ ctx, children }) {
  const m = ctx.model
  const shown = useEased(ctx.view.angles, 360)
  const at = (i, r = 1) => [Math.cos(shown[i]) * r, -Math.sin(shown[i]) * r]
  return (
    <div className="contrast-stage">
      {children && <div className="contrast-stage-head">{children}</div>}
      <svg className="contrast-plane" viewBox="-1.32 -1.32 2.64 2.64" role="img" aria-label={tr('嵌入平面：每个视图是单位圆上的一点', 'Embedding plane: each view is a point on the unit circle')}>
        <line className="plane-axis" x1="-1.25" y1="0" x2="1.25" y2="0" />
        <line className="plane-axis" x1="0" y1="-1.25" x2="0" y2="1.25" />
        <circle className="plane-circle" cx="0" cy="0" r="1" />
        {m.NAMES.map((_, i) => {
          const [a, b] = [at(2 * i), at(2 * i + 1)]
          return <line key={i} className="plane-pair" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
        })}
        {shown.map((_, i) => {
          const [x, y] = at(i)
          const [lx, ly] = at(i, 1.14)
          return (
            <g key={i}>
              <circle className={`plane-dot ${i % 2 ? 'is-second' : ''}`} cx={x} cy={y} r="0.036" />
              <text className="plane-label" x={lx} y={ly + 0.036}>{m.NAMES[m.quiz[i].image]}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function ChoiceMatrix({ ctx }) {
  const m = ctx.model
  const { rows, matrixTitle } = ctx.view
  return (
    <figure className="bk-panel contrast-matrix">
      <figcaption className="bk-label">{matrixTitle.map(L).join('')}</figcaption>
      <table>
        <thead>
          <tr>
            <th />
            {rows.map((_, k) => <th key={k} scope="col">{tagOf(m, k)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, a) => (
            <tr key={a}>
              <th scope="row">
                <ImageView img={m.quiz[a].img} size={20} range={{ lo: 0, hi: 1 }} theme={ctx.theme} />
                {tagOf(m, a)}
              </th>
              {row.map((p, k) => (
                <td
                  key={k}
                  className={k === a ? 'is-self' : k === (a ^ 1) ? 'is-partner' : ''}
                  style={k === a ? undefined : { background: `color-mix(in srgb, var(--accent) ${Math.round(p * 100)}%, var(--paper))` }}
                  aria-label={k === a ? undefined : tr(`${tagOf(m, a)} 选 ${tagOf(m, k)}：${pct(p)}`, `${tagOf(m, a)} picks ${tagOf(m, k)}: ${pct(p)}`)}
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
  )
}
