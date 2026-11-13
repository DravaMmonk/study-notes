// Running a market board on a test. What decides a pass is all in front of the player before the first card is placed
// (games/DIRECTION.md decision 19): a test is one of
//
//   a row      { in: { card: number }, out: { card: number } }   the board run once on the numbers given; every output
//                                                                 has to be the number asked for
//   a street   { shops: [shop], ticks }   a world that answers the board (../../engine/ticks.js reacting, world.js):
//              every tick the board reads each shop's price, what it had left and how many it turned away the tick
//              before, and gives each shop a price; on the last tick every shop has to have cleared
//   a question { given: { card: number }, answer: { card: number } }   a row whose answer the player works out: the
//              results show what the board gives and never what is asked for (the board is constants: one question a
//              task)
//   a break    { breaks: task id, ticks, open }   the player's board gives a street (stock, top, slope), and that
//              task's naive answer walks it: found when its answer clears the street and the naive one does not
//
// The three are one board played three ways (games/DIRECTION.md decision 22): given the cases and what comes of them,
// build what does it (a row, a street); given it and a case, say what comes of it (a question); given it and what is
// claimed of it, find the case where it fails (a break).
//
// task   { inputs: [{ name, label }], outputs: [{ name, label }] }   a row's cards, or a street's (world.js portsOf)
//
// runLevel(task, circuit, parts) → { runs, pass }, a run a test: a row's { values, errors, outputs, trace, fail?,
//   said? } (a board run once, ../../engine/boards.js), a street's { ticks: [{ tick, values, errors, outputs, trace,
//   read, trades }], fail?, said? }
// once(task) → whether the task's tests are rows or a question
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

/** A row, or a question (its numbers `given`, its `answer` kept from the player): the board run once on the numbers
 * given, every output the number asked for. A question says which output is off, never by how much. */
function runRow(task, circuit, test, parts) {
  const [given, wanted] = test.given ? [{}, test.answer] : [test.in, test.out]
  const run = runTraced(circuit, parts, given)
  const out = task.outputs.find((o) => !same(run.outputs[o.name], wanted[o.name]))
  if (!out) return run
  const [want, got] = [wanted[out.name], run.outputs[out.name] ?? null]
  const said = test.given
    ? T(`「${label(out, 'zh')}」不是 ${show(got)}。`, `“${label(out, 'en')}” is not ${show(got)}.`)
    : T(`「${label(out, 'zh')}」应当是 ${show(want)}，这块板给出 ${show(got)}。`, `“${label(out, 'en')}” should be ${show(want)}; the board gives ${show(got)}.`)
  return { ...run, fail: { name: out.name, ...(test.given ? {} : { want }), got }, said }
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

/** A board to break: the player's board gives a street (its stock, top and slope), and the board under test walks it.
 * The street counts when the board it is held against clears it and the one under test does not. The run is the
 * board under test's, tick by tick, the player's own cards as they stand on every tick. */
function runBreak(task, circuit, test, parts) {
  const mine = runTraced(circuit, parts, {})
  const { stock, top, slope } = mine.outputs
  const still = (trades = []) => ({ ticks: Array.from({ length: test.ticks }, (_, tick) => ({ tick, ...mine, read: {}, trades })) })
  const failed = (run, name, zh, en) => ({ ...run, fail: { name, got: mine.outputs[name] ?? null }, said: T(zh, en) })
  const unset = task.outputs.find((o) => typeof mine.outputs[o.name] !== 'number')
  if (unset) return failed(still(), unset.name, `「${label(unset, 'zh')}」还没有数。`, `“${label(unset, 'en')}” has no number yet.`)
  if (!(stock >= 1 && slope > 0 && top > 0)) return failed(still(), 'stock', '一条街要进至少 1 件货，不要钱时有人想买，涨价时想买的人变少。', 'A street stocks at least 1, has people who would buy at no price, and fewer as the price goes up.')
  const street = [{ stock, top, slope, open: test.open }]
  const suspect = test.suspect()
  const told = { street, ticks: walk(street, test.ticks, suspect.board, suspect.parts).map((t) => ({ ...t, ...mine, read: {} })) }
  if (uncleared(walk(street, test.ticks, suspect.honest, suspect.parts)) >= 0) return failed(told, 'top', '这条街连好的那块板也出清不了，不算数。', 'Not even the sound board clears this street: it does not count.')
  if (uncleared(told.ticks) < 0) return failed(told, 'top', '它在这条街上出清了。换一条。', 'It clears this street. Try another.')
  return told
}

const kinds = { street: runStreet, break: runBreak }
const kindOf = (test) => (test.shops ? 'street' : test.breaks ? 'break' : 'once')

/** Every test of a task on a board: { runs, pass }. */
export const runLevel = runTests((task, circuit, test, parts) => (kinds[kindOf(test)] ?? runRow)(task, circuit, test, parts))

/** Whether a task's tests are rows or a question: its board runs once a test. */
export const once = (task) => kindOf(task.tests[0]) === 'once'

const sum = (list) => list.reduce((n, x) => n + x, 0)

export const entries = ({ task, test, run }) => {
  if (kindOf(test) === 'once') {
    const [given, wanted] = test.given ? [{}, {}] : [test.in, test.out]
    return [
      ...(task.inputs ?? []).map((i) => ({ of: i.name, label: i.label, shape: 'scalar', given: given[i.name], shown: false })),
      ...task.outputs.map((o) => ({ of: o.name, label: o.label, shape: 'scalar', got: run.outputs[o.name] ?? null, ...(o.name in wanted ? { want: wanted[o.name], tolerance: TOLERANCE } : {}) })),
    ]
  }
  const shops = test.shops ?? run.street ?? []
  const names = portsOf(shops.length)
  if (test.breaks) {
    const of = (key) => run.ticks.map((t) => t.trades[0]?.[key] ?? null)
    return shops.length ? [
      { of: 'price', label: T('它的价格', 'Its price'), shape: 'ticks', got: of('price') },
      { of: 'left', label: T('剩下', 'Left'), shape: 'ticks', got: of('left') },
      { of: 'short', label: T('没买到', 'Turned away'), shape: 'ticks', got: of('short') },
    ] : []
  }
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
