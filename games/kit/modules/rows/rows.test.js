import assert from 'node:assert/strict'
import { test } from 'node:test'
import { judgeSums, readSum } from './sums.js'

test('a sum can contain zero and the judge identifies the first wrong row', () => {
  const judge = judgeSums([{ total: 2 }, { total: 5 }])
  assert.equal(judge([readSum('2 + 0'), readSum('3 + 2')]), null)
  const { at, check, want, got } = judge([readSum('2 + 0'), readSum('3 + 1')])
  assert.deepEqual({ at, check, want, got }, { at: { row: 1, slot: 0 }, check: 1, want: 5, got: 4 })
})
