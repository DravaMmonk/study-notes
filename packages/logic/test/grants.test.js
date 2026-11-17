import test from 'node:test'
import assert from 'node:assert/strict'
import { symbolGrant } from '../core/grants.js'
test('formula use selects the earliest symbol stage supplying the connective', () => {
  const objects = { 'sample/and': { mark: 'logic:mark-formulaAnd', stages: [{ id: 'wide', mark: 'logic:mark-formulaOr' }] } }
  assert.equal(symbolGrant.type, 'logic/symbol')
  assert.deepEqual(symbolGrant.used({ kind: 'logic:translate', target: 'A ∨ B' }, objects), ['sample/wide'])
  assert.deepEqual(symbolGrant.used({ kind: 'logic:proof', target: 'A ∨ B' }, objects), [])
})
