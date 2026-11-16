import test from 'node:test'
import assert from 'node:assert/strict'
import { attentionRoles } from './benches/attention-roles.js'

test('queries and keys change weights, values change the output without changing weights', () => {
  const base = { query: 'cross', keys: 'normal', values: 'normal' }
  const model = attentionRoles.make({ role: 'query' })
  const original = model.view(base)
  const query = model.view({ ...base, query: 'ring' })
  const key = model.view({ ...base, keys: 'swapped' })
  const value = model.view({ ...base, values: 'swapped' })
  assert.ok(original.weights[0] > original.weights[1])
  assert.ok(query.weights[1] > query.weights[0])
  assert.ok(key.weights[1] > key.weights[0])
  assert.deepEqual(value.weights, original.weights)
  assert.notDeepEqual(value.output, original.output)
  assert.equal(model.view({ ...base, query: 'ring', pick: 'b' }).correct, true)
  assert.equal(attentionRoles.make({ role: 'key' }).view({ ...base, keys: 'swapped', pick: 'b' }).correct, true)
  assert.equal(attentionRoles.make({ role: 'value' }).view({ ...base, values: 'swapped', pick: 'horizontal' }).correct, true)
  assert.equal(attentionRoles.make({ role: 'value' }).view({ ...base, query: 'ring', values: 'swapped', pick: 'horizontal' }).correct, false)
})
