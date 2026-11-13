import { numberText } from '../../../engine/number.js'
import { T } from '../../../shell/i18n.js'
import { topAt } from '../world.js'

// The scene of a market test, as the kit's chart draws it (../../../views/plots/Chart.jsx): for each shop, price up and people across, the line of who would
// buy at each price and the upright line of what the shop stocks. The price the board gives is a point on the demand
// line; between it and the stock, along its price, lies what is left over or who goes without. On a street the points
// of the ticks so far stay where they were behind the one shown, and the demand line moves when the street's demand
// shifts. A row draws what it names: a demand line needs `top` and `slope`, the stock `stock`, the point `price`
// (given, or the board's own).

/** What a test draws, a shop each: { name, top, slope, tops, stock?, points: [[wanted, price]] }, the last point the
 * one shown. */
function shops(task, test, run, at) {
  const street = test.shops ?? (test.breaks ? run?.street ?? [] : null)
  if (street) {
    const shown = run ? run.ticks.slice(0, at + 1) : []
    return street.map((shop, k) => ({
      name: test.breaks ? T('它的价格', 'Its price') : task.outputs[k].label,
      top: topAt(shop, Math.max(0, at)),
      tops: [shop.top, ...(shop.shifts ?? []).map((s) => s.top)],
      slope: shop.slope,
      stock: shop.stock,
      points: shown.map((t) => t.trades[k]).filter((t) => t.price !== null).map((t) => [t.sold + t.short, t.price]),
    }))
  }
  const { top, slope, stock, price = run?.outputs.price } = test.in ?? test.given
  return top === undefined || slope === undefined ? [] : [{ name: T('价格'), top, tops: [top], slope, stock, points: typeof price === 'number' ? [[Math.max(0, top - slope * price), price]] : [] }]
}

const chart = ({ name, top, tops, slope, stock, points }) => {
  const people = Math.max(...tops)
  const now = points.at(-1)
  const off = now && stock !== undefined ? now[0] - stock : 0
  const held = stock !== undefined
  return {
    part: 'chart',
    label: T('需求和进货'),
    x: { name: T('人数', 'People'), max: people },
    y: { name, max: people / slope },
    lines: [{ from: [top, 0], to: [0, top / slope], kind: 'curve' }, ...(held ? [{ from: [stock, 0], to: [stock, people / slope], kind: 'bound' }] : [])],
    labels: [{ at: [top * 0.82, (top * 0.18) / slope], text: T('想买') }, ...(held ? [{ at: [stock, 0], text: T('进货'), under: true }] : [])],
    series: [{ points: points.slice(0, -1), kind: 'was' }],
    point: now && { at: now, reads: numberText(now[1]) },
    gap: now && held && Math.abs(off) >= 1 ? { from: [stock, now[1]], to: now } : undefined,
    state: !now ? undefined : Math.abs(off) < 1 ? 'met' : off > 0 ? 'over' : 'under',
  }
}

/** The scene of a test: a chart a shop. */
export const street = ({ task, test, run, at }) => (test ? shops(task, test, run, at).map(chart) : [])
