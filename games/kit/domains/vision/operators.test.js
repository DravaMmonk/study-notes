import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromRows, toRows } from './image.js'
import { filterImage, sampleImage } from './operators.js'
import { PARTS } from './parts.js'
import { readContent } from '../../engine/content-node.js'
import domain from './domain.js'
import { startBoard } from './board.js'
import { runLevel } from './run.js'

const rows = toRows
const img = fromRows

test('semantic sampling distinguishes labels, RGB mixtures and outside assumptions', () => {
  const positions = img([[-0.6, 0.49, 0.5, 1.6]])
  assert.deepEqual(rows(sampleImage(img([[1, 5]]), positions, 0)), [[1, 1, 5, 5]])
  assert.deepEqual(rows(sampleImage(img([[1, 5]]), positions, 0, { outside: 'zero' })), [[0, 1, 5, 0]])
  assert.deepEqual(rows(sampleImage(img([[[1, 0, 0], [0, 0, 1]]]), img([[0.25, 0.75]]), 0, { method: 'bilinear' })), [[[0.75, 0, 0.25], [0.25, 0, 0.75]]])
  assert.equal(sampleImage(img([[2, 6]]), 0.25, 0, { method: 'bilinear', outside: 'error' }), 3, 'zero-weight neighbours must not invalidate exact rows')
  assert.throws(() => sampleImage(img([[1]]), -1, 0, { outside: 'error' }))
  assert.throws(() => sampleImage(img([[1]]), img([[0, 1]]), img([[0]])))
})

test('asymmetric impulse responses expose kernel orientation while symmetric kernels agree', () => {
  const source = img([[0, 0, 1, 0, 0]]), kernel = img([[1, 2, 3]])
  assert.deepEqual(rows(filterImage(source, kernel, { outside: 'zero' })), [[0, 3, 2, 1, 0]])
  assert.deepEqual(rows(filterImage(source, kernel, { outside: 'zero', convention: 'convolution' })), [[0, 1, 2, 3, 0]])
  const symmetric = img([[0.25, 0.5, 0.25]])
  assert.deepEqual(filterImage(source, symmetric), filterImage(source, symmetric, { convention: 'convolution' }))
  assert.throws(() => filterImage(source, img([[1, 1]])))
})

test('neighbourhood axes and boundaries change the intended spatial assumption', () => {
  const source = img([[0, 0, 0], [1, 1, 1], [0, 0, 0]])
  const stencil = (params) => PARTS.stencil.eval({ image: source }, { params })
  assert.deepEqual(rows(stencil({ a: .25, b: .5, c: .25 })), rows(source))
  assert.deepEqual(rows(stencil({ axis: 'y', a: .25, b: .5, c: .25 })), [[.25, .25, .25], [.5, .5, .5], [.25, .25, .25]])
  const constant = img([[.6, .6, .6]]), kernel = img([[.25, .5, .25]])
  filterImage(constant, kernel).data.forEach((n) => assert.ok(Math.abs(n - .6) < 1e-12))
  const zero = filterImage(constant, kernel, { outside: 'zero' })
  assert.ok(Math.abs(zero.data[0] - .45) < 1e-12)
  assert.ok(Math.abs(zero.data[2] - .45) < 1e-12)
})

test('separable passes match an outer-product kernel on non-square RGB images', () => {
  const source = img([[[1, 0, .2], [0, 1, .4], [.5, .5, 1]], [[.3, .7, .2], [.9, .1, .5], [.2, .4, .6]]])
  const h = [.25, .5, .25], v = [.2, .6, .2]
  const direct = filterImage(source, img(v.map((a) => h.map((b) => a * b))))
  const passes = filterImage(filterImage(source, img([h])), img(v.map((x) => [x])))
  direct.data.forEach((n, i) => assert.ok(Math.abs(n - passes.data[i]) < 1e-12))
})

test('vector length and colour mixture preserve raw numerical meaning', () => {
  assert.equal(PARTS.magnitude.eval({ x: -3, y: 4 }), 5)
  assert.equal(PARTS.magnitude.eval({ x: 4, y: 3 }), 5)
  assert.deepEqual(rows(PARTS.colourMix.eval({ image: img([[[1, 2, 3]]]), wr: 2, wg: -1, wb: 1 })), [[3]])
  assert.throws(() => PARTS.colourMix.eval({ image: img([[1]]), wr: 1, wg: 0, wb: 0 }))
})

test('starters leave real decisions and wrong methods explain observed visual causes', () => {
  const { vision } = domain.spec(readContent('vision-lab'))
  let starters = 0, explanations = 0
  for (const tasks of vision.played.values()) for (const task of tasks) {
    if (task.kind !== 'circuit') continue
    if (task.starter) {
      const board = startBoard(task)
      assert.equal(runLevel(task, board, vision.partOf).pass, false, task.taskId)
      board.nodes[0].params.name = 'changed'
      assert.notEqual(task.starter.nodes[0].params.name, 'changed')
      starters++
    }
    if (task.naiveWhy) {
      const result = runLevel({ ...task, tests: [...task.tests, ...task.hidden] }, task.naive, vision.partOf)
      assert.ok(result.runs.some((r) => r.fail?.why.en.includes(task.naiveWhy.en)), task.taskId)
      explanations++
    }
  }
  const tasks = [...vision.played.values()].flat().filter(t=>t.kind==='circuit')
  assert.equal(starters,tasks.filter(t=>t.starter).length)
  assert.ok(starters>0)
  assert.equal(explanations,tasks.length)
})


test('malformed starter blueprints are reported as content errors without crashing validation', () => {
  const content = readContent('vision-lab')
  content.levels.find((l) => l.id === '1-1').tasks[0].starter = ['p = unknownOperator()']
  const spec = domain.spec(content)
  assert.ok(spec.vision.wrong.some((s) => s.includes('the starter')))
  assert.ok(domain.validate(spec).some((result) => result.fail))
})
