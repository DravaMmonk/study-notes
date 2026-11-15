import assert from 'node:assert/strict'
import { test } from 'node:test'
import { failedOutputTests, hiddenOutputTests, visibleOutputTask } from './output-play.js'

test('a live preview conceals hidden output tests until completion', () => {
  const task = { tests: [{ label: 'example' }], hidden: [{ label: 'held back' }] }
  const play = { checks: 'afterPass' }
  assert.deepEqual(visibleOutputTask(task, false, play).tests, [{ label: 'example' }])
  assert.equal(hiddenOutputTests(task, false, play), task.hidden)
  assert.deepEqual(visibleOutputTask(task, true, play).tests, [
    { label: 'example' }, { label: 'held back', hidden: true },
  ])
  assert.deepEqual(hiddenOutputTests(task, true, play), [])
  assert.deepEqual(task.hidden, [{ label: 'held back' }])
})

test('the hidden-test run counts failures among only the concealed examples', () => {
  const task = { tests: [1], hidden: [2, 3] }
  const play = { checks: 'afterPass' }
  const run = ({ tests }, value) => ({ results: tests.map((expected) => ({ pass: expected === value })) })
  assert.equal(failedOutputTests(run, task, 2, hiddenOutputTests(task, false, play)), 1)
  assert.equal(failedOutputTests(run, task, 2, hiddenOutputTests(task, true, play)), 0)
})
