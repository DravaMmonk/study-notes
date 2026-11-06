import test from 'node:test'
import assert from 'node:assert/strict'
import { foldedPartsOf } from './folding.js'

test('a folded section keeps node identities and includes nested component bodies', () => {
  const graph = { nodes: [{id:'deep',in:'child/body'},{id:'child',in:'frame/body'},{id:'frame'},{id:'other'}], wires:[{from:'frame',to:'other',port:'in'}] }
  const before = structuredClone(graph)
  assert.deepEqual([...foldedPartsOf(graph,[{folded:true,nodes:['frame']}])].sort(), ['child','deep','frame'])
  assert.equal(foldedPartsOf(graph,[{folded:false,nodes:['frame']}]).size,0)
  assert.deepEqual(graph,before)
})
