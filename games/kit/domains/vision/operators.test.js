import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromRows, toRows } from './image.js'
import { filterImage, sampleImage } from './operators.js'
import { PARTS } from './fixture.js'
import domain from './domain.js'
import { board as cards } from './board.js'
import { runLevel } from './run.js'
import { circuit, game, level } from './fixture.js'

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

test('a filter reads outside the picture by each boundary assumption', () => {
  const source = img([[1, 2, 4]]), left = img([[1, 0, 0]])
  const at = (outside) => rows(PARTS.filter.eval({ image: source, kernel: left }, { params: { outside } }))[0][0]
  assert.deepEqual(['zero', 'clamp', 'wrap', 'reflect'].map(at), [0, 1, 4, 1])
  assert.throws(() => filterImage(source, left, { outside: 'error' }))
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

// One circuit task with a starter and a characteristic wrong program with its explanation.
const doubled = () => game({ levels: [level('D', circuit('d_double', {
  inputs: ['image'], adds: ['const', 'arithmetic'], configurations: { 'arithmetic.op': ['add', 'mul'] },
  tests: [{ inputs: { image: [[1, 2]] }, expect: { out: [[2, 4]] } }],
  hidden: [{ inputs: { image: [[3]] }, expect: { out: [[6]] } }],
  solution: ['two = const[value=2]()', 'p = arithmetic[op=mul](image,two)', 'out <- p'],
  starter: ['two = const[value=2]()'],
  naive: ['two = const[value=2]()', 'p = arithmetic[op=add](image,two)', 'out <- p'],
  naiveWhy: { zh: 'adding the gain', en: 'Adding the gain shifts brightness instead of scaling it.' },
}))] })

test('starters leave real decisions and wrong methods explain observed visual causes', () => {
  const content = doubled()
  const { circuit: vision } = domain.spec(content)
  assert.deepEqual(domain.validate(domain.spec(content)).filter((r) => r.fail), [])
  const task = vision.played.get('D')[0], all = { ...task, tests: [...task.tests, ...task.hidden] }
  const board = cards.startBoard(task)
  assert.equal(runLevel(task, board, vision.partOf).pass, false)
  board.nodes[0].params.name = 'changed'
  board.wires.push({ from: 'image', to: 'out', port: 'in' })
  assert.notEqual(task.starter.nodes[0].params.name, 'changed', 'each opening gets its own starter')
  assert.equal(cards.startBoard(task).wires.length, task.starter.wires.length)
  const naive = runLevel(all, task.naive, vision.partOf)
  assert.ok(naive.runs.some((r) => r.fail?.why.en.includes(task.naiveWhy.en)))
  const other = cards.fromText(['out <- image'], task, vision)
  assert.ok(runLevel(all, other, vision.partOf).runs.every((r) => !r.fail?.why.en.includes(task.naiveWhy.en)), 'another mistake keeps its own mismatch')
  content.levels[0].tasks[0].starter = content.levels[0].tasks[0].solution
  assert.ok(domain.validate(domain.spec(content)).some((r) => r.fail && r.text.includes('the board it opens on passes')))
})

test('malformed starter blueprints are reported as content errors without crashing validation', () => {
  const content = doubled()
  content.levels[0].tasks[0].starter = ['p = unknownOperator()']
  const spec = domain.spec(content)
  assert.ok(spec.circuit.wrong.some((s) => s.includes('the starter')))
  assert.ok(domain.validate(spec).some((result) => result.fail))
})
