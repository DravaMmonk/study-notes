// Running a market board on a test. What decides a pass is all in front of the player before the first card is placed
// (games/DIRECTION.md decision 19): a test is one of
//
//   a row      { in: { card: number }, out: { card: number } }   the board run once on the numbers given; every output
//                                                                 has to be the number asked for
//   a street   { shops: [shop], ticks }   a world that answers the board (../../engine/ticks.js reacting, world.js):
//              every tick the board reads each shop's price, what it had left and how many it turned away the tick
//              before, and gives each shop a price; on the last tick every shop has to have cleared
//
// task   { inputs: [{ name, label }], outputs: [{ name, label }], most? }   a row's cards, or a street's (world.js
//        portsOf); `most` the parts its board may hold: a task that opens on a board to mend (its `starter`) says how
//        much may be added to it, and a board over that fails every test
//
// runLevel(task, circuit, parts) → { runs, pass }, a run a test: a row's { values, errors, outputs, trace, fail?,
//   said? } (a board run once, ../../engine/boards.js), a street's { ticks: [{ tick, values, errors, outputs, trace,
//   read, trades }], fail?, said? }
// once(task) → whether the task's tests are rows
// check(task, row) → { test } | { why }   a row the player wrote as a check, when the task gives works to catch
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

/** A board's ticks on a street: every tick it gives each shop its price and reads the tick after what came of it. */
function walk(shops, count, circuit, parts) {
  const names = portsOf(shops.length)
  const read = []
  const world = reacting({
    board: 'you',
    start: shops.map((shop) => ({ was: shop.open, left: 0, short: 0 })),
    reads: (state) => Object.fromEntries(state.flatMap((s, k) => [[names[k].was, s.was], [names[k].left, s.left], [names[k].short, s.short]])),
    step: (state, outputs, tick) => {
      const trades = shops.map((shop, k) => trade(shop, tick, outputs[names[k].price]))
      return { state: trades.map((t, k) => ({ was: t.price ?? state[k].was, left: t.left, short: t.short })), shown: trades }
    },
  })
  const bind = (tick) => (read[tick] ??= world.bind(tick))
  const run = runTicks({ nodes: [boardNode({ id: 'you', circuit, parts, bind, traced: true }), world.node], ticks: count, line: () => null })
  return run.steps.map((step) => ({ tick: step.tick, ...step.heard.you, read: read[step.tick], trades: step.heard.world }))
}

/** The first shop that has not cleared on a run's last tick (a price given, less than one left, less than one turned
 * away), or -1. */
const uncleared = (ticks) => ticks.at(-1).trades.findIndex((t) => t.price === null || t.left >= 1 || t.short >= 1)

/** A street: on the last tick every shop has to have cleared. */
function runStreet(task, circuit, test, parts) {
  const ticks = walk(test.shops, test.ticks, circuit, parts)
  const k = uncleared(ticks)
  if (k < 0) return { ticks }
  const { left, short } = ticks.at(-1).trades[k]
  const name = portsOf(test.shops.length)[k].price
  const shop = name.slice(5)
  return { ticks, fail: { name, want: 0, got: left || short }, said: T(`最后一天${shop ? `，${shop} 号店` : ''}剩下 ${show(left)}，没买到 ${show(short)}：两边都要不到 1。`, `On the last day${shop ? ` shop ${shop}` : ''} had ${show(left)} left and turned ${show(short)} away: both have to be under 1.`) }
}

/** How many parts a board holds: its nodes but the task's own cards. */
const held = (circuit, parts) => circuit.nodes.filter((node) => { const part = parts(node.type); return part && !part.source && !part.sink }).length

/** Every test of a task on a board: { runs, pass }. A board holding more parts than the task allows fails each. */
export const runLevel = runTests((task, circuit, test, parts) => {
  const run = (test.shops ? runStreet : runRow)(task, circuit, test, parts)
  if (!task.most || held(circuit, parts) <= task.most) return run
  return { ...run, fail: { name: task.outputs[0].name, want: task.most, got: held(circuit, parts) }, said: T(`这块板最多放 ${task.most} 块元件，现在有 ${held(circuit, parts)} 块。`, `This board may hold ${task.most} parts; it holds ${held(circuit, parts)}.`) }
})

/** A row of numbers the player wrote as a check (../../shell/AuditScreen.jsx), as a test: its numbers for the task's
 * left cards given, those for its right cards asked for. A street never shows a shop both left with stock and
 * turning people away, so such a row is no check. */
export function check(task, row) {
  const of = (ports) => Object.fromEntries((ports ?? []).map((p) => [p.name, row[p.name]]))
  if (row.left > 0 && row.short > 0) return { why: T('一家店不会同一天既有货剩下、又有人没买到。', 'A shop is never left with stock and turning people away on the same day.') }
  return { test: { in: of(task.inputs), out: of(task.outputs) } }
}

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
