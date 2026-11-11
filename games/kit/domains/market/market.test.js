// node --test (npm test, from trace-viewer) — the market domain: a street's trade, a board run against a street that
// answers it, and the domain's starter game.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { readContent } from '../../engine/content-node.js'
import domain from './domain.js'
import { runLevel } from './run.js'
import { demand, portsOf, trade } from './world.js'

const SHOP = { stock: 20, top: 60, slope: 2, open: 10 }

test('a shop sells what is wanted up to its stock; the rest is left, and those it cannot serve go without', () => {
  assert.equal(demand(SHOP, 0, 20), 20)
  assert.deepEqual(trade(SHOP, 0, 20), { price: 20, sold: 20, left: 0, short: 0, earned: 400 })
  assert.deepEqual(trade(SHOP, 0, 10), { price: 10, sold: 20, left: 0, short: 20, earned: 200 })
  assert.deepEqual(trade(SHOP, 0, 25), { price: 25, sold: 10, left: 10, short: 0, earned: 250 })
  assert.deepEqual(trade(SHOP, 0, 40), { price: 40, sold: 0, left: 20, short: 0, earned: 0 }, 'nobody buys: never fewer than none')
  assert.deepEqual(trade(SHOP, 0, null), { price: null, sold: 0, left: 20, short: 0, earned: 0 }, 'no price: the shop stays shut')
  assert.equal(demand({ ...SHOP, shifts: [{ at: 5, top: 80 }] }, 4, 20), 20)
  assert.equal(demand({ ...SHOP, shifts: [{ at: 5, top: 80 }] }, 5, 20), 40, 'a shift holds from its tick on')
  assert.deepEqual(portsOf(1), [{ was: 'was', left: 'left', short: 'short', price: 'price' }])
  assert.deepEqual(portsOf(2).map((p) => p.price), ['price1', 'price2'])
})

const content = readContent('starter', resolve(import.meta.dirname))
const circuit = domain.spec(content).circuit
const task = (level) => circuit.played.get(level)[0]

test('a row passes when every output is the number asked for, and says which is not', () => {
  const adjust = task('adjust')
  const on = (tests) => runLevel({ ...adjust, tests }, adjust.solution, circuit.forTask(adjust).partOf).runs[0]
  assert.equal(on([{ in: { was: 10, left: 0, short: 20 }, out: { price: 15 } }]).fail, undefined)
  const wrong = on([{ in: { was: 10, left: 0, short: 20 }, out: { price: 16 } }])
  assert.deepEqual(wrong.fail, { name: 'price', want: 16, got: 15 })
  assert.match(wrong.said.zh, /应当是 16/)
})

test('a board reads what its price did only the tick after, and a street passes when every shop has cleared on its last tick', () => {
  const street = task('street')
  const on = (ticks) => runLevel({ ...street, tests: [{ shops: [SHOP], ticks }] }, street.solution, circuit.forTask(street).partOf).runs[0]
  const run = on(20)
  assert.deepEqual(run.ticks[0].read, { was: 10, left: 0, short: 0 }, 'nothing has happened before the first tick')
  assert.deepEqual(run.ticks[1].read, { was: run.ticks[0].trades[0].price, left: run.ticks[0].trades[0].left, short: run.ticks[0].trades[0].short })
  assert.ok(Math.abs(run.ticks.at(-1).trades[0].price - 20) < 0.001, 'the rule settles where the stock just sells')
  assert.equal(run.fail, undefined)
  const early = on(2)
  assert.equal(early.fail.name, 'price')
  assert.match(early.said.zh, /都要不到 1/)
})
