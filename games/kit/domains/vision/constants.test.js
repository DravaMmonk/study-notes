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
const run = (params) => PARTS.const.eval({}, { params })

test('scalar constants keep their saved values while vectors use one output', () => {
  assert.equal(run({ value: '-3.5' }), -3.5)
  assert.equal(run({}), 0)
  assert.deepEqual(run({ kind: 'direction', x: -2, y: 3 }), { x: -2, y: 3 })
  assert.deepEqual(toRows(run({ kind: 'weights', first: .25, centre: .5, last: .25 })), [[.25, .5, .25]])
  assert.equal(PARTS.const.outputs, undefined)
  assert.throws(() => run({ kind: 'direction', x: Infinity, y: 0 }))
  assert.throws(() => run({ kind: 'weights', first: 1, centre: NaN, last: 1 }))
})

test('only fields belonging to the chosen constant type are visible', () => {
  const def = defined.defs.const
  const visible = (kind) => def.settings.filter(s => shows(s, def, { kind }, OPS)).map(s => s.key)
  assert.deepEqual(visible('scalar'), ['kind', 'value'])
  assert.deepEqual(visible('direction'), ['kind', 'x', 'y'])
  assert.deepEqual(visible('weights'), ['kind', 'first', 'centre', 'last'])
})

test('constant directions and weights wire straight into the weighted-line preset', () => {
  const source = circuit('fixed_line', {
    inputs: ['image'], adds: ['const', 'weightedLine'],
    configurations: { 'const.kind': ['scalar', 'direction', 'weights'], '*.outside': ['zero'] },
    solution: ['d = const[kind=direction,x=1,y=0]()', 'w = const[kind=weights,first=1,centre=0,last=-1]()', 'p = weightedLine(image,w,d)', 'out <- p'],
    tests: [{ inputs: { image: [[2, 5, 9]] }, expect: { out: [[-5, -7, 5]] } }],
  })
  const v = domain.spec(game({ levels: [level('C', source)] })).circuit
  const task = v.played.get('C')[0]
  const ctx = { game: { circuit: v }, level: { source: task }, flags: new Set(), progress: { built: {} }, solved: false }
  assert.equal(play.attempt(ctx, source.solution.join('\n')).pass, true)
  const weights = run({ kind: 'weights', first: 1, centre: 2, last: 1 })
  const result = PARTS.weightedLine.eval({ image: fromRows([[2, 5, 9]]), weights, d: run({ kind: 'direction', x: 1, y: 0 }) }, {})
  assert.deepEqual(toRows(result), [[9, 21, 23]])
})

test('constant vector types unlock only on their introducing task and restored boards follow the same policy', () => {
  const tasks = [
    circuit('scalar_use', { inputs: [], adds: ['const'], configurations: { 'const.kind': ['scalar'] }, solution: ['c = const[value=2]()', 'out <- c'], tests: [{ inputs: {}, expect: { out: 2 } }] }),
    circuit('direction_use', { inputs: [], configurations: { 'const.kind': ['direction'] }, solution: ['c = const[kind=direction,x=1,y=0]()', 'out <- c'], tests: [{ inputs: {}, expect: { out: { x: 1, y: 0 } } }] }),
    circuit('weights_use', { inputs: [], configurations: { 'const.kind': ['weights'] }, solution: ['c = const[kind=weights,first=1,centre=2,last=1]()', 'out <- c'], tests: [{ inputs: {}, expect: { out: [[1, 2, 1]] } }] }),
  ]
  const v = domain.spec(game({ levels: [level('V', tasks)] })).circuit
  const [scalar, direction, weights] = v.played.get('V')
  assert.deepEqual(v.settingsIn(scalar, 'const', 'kind'), ['scalar'])
  assert.deepEqual(v.settingsIn(direction, 'const', 'kind'), ['scalar', 'direction'])
  assert.deepEqual(v.settingsIn(weights, 'const', 'kind'), ['scalar', 'direction', 'weights'])
  const context = (source) => ({ game: { circuit: v }, level: { source }, flags: new Set(), progress: { built: {}, all: true }, solved: false })
  assert.equal(play.attempt(context(scalar), tasks[1].solution.join('\n')).pass, false)
  assert.equal(play.attempt(context(direction), tasks[2].solution.join('\n')).pass, false)
  assert.equal(play.attempt(context(direction), tasks[1].solution.join('\n')).pass, true)
  assert.equal(play.attempt(context(weights), tasks[2].solution.join('\n')).pass, true)
  const saved = { nodes: [{ id: 'c', type: 'const', params: { kind: 'weights', value: 7 } }], wires: [] }
  const restored = taskBoard(saved, new Set(['const']), (type, key) => v.settingsIn(scalar, type, key), v.partOf)
  assert.equal(restored.nodes[0].params.kind, 'scalar')
  assert.equal(restored.nodes[0].params.value, 7)
  assert.equal(saved.nodes[0].params.kind, 'weights')
})
