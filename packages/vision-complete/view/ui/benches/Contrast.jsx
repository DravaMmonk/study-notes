import { GridPicture } from 'kernel/view'
import { useTween } from 'kernel/view'
import { L, tr } from 'kernel/view'
import './contrast.css'

// The pull-and-push bench's pictures (bench model `contrast`): the embedding plane, where a linear encoder puts every
// quiz view (never trained on) on the unit circle and the dots glide as it trains; and the table of each view's
// chances of picking each other view as its partner.

const pct = (x) => `${Math.round(x * 100)}%`

// Ease every angle along the shorter way round the circle, so dots glide on the circle, not through it.
const mixAngle = (from, to, progress) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * progress

const tagOf = (m, i) => `${m.NAMES[m.quiz[i].image]}${(i % 2) + 1}`

export function Embedding({ ctx, children }) {
  const m = ctx.model
  const shown = useTween(ctx.view.angles, { ms: 360, interpolate: mixAngle })
  const at = (i, r = 1) => [Math.cos(shown[i]) * r, -Math.sin(shown[i]) * r]
  return (
    <div className="contrast-stage">
      {children && <div className="contrast-stage-head">{children}</div>}
      <svg className="contrast-plane" viewBox="-1.32 -1.32 2.64 2.64" role="img" aria-label={tr('嵌入平面：每个视图是单位圆上的一点')}>
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
                <GridPicture value={m.quiz[a].img} scale={20 / m.quiz[a].img.w} />
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
      <p className="bk-caption">{tr('数字为选中各视图的概率（%）；粗框标出真正的搭档。')}</p>
    </figure>
  )
}
