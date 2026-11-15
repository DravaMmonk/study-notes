import assert from 'node:assert/strict'
import { test } from 'node:test'
import { failedOutputTests, hiddenOutputTests, visibleOutputTests } from './output-play.js'

test('a live preview conceals hidden output tests until completion', () => {
  const task = { tests: [{ label: 'example' }], hidden: [{ label: 'held back' }] }
  const checks = { hidden: 'afterPass' }
  assert.deepEqual(visibleOutputTests(task, false, checks).tests, [{ label: 'example' }])
  assert.equal(hiddenOutputTests(task, false, checks), task.hidden)
  assert.deepEqual(visibleOutputTests(task, true, checks).tests, [
    { label: 'example' }, { label: 'held back', hidden: true },
  ])
  assert.deepEqual(hiddenOutputTests(task, true, checks), [])
  assert.deepEqual(task.hidden, [{ label: 'held back' }])
})

test('the hidden-test run counts failures among only the concealed examples', () => {
  const task = { tests: [1], hidden: [2, 3] }
  const checks = { hidden: 'afterPass' }
  const run = ({ tests }, value) => ({ results: tests.map((expected) => ({ pass: expected === value })) })
  assert.equal(failedOutputTests(run, task, 2, hiddenOutputTests(task, false, checks)), 1)
  assert.equal(failedOutputTests(run, task, 2, hiddenOutputTests(task, true, checks)), 0)
})
