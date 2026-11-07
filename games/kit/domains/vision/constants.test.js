import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FIXTURE_PARTS, PARTS, circuit, game, level } from './fixture.js'
import { defineParts, shows } from '../../engine/parts/define.js'
import { OPS } from './ops.js'
import { fromRows, toRows } from './image.js'
import domain from './domain.js'
import { play } from './play.js'
import { taskBoard } from './tooling.js'

const defined = defineParts(FIXTURE_PARTS, OPS)
const value = (type, params = {}) => PARTS[type].eval({}, { params })

test('each kind of value is its own part with one output', () => {
  assert.equal(value('const', { value: '-3.5' }), -3.5)
  assert.equal(value('const'), 0)
  assert.deepEqual(['right', 'left', 'up', 'down'].map((way) => value('direction', { way })), [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }])
  assert.deepEqual(toRows(value('weights')), [[0, 1, 0]])
  assert.deepEqual(toRows(value('weights', { first: 1, centre: 2, last: 1, divide: 4 })), [[0.25, 0.5, 0.25]])
  assert.deepEqual(toRows(value('kernel')), [[0, 0, 0], [0, 1, 0], [0, 0, 0]])
  assert.deepEqual(toRows(value('kernel', { k1: 1, k2: 2, k3: 1, k4: 2, k5: 4, k6: 2, k7: 1, k8: 2, k9: 1, divide: 16 }))[1], [0.125, 0.25, 0.125])
  for (const type of ['const', 'direction', 'weights', 'kernel']) assert.equal(PARTS[type].outputs, undefined)
  assert.throws(() => value('weights', { first: 1, centre: NaN, last: 1 }))
  assert.throws(() => value('kernel', { divide: 0 }))
})

test('a kernel’s weights are laid out where its neighbours are, its divisor below them', () => {
  const card = defined.defs.kernel.views.card
  assert.deepEqual(card.slice(0, 3).map((row) => row.blocks.map((b) => b.key)), [['k1', 'k2', 'k3'], ['k4', 'k5', 'k6'], ['k7', 'k8', 'k9']])
  assert.equal(card[3].key, 'divide')
})

test('constant directions and weights wire straight into the weighted-line preset', () => {
  const source = circuit('fixed_line', {
    inputs: ['image'], adds: ['direction', 'weights', 'weightedLine'],
    configurations: { 'direction.way': ['right'], '*.outside': ['zero'] },
    solution: ['d = direction[way=right]()', 'w = weights[first=1,centre=0,last=-1]()', 'p = weightedLine(image,w,d)', 'out <- p'],
    tests: [{ inputs: { image: [[2, 5, 9]] }, expect: { out: [[-5, -7, 5]] } }],
  })
  const v = domain.spec(game({ levels: [level('C', source)] })).circuit
  const task = v.played.get('C')[0]
  const ctx = { game: { circuit: v }, level: { source: task }, flags: new Set(), progress: { built: {} }, solved: false }
  assert.equal(play.attempt(ctx, source.solution.join('\n')).pass, true)
  const result = PARTS.weightedLine.eval({ image: fromRows([[2, 5, 9]]), weights: value('weights', { first: 1, centre: 2, last: 1 }), d: value('direction', { way: 'right' }) }, {})
  assert.deepEqual(toRows(result), [[9, 21, 23]])
})

test('a value part comes in with the task that adds it, and restored boards keep to the options offered', () => {
  const tasks = [
    circuit('scalar_use', { inputs: [], adds: ['const', 'arithmetic'], configurations: { 'arithmetic.op': ['add'] }, solution: ['c = const[value=2]()', 'out <- c'], tests: [{ inputs: {}, expect: { out: 2 } }] }),
    circuit('direction_use', { inputs: [], adds: ['direction'], configurations: { 'arithmetic.op': ['mul'], 'direction.way': ['right', 'down'] }, solution: ['c = direction[way=right]()', 'out <- c'], tests: [{ inputs: {}, expect: { out: { x: 1, y: 0 } } }] }),
  ]
  const v = domain.spec(game({ levels: [level('V', tasks)] })).circuit
  const [scalar, direction] = v.played.get('V')
  const context = (source) => ({ game: { circuit: v }, level: { source }, flags: new Set(), progress: { built: {}, all: true }, solved: false })
  assert.equal(play.attempt(context(scalar), tasks[1].solution.join('\n')).pass, false)
  assert.equal(play.attempt(context(direction), tasks[1].solution.join('\n')).pass, true)
  assert.deepEqual(v.settingsIn(scalar, 'arithmetic', 'op'), ['add'])
  const saved = { nodes: [{ id: 'a', type: 'arithmetic', params: { op: 'mul' } }], wires: [] }
  const restored = taskBoard(saved, new Set(['arithmetic']), (type, key) => v.settingsIn(scalar, type, key), v.partOf)
  assert.equal(restored.nodes[0].params.op, 'add')
  assert.equal(saved.nodes[0].params.op, 'mul')
})
