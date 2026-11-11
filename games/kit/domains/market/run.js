// Running a market board on a test. What decides a pass is all in front of the player before the first card is placed
// (games/DIRECTION.md decision 19): a test is one of
//
//   a row      { in: { card: number }, out: { card: number } }   the board run once on the numbers given; every output
//                                                                 has to be the number asked for
//   a street   { shops: [shop], ticks }   a world that answers the board (../../engine/ticks.js reacting, world.js):
//              every tick the board reads each shop's price, what it had left and how many it turned away the tick
//              before, and gives each shop a price; on the last tick every shop has to have cleared
//
// task   { inputs: [{ name, label }], outputs: [{ name, label }] }   a row's cards, or a street's (world.js portsOf)
//
// runLevel(task, circuit, parts) → { runs, pass }, a run a test: a row's { values, errors, outputs, trace, fail?,
//   said? } (a board run once, ../../engine/boards.js), a street's { ticks: [{ tick, values, errors, outputs, trace,
//   read, trades }], fail?, said? }
// once(task) → whether the task's tests are rows
// entries({ task, test, run }) → what the results area can show of a test (../../engine/views.js): a row's numbers
//   given, asked for and got; a street tick by tick, each shop's price, what it sold, what it had left, how many it
//   turned away, and what the street has earned so far (shown, never asked for)
import { runTraced } from '../../engine/boards.js'
import { boardNode, reacting, runTicks } from '../../engine/ticks.js'
import { runTests } from '../../engine/circuit-domain.js'
import { valueText as show } from '../../engine/views.js'
import { T } from '../../shell/i18n.js'
import { portsOf, trade } from './world.js'

const TOLERANCE = 1e-9
const same = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= TOLERANCE
const label = (port, side) => port.label[side] ?? port.label.zh ?? port.label

/** A row: the board run once on the numbers given, every output the number asked for. */
function runRow(task, circuit, test, parts) {
  const run = runTraced(circuit, parts, test.in)
  const out = task.outputs.find((o) => !same(run.outputs[o.name], test.out[o.name]))
  if (!out) return run
  const [want, got] = [test.out[out.name], run.outputs[out.name] ?? null]
  return { ...run, fail: { name: out.name, want, got }, said: T(`「${label(out, 'zh')}」应当是 ${show(want)}，这块板给出 ${show(got)}。`, `“${label(out, 'en')}” should be ${show(want)}; the board gives ${show(got)}.`) }
}

/** A street: the board gives every shop its price each tick and reads the tick after what came of it; on the last
 * tick every shop has to have cleared (less than one left, less than one turned away). */
function runStreet(task, circuit, test, parts) {
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
  const k = ticks.at(-1).trades.findIndex((t) => t.price === null || t.left >= 1 || t.short >= 1)
  if (k < 0) return { ticks }
  const { left, short } = ticks.at(-1).trades[k]
  const shop = names[k].price.slice(5)
  return { ticks, fail: { name: names[k].price, want: 0, got: left || short }, said: T(`最后一天${shop ? `，${shop} 号店` : ''}剩下 ${show(left)}，没买到 ${show(short)}：两边都要不到 1。`, `On the last day${shop ? ` shop ${shop}` : ''} had ${show(left)} left and turned ${show(short)} away: both have to be under 1.`) }
}

/** Every test of a task on a board: { runs, pass }. */
export const runLevel = runTests((task, circuit, test, parts) => (test.shops ? runStreet : runRow)(task, circuit, test, parts))

/** Whether a task's tests are rows: its board runs once a test. */
export const once = (task) => !task.tests[0].shops

const sum = (list) => list.reduce((n, x) => n + x, 0)

export const entries = ({ task, test, run }) => {
  if (!test.shops) {
    return [
      ...(task.inputs ?? []).map((i) => ({ of: i.name, label: i.label, shape: 'scalar', given: test.in[i.name], shown: false })),
      ...task.outputs.map((o) => ({ of: o.name, label: o.label, shape: 'scalar', got: run.outputs[o.name] ?? null, want: test.out[o.name], tolerance: TOLERANCE })),
    ]
  }
  const names = portsOf(test.shops.length)
  const of = (k, key) => run.ticks.map((t) => t.trades[k][key])
  const earned = run.ticks.map((t) => sum(t.trades.map((x) => x.earned)))
  return [
    ...task.outputs.map((o) => ({ of: o.name, label: o.label, shape: 'ticks', got: run.ticks.map((t) => t.outputs[o.name] ?? null) })),
    ...names.flatMap((n, k) => {
      const shop = n.price.slice(5)
      const named = (zh, en) => (shop ? T(`${zh} ${shop}`, `${en} ${shop}`) : T(zh, en))
      return [
        { of: `sold${shop}`, label: named('卖出', 'Sold'), shape: 'ticks', got: of(k, 'sold') },
        { of: `left${shop}`, label: named('剩下', 'Left'), shape: 'ticks', got: of(k, 'left') },
        { of: `short${shop}`, label: named('没买到', 'Turned away'), shape: 'ticks', got: of(k, 'short') },
      ]
    }),
    { of: 'earned', label: T('累计收入'), shape: 'ticks', got: earned.map((_, k) => sum(earned.slice(0, k + 1))) },
  ]
}
