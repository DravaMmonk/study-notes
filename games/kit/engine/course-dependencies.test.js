import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defineCourse, holds, usable } from '../../../packages/circuit/core/index.js'
import { courseDependencies, courseLayout, projectDependencyProblems } from './course-dependencies.js'

const parts = { shift: { settings: { border: { control: 'select', options: [{ value: 'edge' }] } }, stages: [{ id: 'shift-wrap', settings: { border: { options: [{ value: 'edge' }, { value: 'wrap' }] } } }] }, adder: { stages: [{ id: 'adder-wide' }] } }
const course = (id, levels, entries, links = []) => ({ id, levels, partDefs: { parts: parts }, eras: [{ id: 0, levels: entries, links }] })
const inspect = (id, solution, hints = {}) => ({ id, ...hints, tasks: [{ id: `${id}Task`, solution, ...hints.task }] })

test('package prerequisites upgrade an optional authored edge and reject a missing binding', () => {
  const c = course('world', [{ id: 'a' }, { id: 'b', requires: ['a'] }],
    [{ id: 'a', optional: true, skippable: true }, { id: 'b' }], [{ from: 'a', to: 'b' }])
  assert.deepEqual(courseLayout(c).requires.get('b'), ['a'])
  assert.deepEqual(courseLayout(c).required.get('b'), ['a'])
  c.eras[0].levels.shift()
  c.eras[0].links.length = 0
  assert.match(courseDependencies(c).problems[0].says, /place the prerequisite a/)
})

test('a unique reference award adds a strict gate and explains it', () => {
  const levels = [
    inspect('a', [], { task: { opens: ['shift-wrap'] } }),
    inspect('b', ['s = shift[border=wrap](in)']),
  ]
  const c = course('world', levels, [{ id: 'a', optional: true }, { id: 'b' }])
  assert.deepEqual(courseDependencies(c).links, [
    { from: 'a', to: 'b', required: true, source: 'reference', detail: 'bTask: shift-wrap' },
  ])
  assert.deepEqual(courseLayout(c).required.get('b'), ['a'])
  levels[0].tasks[0].optional = true
  assert.match(courseDependencies(c).problems[0].says, /provider can be skipped/)
})

test('an already guaranteed provider wins over an alternative source', () => {
  const a = inspect('a', [], { task: { publishes: [{ part: 'adder', variant: 'simple' }] } })
  const b = inspect('b', ['x = adder()'])
  const c = inspect('c', [], { task: { publishes: [{ part: 'adder', variant: 'complete' }] } })
  const all = course('world', [a, b, c], [{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ from: 'a', to: 'b' }])
  assert.equal(courseDependencies(all).links.length, 1)
  all.eras[0].links.length = 0
  assert.match(courseDependencies(all).problems[0].says, /choose a prerequisite/)
})

test('an option can first be used on the task that opens it', () => {
  const level = { id: 'a', tasks: [
    { id: 'early', solution: ['s = shift[border=wrap](in)'] },
    { id: 'later', solution: ['s = shift[border=wrap](in)'], opens: ['shift-wrap'] },
  ] }
  const c = course('world', [level], [{ id: 'a' }])
  const { links, problems } = courseDependencies(c)
  assert.deepEqual(links, [])
  assert.equal(problems.length, 1)
  assert.match(problems[0].says, /before any task in this level awards it/)
})

test('cross-game pass provides shared package awards and carries through skipped optional levels', () => {
  const a = inspect('a', [], { task: { publishes: [{ part: 'adder', variant: 'simple' }], opens: ['adder-wide'] } })
  const source = course('source', [a], [{ id: 'a' }])
  const receiving = course('target', [a, { id: 'b', requires: ['a'] }, { id: 'c' }],
    [{ id: 'b', optional: true, skippable: true }, { id: 'c' }], [{ fromGame: 'source', from: 'a', to: 'b' }, { from: 'b', to: 'c' }])
  const plan = courseLayout(receiving)
  assert.deepEqual(plan.external.get('c'), [{ game: 'source', level: 'a' }])
  assert.deepEqual([...plan.externalItems.get('c')], ['adder-wide', 'adder'])
  const c = { id: 'c' }
  const options = { plan, parts, levels: [{ id: 'b' }, c], primitives: [], adds: () => [], builds: () => [], needs: (part) => part === 'adder' ? part : null }
  const resolved = defineCourse(options)
  assert.deepEqual(usable(resolved, c, new Set()), ['adder'])
  assert.equal(holds(resolved, c, new Set())('adder-wide'), true)
  assert.deepEqual(projectDependencyProblems([receiving, source]), [])
  assert.match(projectDependencyProblems([receiving, source], new Map([['source', 'one'], ['target', 'two']]))[0].says, /another content package/)
})

test('project checks a cycle crossing games and points out bad sources', () => {
  const a = course('a', [{ id: 'early' }, { id: 'late' }], [{ id: 'early' }, { id: 'late' }],
    [{ fromGame: 'b', from: 'mid', to: 'late' }])
  const b = course('b', [{ id: 'mid' }], [{ id: 'mid' }], [{ fromGame: 'a', from: 'early', to: 'mid' }])
  assert.deepEqual(projectDependencyProblems([a, b]), [])
  b.eras[0].links[0].from = 'late'
  assert.match(projectDependencyProblems([a, b])[0].says, /a:late.+b:mid.+a:late/)
  b.eras[0].links[0].from = 'missing'
  assert.match(projectDependencyProblems([a, b])[0].says, /a:missing is not on its game's course/)
})
