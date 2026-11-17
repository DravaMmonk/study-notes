import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defineCourse, holds } from '../../core/index.js'
import { partReferences } from '../../core/index.js'

test('a task resolves the available reference and prefers a passing work', () => {
  const levels = ['first', 'upgrade', 'reader'].map((id) => ({ id }))
  const first = { id: 'first', task: 0, taskId: 'first' }
  const upgraded = { id: 'upgrade', task: 1, taskId: 'upgrade-b' }
  const passed = new Set()
  const references = partReferences([
    { type: 'tool', form: 'one', task: first },
    { type: 'tool', form: 'one', task: upgraded },
    { type: 'tool', form: 'two', task: upgraded },
  ], { before: (a, b) => course.before(a, b), passed: (task) => passed.has(task.taskId) })
  const course = defineCourse({
    levels, primitives: ['tool'], adds: () => ['tool'], needs: () => null, builds: () => [], references,
  })
  const atUpgrade = holds(course, { id: 'upgrade', task: 0 }, new Set())
  const reader = holds(course, { id: 'reader', task: 0 }, new Set())
  assert.deepEqual(atUpgrade.forms('tool'), ['one'])
  assert.equal(atUpgrade.inside('tool', 'one').task, first)
  assert.deepEqual(reader.forms('tool'), ['one', 'two'])
  assert.equal(reader.inside('tool', 'one').task, upgraded)
  passed.add(first.taskId)
  assert.equal(reader.inside('tool', 'one').task, first)
  assert.equal(reader.inside('tool', 'one', { reference: true }).task, upgraded)
  passed.add(upgraded.taskId)
  assert.equal(reader.inside('tool', 'one').task, upgraded)
  assert.equal(atUpgrade.inside('tool', 'two', { strict: true }), null)
})
