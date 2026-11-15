import assert from 'node:assert/strict'
import { test } from 'node:test'
import { countFailedTests, splitTests } from './tests.js'

test('a live preview conceals hidden output tests until completion', () => {
  const task = { tests: [{ label: 'example' }], hidden: [{ label: 'held back' }] }
  const concealed = splitTests(task, false)
  assert.equal(concealed.tests, task.tests)
  assert.equal(concealed.hidden, task.hidden)
  assert.deepEqual(splitTests(task, true), {
    tests: [{ label: 'example' }, { label: 'held back', hidden: true }], hidden: [],
  })
  assert.deepEqual(task.hidden, [{ label: 'held back' }])
})

test('the hidden-test run counts failures among only the concealed examples', () => {
  const task = { tests: [1], hidden: [2, 3] }
  const run = (cases) => ({ runs: cases.map((expected) => expected === 2 ? {} : { fail: { why: 'wrong answer' } }) })
  assert.equal(countFailedTests(splitTests(task, false).hidden, run), 1)
  assert.equal(countFailedTests(splitTests(task, true).hidden, () => assert.fail('no hidden cases')), 0)
})
