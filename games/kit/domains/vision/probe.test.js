// A filter probe the task describes: an impulse tells its kernel from the alternatives, a flat image does not.
import test from 'node:test'
import assert from 'node:assert/strict'
import { blankProbe, filterProbeProblems, probeOf } from './probe.js'

const third = 1 / 3
const task = {
  experiment: 'filter',
  kernel: [[0, 0, 0], [0.25, 0.5, 0.25], [0, 0, 0]],
  questions: [{
    title: { zh: '权重', en: 'Weights' },
    options: [
      { id: 'even', label: { zh: '平均', en: 'Even' }, kernel: [[0, 0, 0], [third, third, third], [0, 0, 0]] },
      { id: 'centre', label: { zh: '中间重', en: 'Centre-heavy' }, kernel: [[0, 0, 0], [0.25, 0.5, 0.25], [0, 0, 0]] },
    ],
    answer: 'centre',
  }],
}

test('an impulse separates the box’s kernel from the alternatives; a flat image or a wrong pick does not pass', () => {
  const model = probeOf(task)
  const [question] = model.questions
  const impulse = blankProbe()
  impulse[3][3] = 1
  assert.equal(model.check(question, { rows: impulse, answer: 'centre' }), null)
  assert.ok(model.check(question, { rows: impulse, answer: 'even' }))
  assert.ok(model.check(question, { rows: blankProbe().map((r) => r.map(() => 0.5)), answer: 'centre' }))
  assert.equal(model.output(impulse).data[3 * 7 + 3], 0.5)
})

test('a filter probe whose right option is not its kernel is reported', () => {
  assert.deepEqual(filterProbeProblems(task), [])
  assert.equal(filterProbeProblems({ ...task, questions: [{ ...task.questions[0], answer: 'even' }] }).length, 1)
})
