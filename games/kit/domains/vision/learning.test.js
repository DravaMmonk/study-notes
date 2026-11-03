import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { pinhole, pinholeView } from './benches/pinhole.js'
import { filterWindow } from './filter-window.js'
import { lessonProblems } from './benches/lesson.js'
import domain from './domain.js'

const trial = () => readContent('vision-lab')

test('required routes are independent until joins, and the final processor calls both branches', () => {
  const content = trial()
  const { course, vision } = domain.spec(content)
  const before = (a, b) => Boolean(course.before(a, b))
  for (const [a, b] of [['1A1', '1A4'], ['2B3', '2B4'], ['2B6', '2B7'], ['2B6', '2B8']]) {
    assert.equal(before(a, b), false)
    assert.equal(before(b, a), false)
  }
  assert.equal(before('1F1', '1A3'), false, 'optional field-of-view work does not block the main path')
  for (const a of ['1A2', '1A4']) assert.equal(before(a, '1A3'), true)
  for (const a of ['2B3', '2B4']) assert.equal(before(a, '2B5'), true)
  for (const a of ['2B6', '2B8']) assert.equal(before(a, '2B9'), true)
  const finale = content.levels.find((l) => l.id === '2B9').tasks[0]
  assert.ok(finale.solution.some((line) => line.includes('blur(')))
  assert.ok(finale.solution.some((line) => line.includes('edgeStrength(')))
  assert.deepEqual(finale.outputs.map((o) => o.name), ['out', 'mag'])
  assert.equal(vision.wrong.length, 0)
})

test('prediction comparisons isolate X, Z and f and reject the starting and naive answers', () => {
  const task = trial().levels.find((l) => l.id === '1A1').tasks[0]
  const model = pinhole.make(task.bench.setup)
  assert.deepEqual(lessonProblems(task, model.view), [])
  const q = task.bench.setup.reference
  assert.equal(model.view({ ...q, X: 4, guess: 2 }).predictionError, 0)
  assert.equal(model.view({ ...q, Z: 8, guess: 0.5 }).predictionError, 0)
  assert.equal(model.view({ ...q, f: 4, guess: 2 }).predictionError, 0)
  assert.notEqual(model.view({ ...q, Z: 8, guess: 1 }).predictionError, 0)
  assert.equal(pinhole.verify(pinhole.make({ predict: 'u' }), { knobs: {} }), 'a prediction needs a guess knob')
})

test('pixel conversion uses the chosen axis pitch and keeps signed offset distinct from column', () => {
  const setup = { axis: 'horizontal', sensor: { width: 8, height: 10, pxWidth: 16, pxHeight: 100 }, predict: 'column' }
  const q = pinholeView(setup, { X: -1, Z: 4, f: 2, guess: 6.5 })
  assert.equal(q.pitch, 0.5)
  assert.equal(q.u_px, -1)
  assert.equal(q.centre, 7.5)
  assert.equal(q.column, 6.5)
  assert.equal(q.predictionError, 0)
  const v = pinholeView({ ...setup, axis: 'vertical' }, { X: -1, Z: 4, f: 2, guess: 44.5 })
  assert.equal(v.pitch, 0.1)
  assert.equal(v.u_px, -5)
  assert.equal(v.predictionError, 0)
  assert.equal(q.fov, v.fov, 'vertical FOV does not change when the coordinate axis changes')
  assert.equal(q.fovW, v.fovW)
})

test('the neighbourhood aid reads positional weights and zero padding along the requested axis', () => {
  const rows = [[1, 3], [4, 0], [2, 8]]
  const vertical = filterWindow(rows, { weights: [1, 0, -1], axis: 'column' }, 1, 1)
  assert.deepEqual(vertical.map((f) => [f.x, f.y, f.value, f.weight]), [[1, 0, 3, 1], [1, 1, 0, 0], [1, 2, 8, -1]])
  const edge = filterWindow(rows, { weights: [1, 2, 3], axis: 'row' }, 0, 0)
  assert.deepEqual(edge.map((f) => [f.value, f.outside]), [[0, true], [1, false], [3, false]])
})

test('save invalidation preserves copy changes but drops answers whose output contract changed', () => {
  const level = trial().levels.find((l) => l.id === '2B9')
  const copy = structuredClone(level)
  copy.intro = [{ t: 'Different wording' }]
  assert.equal(domain.changes.stale(level, copy), false)
  copy.tasks[0].outputs.pop()
  assert.equal(domain.changes.stale(level, copy), true)
  const program = structuredClone(level)
  program.tasks[0].solution = ['out <- image']
  assert.equal(domain.changes.stale(level, program), true, 'changed reference semantics invalidate built parts too')
})

test('a teaching window with misleading weights is rejected instead of teaching a different answer', () => {
  const content = trial()
  content.levels.find((l) => l.id === '2B1').tasks[0].window.weights = [1, 0, 1]
  assert.ok(domain.spec(content).vision.wrong.some((s) => s.includes('window weights do not produce')))
})
