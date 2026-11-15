import { test } from 'node:test'
import assert from 'node:assert/strict'
import { eraLevels, layout } from '../course.js'
import { boardGeometry, linkKey, wiringBoard, wiringRefusal } from './arrangement.js'

test('a group filter keeps individual ports and links to external levels', () => {
  const era = {
    id: 1, levels: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
    links: [{ from: 'x', to: 'a' }, { from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'd' }, { from: 'c', to: 'd' }],
  }
  const { requires } = layout([{ id: 0, levels: [{ id: 'x' }] }, era])
  const outer = wiringBoard(eraLevels(era), [], requires, era.links)
  const inner = wiringBoard(['x', 'a', 'b', 'd'], [], requires, era.links)
  const nodes = (board) => new Map(board.rows.flat().map((node) => [node.id, node]))
  assert.equal(nodes(outer).get('x').portal, true)
  assert.equal(nodes(inner).get('x').portal, false)
  assert.equal(nodes(inner).get('c').portal, true)
  assert.deepEqual(outer.edges.map(linkKey), era.links.map(linkKey))
  assert.deepEqual(inner.edges.map(linkKey), era.links.map(linkKey))
  const { cards, ports } = boardGeometry(inner.rows, 500)
  for (const { id, x, y, width, height } of cards) {
    assert.deepEqual(ports.get(id), { input: { x: x + width / 2, y }, output: { x: x + width / 2, y: y + height } })
  }
  const moved = boardGeometry(inner.rows, 500, new Map([['a', { x: 68, y: 100 }]]))
  assert.deepEqual(moved.ports.get('a'), { input: { x: 158, y: 100 }, output: { x: 158, y: 144 } })
  assert.equal(wiringBoard(['x', 'a', 'b', 'd'], [], requires, era.links).edges.length, inner.edges.length)
  assert.equal(wiringRefusal(requires, 'd', 'x'), 'cycle')
  assert.equal(wiringRefusal(requires, 'x', 'a'), 'duplicate')
  assert.equal(wiringRefusal(requires, 'a', 'a'), 'self')
  assert.equal(wiringRefusal(requires, 'x', 'd'), null)
})
