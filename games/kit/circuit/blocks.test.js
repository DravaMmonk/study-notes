import test from 'node:test'
import assert from 'node:assert/strict'
import {blocksOf,blockPreset,editBlock,createBlock,rectangleMembers,rowMembers,blockRows} from './blocks.js'
import {print} from './text.js'
const parts={role:n=>n.type==='in'?'source':n.type==='out'?'sink':'part',inputs:()=>['in'],outputs:()=>null}
const graph={nodes:[{id:'input',type:'in',x:0,y:0},{id:'a',x:100,y:0},{id:'b',x:220,y:0},{id:'c',x:340,y:0},{id:'out',type:'out',x:500,y:0}],wires:[{from:'input',to:'a',port:'in'},{from:'a',to:'b',port:'in'},{from:'b',to:'c',port:'in'},{from:'c',to:'out',port:'in'}]}
test('course presets use node identities, leave current work ungrouped and respect an explicit empty list',()=>{
 const preset=blockPreset(graph,[{id:'old',label:'Read',nodes:['input','a','b']}],parts)
 assert.deepEqual(blocksOf(preset,parts).map(b=>[b.id,b.view,b.nodes]),[['course:old','ports',['a','b']]])
 assert.deepEqual(blockRows(preset,parts).map(b=>[b.start,b.end]),[[0,1]])
 const empty={...graph,blocks:[]};assert.equal(blockPreset(empty,[{id:'old',nodes:['a']}],parts),empty)
})
test('new blocks take membership, remove emptied blocks and leave every circuit node and wire intact',()=>{
 const first=createBlock({...graph,blocks:[]},parts,['a','b'])
 const next=createBlock(first,parts,['b','c'])
 assert.deepEqual(blocksOf(next,parts).map(b=>b.nodes),[['a'],['b','c']])
 const all=createBlock(next,parts,['a','b','c'])
 assert.equal(all.blocks.length,1);assert.equal(all.wires,graph.wires)
 assert.deepEqual(all.nodes.map(n=>n.id),graph.nodes.map(n=>n.id))
 const deleted=editBlock(all,parts,all.blocks[0].id,null);assert.equal(deleted.nodes,all.nodes);assert.deepEqual(deleted.blocks,[])
 assert.equal(print(all,parts),print(graph,parts))
})
test('rectangle selection tests card centres and row selection includes both endpoints',()=>{
 const b=blockPreset(graph,[{id:'old',nodes:['a','b']}],parts)
 assert.deepEqual(rectangleMembers(graph,parts,[[140,0],[280,80]],n=>n,()=>[80,60]),['a','b'])
 assert.deepEqual(rowMembers(b,parts,0,0),['a','b'])
})
test('members are unique and missing or fixed cards never enter a block',()=>{
 const b={...graph,blocks:[{id:'x',nodes:['a','a','gone','input'],view:'hidden'},{id:'y',nodes:['a','b'],view:'full'}]}
 assert.deepEqual(blocksOf(b,parts).map(b=>b.nodes),[['a'],['b']])
})
