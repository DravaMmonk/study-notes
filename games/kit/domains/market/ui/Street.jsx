import { numberText } from '../../../engine/number.js'
import { L, T } from '../../../shell/i18n.js'
import { topAt } from '../world.js'

// The picture of a market test, by its results: for each shop, price up and people across, the line of who would buy
// at each price and the upright line of what the shop stocks. The price the board gives is a point on the demand
// line; between it and the stock, along its price, lies what is left over or who goes without. On a street the points
// of the ticks so far stay where they were behind the one shown, and the demand line moves when the street's demand
// shifts. A row
// draws what it names: a demand line needs `top` and `slope`, the stock `stock`, the point `price` (given, or the
// board's own).

const [W, H, LEFT, BASE, TOP, RIGHT] = [220, 150, 30, 130, 12, 208]

/** What a test draws, a panel a shop: { name, top, slope, tops, stock?, points: [{ price, wanted }] }, the last point
 * the one shown. */
function panels(task, test, run, at) {
  if (test.shops) {
    const shown = run ? run.ticks.slice(0, at + 1) : []
    return test.shops.map((shop, k) => ({
      top: topAt(shop, Math.max(0, at)),
      tops: [shop.top, ...(shop.shifts ?? []).map((s) => s.top)],
      slope: shop.slope,
      stock: shop.stock,
      name: task.outputs[k].label,
      points: shown.map((t) => t.trades[k]).filter((t) => t.price !== null).map((t) => ({ price: t.price, wanted: t.sold + t.short })),
    }))
  }
  const { top, slope, stock, price = run?.outputs.price } = test.in
  return top === undefined || slope === undefined ? [] : [{ name: T('价格'), top, tops: [top], slope, stock, points: typeof price === 'number' ? [{ price, wanted: Math.max(0, top - slope * price) }] : [] }]
}

function Panel({ name, top, tops, slope, stock, points }) {
  const [people, dear] = [Math.max(...tops), Math.max(...tops) / slope]
  const x = (q) => LEFT + ((RIGHT - LEFT) * q) / people
  const y = (p) => BASE - ((BASE - TOP) * Math.min(p, dear)) / dear
  const now = points.at(-1)
  const gap = !now || stock === undefined ? 0 : now.wanted - stock
  const state = !now ? '' : Math.abs(gap) < 1 ? 'clear' : gap > 0 ? 'short' : 'left'
  return (
    <svg className="mk-panel" viewBox={`0 0 ${W} ${H}`} data-state={state} role="img" aria-label={L(T('需求和进货'))}>
      <path className="mk-axis" d={`M${LEFT} ${TOP - 6}V${BASE}H${RIGHT + 6}`} />
      <text className="mk-name" x={LEFT - 6} y={TOP - 2} textAnchor="end">{L(name)}</text>
      <text className="mk-name" x={RIGHT + 6} y={BASE + 13} textAnchor="end">{L(T('人数', 'People'))}</text>
      {stock !== undefined && <path className="mk-stock" d={`M${x(stock)} ${TOP}V${BASE}`} />}
      {stock !== undefined && <text className="mk-name" x={x(stock)} y={BASE + 13} textAnchor="middle">{L(T('进货'))}</text>}
      <path className="mk-demand" d={`M${x(top)} ${y(0)}L${x(0)} ${y(top / slope)}`} />
      <text className="mk-name" x={x(top * 0.82) + 4} y={y((top * 0.18) / slope) - 5}>{L(T('想买'))}</text>
      {points.slice(0, -1).map((p, k) => <circle key={k} className="mk-was" cx={x(p.wanted)} cy={y(p.price)} r="2.2" opacity={0.2 + (0.6 * (k + 1)) / points.length} />)}
      {now && (
        <>
          <path className="mk-level" d={`M${LEFT} ${y(now.price)}H${x(Math.max(now.wanted, stock ?? 0))}`} />
          {(state === 'short' || state === 'left') && <path className="mk-gap" d={`M${x(stock)} ${y(now.price)}H${x(now.wanted)}`} />}
          <circle className="mk-now" cx={x(now.wanted)} cy={y(now.price)} r="4" />
          <text className="mk-price" x={LEFT - 6} y={y(now.price) + 3.5} textAnchor="end">{numberText(now.price)}</text>
        </>
      )}
    </svg>
  )
}

export default function Street({ task, test, run, at }) {
  const list = test ? panels(task, test, run, at) : []
  return list.length ? <div className="mk-street">{list.map((p, k) => <Panel key={k} {...p} />)}</div> : null
}
