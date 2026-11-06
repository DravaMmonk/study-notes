import { test } from 'node:test'
import assert from 'node:assert/strict'
import { labelledConnections, wireKey } from './connections.js'
const nodes = ['i','a','b','c','d','e','o'].map((id) => ({id}))
const w = (from,to) => ({from,to,port:'in'})
const graph = {nodes,wires:[w('i','a'),w('a','b'),w('a','c'),w('b','c'),w('c','d'),w('d','e'),w('e','o')]}
const blocks = [{id:'first',nodes:['a','b']},{id:'second',nodes:['c']}]
const parts = {role:n=>n.id==='i'?'source':n.id==='o'?'sink':'part'}
test('one shared policy labels block crossings and long wires but keeps internal wires',()=>{
  const got=labelledConnections(graph,blocks,parts,()=>[[0,0],[900,0]]).map(wireKey)
  assert.ok(!got.includes(wireKey(graph.wires[1])))
  assert.ok(got.includes(wireKey(graph.wires[2])))
  assert.ok(got.includes(wireKey(graph.wires[5])))
  assert.deepEqual(labelledConnections(graph,[],parts),[])
})
test('a source fanning into two blocks uses paired labels at every destination',()=>{
  const g={...graph,wires:[w('i','a'),w('i','c')]}
  assert.equal(labelledConnections(g,blocks,parts).length,2)
})
