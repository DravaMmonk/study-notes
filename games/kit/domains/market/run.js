// Running a market board on a test: a world that answers it (../../engine/ticks.js reacting). Every tick the board
// reads what each shop had left and how many it turned away the tick before, and gives each shop a price; the street
// trades at those prices (world.js), and what it shows is what the board reads next tick. A test passes when the
// street has earned what it asks by its last tick.
//
// test   { shops: [shop], ticks, earn }   (world.js; course.js reads it)
// task   { inputs: [{ name, label }], outputs: [{ name, label }] }   the street's cards (world.js portsOf)
//
// runLevel(task, circuit, parts) → { runs, pass }, a run a test: { ticks: [{ tick, values, errors, outputs, trace,
//   read, trades }], earned, want, fail?, said? }
// entries({ task, test, run }) → what the results area can show of a test (../../engine/views.js), tick by tick: each
//   shop's price, what it sold, what it had left, how many it turned away, and what the street has earned so far
import { boardNode, reacting, runTicks } from '../../engine/ticks.js'
import { runTests } from '../../engine/circuit-domain.js'
import { numberText as fixed } from '../../engine/number.js'
import { T } from '../../shell/i18n.js'
import { portsOf, trade } from './world.js'

/** Every test of a task on a board: { runs, pass }. */
export const runLevel = runTests((task, circuit, test, parts) => {
  const names = portsOf(test.shops.length)
  const read = []
  const world = reacting({
    board: 'you',
    start: test.shops.map((shop) => ({ was: shop.open, left: 0, short: 0 })),
    reads: (state) => Object.fromEntries(state.flatMap((s, k) => [[names[k].was, s.was], [names[k].left, s.left], [names[k].short, s.short]])),
    step: (state, outputs, tick) => {
      const trades = test.shops.map((shop, k) => trade(shop, tick, outputs[names[k].price]))
      return { state: trades.map((t, k) => ({ was: t.price ?? state[k].was, left: t.left, short: t.short })), shown: trades }
    },
  })
  const bind = (tick) => (read[tick] ??= world.bind(tick))
  const run = runTicks({ nodes: [boardNode({ id: 'you', circuit, parts, bind, traced: true }), world.node], ticks: test.ticks, line: () => null })
  const ticks = run.steps.map((step) => ({ tick: step.tick, ...step.heard.you, read: read[step.tick], trades: step.heard.world }))
  const earned = ticks.reduce((sum, t) => sum + t.trades.reduce((n, x) => n + x.earned, 0), 0)
  if (earned >= test.earn) return { ticks, earned, want: test.earn }
  const said = T(`这条街挣了 ${fixed(earned)}，要挣到 ${fixed(test.earn)}。`, `The street earned ${fixed(earned)}; it has to earn ${fixed(test.earn)}.`)
  return { ticks, earned, want: test.earn, fail: { name: 'earned', want: test.earn, got: earned }, said }
})

const sum = (list) => list.reduce((n, x) => n + x, 0)

export const entries = ({ task, test, run }) => {
  const names = portsOf(test.shops.length)
  const of = (k, key) => run.ticks.map((t) => t.trades[k][key])
  const earned = run.ticks.map((t) => sum(t.trades.map((x) => x.earned)))
  const labelOf = (name) => (task.inputs ?? []).find((i) => i.name === name)?.label
  // What the street did is the run's doing as much as the prices are: it shows a tick at a time, as they do.
  return [
    ...task.outputs.map((o) => ({ of: o.name, label: o.label, shape: 'ticks', got: run.ticks.map((t) => t.outputs[o.name] ?? null) })),
    ...names.flatMap((n, k) => {
      const shop = n.price.slice(5)
      // What a shop showed is called as its card is; what it sold has no card, and says which shop where there are several.
      return [
        { of: `sold${shop}`, label: shop ? T(`卖出 ${shop}`, `Sold ${shop}`) : T('卖出'), shape: 'ticks', got: of(k, 'sold') },
        { of: n.left, label: labelOf(n.left) ?? T('剩下'), shape: 'ticks', got: of(k, 'left') },
        { of: n.short, label: labelOf(n.short) ?? T('没买到'), shape: 'ticks', got: of(k, 'short') },
      ]
    }),
    { of: 'earned', label: T('累计收入'), shape: 'ticks', got: earned.map((_, k) => sum(earned.slice(0, k + 1))) },
  ]
}
