import assert from 'node:assert/strict'
import { test } from 'node:test'
import { worldCheck } from './worldValues.js'

const meant = '∀x. ∃y. Likes(x, y)'
const wrong = '∃y. ∀x. Likes(x, y)'
const check = worldCheck({
  meant, wrong, notation: {},
  vocab: { names: [], consts: [], preds: [['Likes', 2]] },
})

test('counterexample checks reject an empty domain and formula text before evaluation', () => {
  for (const work of [wrong, { size: 0, preds: {} }, null]) {
    const failure = check.judge(work)
    assert.equal(failure.why.en, 'This is not a world.')
    assert.deepEqual(check.run(work), { steps: [{ failed: failure.why }], lines: [] })
  }
})

test('a nonempty world must separate the translations', () => {
  const all = { size: 1, preds: { Likes: ['0,0'] } }
  assert.equal(check.judge(all).check, 0)
  const distinct = { size: 2, preds: { Likes: ['0,0', '1,1'] } }
  assert.equal(check.judge(distinct), null)
  assert.deepEqual(check.run(distinct).steps, [{}])
})
