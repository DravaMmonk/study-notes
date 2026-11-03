import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculationAt, calculationResult } from './calculation.js'
import { readContent } from '../../engine/content-node.js'
import domain from './domain.js'

test('nearest arithmetic distinguishes midpoint selection from finite-image clamping', () => {
  const task = { image: [[10, 20, 30]], calculation: { kind: 'sampling', method: 'nearest', xs: [[-0.6, -0.5, 0.49, 0.5, 2.8]], ys: [[0, 0, 0, 0, 0]] } }
  assert.deepEqual(calculationResult(task), [[10, 10, 10, 20, 30]])
  const outside = calculationAt(task, 0, 0)
  assert.deepEqual(outside.nearest, [-1, 0])
  assert.equal(outside.terms[0].cx, 0)
  assert.equal(outside.terms[0].outside, true)
  const tie = calculationAt(task, 3, 0)
  assert.equal(tie.distances[0].left, tie.distances[0].right)
  assert.equal(tie.nearest[0], 1)
})

test('bilinear arithmetic preserves RGB channels, unit weight and clamped boundaries', () => {
  const task = { image: [[[1, 0, 0], [0, 0, 1]]], calculation: { kind: 'sampling', method: 'bilinear', xs: [[-0.25, 0.25, 0.5, 0.75, 1.25]], ys: [[0, 0, 0, 0, 0]] } }
  assert.deepEqual(calculationResult(task), [[[1, 0, 0], [0.75, 0, 0.25], [0.5, 0, 0.5], [0.25, 0, 0.75], [0, 0, 1]]])
  for (let x = 0; x < 5; x++) assert.equal(calculationAt(task, x, 0).terms.reduce((sum, t) => sum + t.weight, 0), 1)
})

test('calculation aids remain independent of expected answers', () => {
  const task = { image: [[0, 4]], calculation: { kind: 'sampling', method: 'bilinear', xs: [[0.25, 0.75]], ys: [[0, 0]] }, ask: { fill: { rows: [[999]] } } }
  assert.deepEqual(calculationResult(task), [[1, 3]])
})

test('misleading or malformed calculation observations block content validation', () => {
  const content = readContent('vision-lab')
  const task = { id: 'observation', kind: 'grid', image: [[0, 4]], calculation: { kind: 'sampling', method: 'bilinear', xs: [[0.5]], ys: [[0]] }, ask: { fill: { rows: [[1]] } } }
  content.levels.find((l) => l.id === '0-1').tasks.unshift(task)
  assert.ok(domain.spec(content).vision.wrong.some((s) => s.includes('calculation aid does not produce')))
  task.calculation.ys = [[0, 0]]
  assert.ok(domain.spec(content).vision.wrong.some((s) => s.includes('matching rectangular shapes')))
})
