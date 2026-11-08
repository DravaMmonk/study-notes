import { test } from 'node:test'
import assert from 'node:assert/strict'
import { separable } from './separable.js'

test('shared and independent spatial kernels expose the cost and expressiveness tradeoff', () => {
  const model = separable.make()
  const shared = { target: 'shared' }
  const different = { target: 'different' }
  const result = (mode, first, second, stage) => model.view({ mode, first, second }, { stage })
  assert.equal(result('separable', 'horizontal', 'vertical', shared).error, 0)
  assert.equal(result('separable', 'horizontal', 'vertical', shared).cost, 11)
  for (const shape of ['horizontal', 'vertical', 'cross']) {
    const sample = result('separable', shape, 'vertical', different)
    assert.ok(sample.error > 0)
    assert.deepEqual(sample.out10, sample.out20)
    assert.deepEqual(sample.out11, sample.out21)
    assert.deepEqual(sample.out12, sample.out22)
  }
  const normal = result('ordinary', 'horizontal', 'vertical', different)
  assert.equal(normal.error, 0)
  assert.equal(normal.cost, 18)
})
