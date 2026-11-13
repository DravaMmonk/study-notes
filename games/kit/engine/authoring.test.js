import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkWorks, judgeWorks, scoreWorks } from './authoring.js'
import { sameAs } from './judge.js'

const judge = sameAs(2, { why: () => 'wrong result' })

test('author checks require the reference and built work to pass and the other works to fail', () => {
  const works = { reference: 2, naive: 1, empty: 0, starter: 3, built: 2 }
  assert.ok(Object.values(judgeWorks(judge, works)).every((report) => report.ok))
  const swapped = judgeWorks(judge, { reference: 1, naive: 2 })
  assert.equal(swapped.reference.ok, false)
  assert.equal(swapped.reference.fail.got, 1)
  assert.deepEqual(swapped.naive, { fail: null, ok: false })
  assert.equal(swapped.built, null)
})

test('author checks retain reports and mutation scoring uses the same judge', () => {
  assert.deepEqual(checkWorks((work) => ({ fail: judge(work), steps: 3 }), { reference: 2 }).reference, { fail: null, steps: 3, ok: true })
  assert.deepEqual(scoreWorks(judge, 2, (reference, passes) => [reference - 1, reference, reference + 1].filter(passes)), [2])
})
