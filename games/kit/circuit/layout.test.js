import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arrangedBoard, pipelineLayout } from './layout.js'
const graph = { nodes: [{id:'image',type:'in'}, {id:'a',type:'part',params:{k:2},x:400,y:70}, {id:'b',type:'part',x:20,y:10}, {id:'c',type:'part'}, {id:'out',type:'out'}], wires: [{from:'image',to:'a',port:'x'},{from:'a',to:'b',port:'x'},{from:'b',to:'c',port:'x'},{from:'c',to:'out',port:'in'}] }
const roleOf = n => n.type==='in'?'source':n.type==='out'?'sink':'part'
const options = { sizeOf: () => ({w:100,h:60}), roleOf }
test('stages are layout units, terminals have outer columns and explicit arrangement preserves computation',()=>{
  const stages=[{id:'read',nodes:['a','b']}]
  const plan=pipelineLayout(graph,stages,options)
  assert.ok(plan.nodes.get('image').x<plan.nodes.get('a').x)
  assert.ok(plan.nodes.get('a').x<plan.nodes.get('c').x)
  assert.ok(plan.nodes.get('out').x>plan.nodes.get('c').x)
  const next=arrangedBoard(graph,plan)
  assert.equal(next.wires,graph.wires)
  assert.equal(next.nodes[1].params,graph.nodes[1].params)
  assert.deepEqual(next.nodes.map(n=>[n.id,n.type]),graph.nodes.map(n=>[n.id,n.type]))
  assert.equal(graph.nodes[1].x,400)
})
test('a section reserves room for its dependency-ordered internal cards',()=>{
  const plan=pipelineLayout(graph,[{id:'read',nodes:['a','b']}],options)
  assert.ok(plan.nodes.get('a').x<plan.nodes.get('b').x)
  assert.ok(plan.nodes.get('b').x+100<plan.nodes.get('c').x)
})

test('desktop arrangement preserves saved section membership and nested coordinates', () => {
  const board = { ...graph, sections: [{row:0,note:'first'}, {row:2,folded:true}], nodes: [...graph.nodes.map((n,k)=>({...n,slot:k+4})), {id:'nested',type:'part',in:'a/body',x:9,y:12}] }
  const next = arrangedBoard(board, pipelineLayout(board, [{id:'first',nodes:['a','b']}], options))
  assert.equal(next.sections, board.sections)
  assert.deepEqual(next.nodes.map((n)=>[n.id,n.slot,n.in]),board.nodes.map((n)=>[n.id,n.slot,n.in]))
  assert.equal(next.nodes.at(-1),board.nodes.at(-1))
})
