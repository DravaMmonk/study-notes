import test from 'node:test'
import assert from 'node:assert/strict'
import { foldedPartsOf } from './folding.js'

test('a ports-only block keeps node identities and includes nested component bodies', () => {
  const graph = { nodes: [{id:'deep',in:'child/body'},{id:'child',in:'frame/body'},{id:'frame'},{id:'other'}], wires:[{from:'frame',to:'other',port:'in'}] }
  const before = structuredClone(graph)
  assert.deepEqual([...foldedPartsOf(graph,[{view:'ports',nodes:['frame']}])].sort(), ['child','deep','frame'])
  assert.equal(foldedPartsOf(graph,[{view:'full',nodes:['frame']}]).size,0)
  assert.deepEqual(graph,before)
})
