import test from 'node:test'
import assert from 'node:assert/strict'
import {translateBlock,blocksOf,blockPreset,editBlock,createBlock,rectangleMembers,rowMembers,blockRows,withNewSlots,newPartSlot,phoneBlockBoard,blockAtSlot,blockOfPart,transferBlockMembers,movePhonePart} from './blocks.js'
import {print} from './text.js'
import {placement} from './model.js'
const parts={role:n=>n.type==='in'?'source':n.type==='out'?'sink':'part',inputs:()=>['in'],outputs:()=>null}
const graph={nodes:[{id:'input',type:'in',x:0,y:0},{id:'a',x:100,y:0},{id:'b',x:220,y:0},{id:'c',x:340,y:0},{id:'out',type:'out',x:500,y:0}],wires:[{from:'input',to:'a',port:'in'},{from:'a',to:'b',port:'in'},{from:'b',to:'c',port:'in'},{from:'c',to:'out',port:'in'}]}
test('course presets use node identities, leave current work ungrouped and respect an explicit empty list',()=>{
 const preset=blockPreset(graph,[{id:'old',label:'Read',nodes:['input','a','b']}],parts)
 assert.deepEqual(blocksOf(preset,parts).map(b=>[b.id,b.view,b.nodes]),[['course:old','ports',['a','b']]])
 assert.deepEqual(blockRows(preset,parts).map(b=>[b.start,b.end]),[[0,2]])
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

test('new carried parts occupy ungrouped slots while existing placements stay unchanged',()=>{
 const first=blockPreset(graph,[{id:'old',nodes:['a','b']}],parts)
 const carried={...first,nodes:[...first.nodes,{id:'new',x:900,y:900}]}
 const next=withNewSlots(carried,parts)
 for(const old of first.nodes)assert.equal(next.nodes.find(n=>n.id===old.id).slot,old.slot)
 const fresh=next.nodes.find(n=>n.id==='new')
 assert(Number.isInteger(fresh.slot));assert(fresh.slot>=2)
 assert.equal(fresh.x,900)
})

test('hiding remembers the prior visible mode across saved-board reloads',()=>{
 let b=createBlock({...graph,blocks:[]},parts,['a','b'])
 b=editBlock(b,parts,b.blocks[0].id,{view:'full'})
 b=editBlock(b,parts,b.blocks[0].id,{view:'hidden'})
 const reloaded=JSON.parse(JSON.stringify(b))
 assert.equal(blocksOf(reloaded,parts)[0].lastView,'full')
 assert.deepEqual(blocksOf(reloaded,parts).map(b=>b.id),b.blocks.map(b=>b.id))
})

test('new loose parts avoid vacant cells inside an existing block',()=>{
 const b=blockPreset(graph,[{id:'old',nodes:['a']}],parts)
 assert(newPartSlot(b,parts)>=2)
})

test('frame-internal connections do not become hidden-block boundary stubs',()=>{
 const b={nodes:[{id:'i',type:'in'},{id:'frame'},{id:'child',in:'frame/body'},{id:'o',type:'out'}],wires:[{from:'i',to:'frame',port:'in'},{from:'frame#body',to:'child',port:'in'},{from:'child',to:'frame',port:'body'},{from:'frame',to:'o',port:'in'}],blocks:[{id:'b',view:'hidden',nodes:['frame']}]}
 const block=blocksOf(b,parts)[0]
 assert.equal(block.ins.length,1);assert.equal(block.outs.length,1)
 assert.equal(block.ins[0].from,'i');assert.equal(block.outs[0].to,'o')
})


const containerBoard = () => ({...graph,nodes:graph.nodes.map(n=>({...n,slot:{a:0,b:3,c:4}[n.id]})),blocks:[{id:'course:container',note:'Container',view:'ports',nodes:['a','b'],slot:0}]})
test('phone containers fill holes, reserve a whole insertion row and reach a stable layout',()=>{
 const board=containerBoard(),phone=phoneBlockBoard(board,parts),placed=placement(phone,parts)
 const block=blockRows(phone,parts,placed)[0]
 assert.deepEqual([block.start,block.end],[0,3])
 for(const slot of [1,2,4,5])assert(placed.free.includes(slot))
 assert.equal(phone.nodes.find(n=>n.id==='c').slot,6)
 assert.deepEqual(phoneBlockBoard(phone,parts),phone)
 assert.equal(phone.wires,board.wires)
 assert.deepEqual(phone.nodes.map(n=>[n.id,n.x,n.y]),board.nodes.map(n=>[n.id,n.x,n.y]))
})
test('adding into an insertion row joins the container and leaves another complete empty row',()=>{
 const phone=phoneBlockBoard(containerBoard(),parts),slot=4
 const next=transferBlockMembers({...phone,nodes:[...phone.nodes,{id:'new',slot}]},parts,[{id:'new',block:blockAtSlot(phone,parts,slot)}])
 const grown=phoneBlockBoard(next,parts),block=blockRows(grown,parts)[0],placed=placement(grown,parts)
 assert(block.nodes.includes('new'));assert.equal(block.end,4)
 assert(placed.free.includes(6));assert(placed.free.includes(7))
 assert.equal(grown.nodes.find(n=>n.id==='c').slot,8)
 assert.equal(grown.wires,phone.wires)
})
test('dragging out removes membership without enlarging the old container',()=>{
 const phone=phoneBlockBoard(containerBoard(),parts),end=blockRows(phone,parts)[0].end
 const moved=phoneBlockBoard(movePhonePart(phone,parts,'a',7),parts)
 assert.equal(blockOfPart(moved,'a'),null)
 assert.deepEqual(moved.blocks[0].nodes,['b'])
 assert.equal(blockRows(moved,parts)[0].end,end)
 assert.equal(moved.nodes.find(n=>n.id==='a').slot,7)
 assert.equal(moved.wires,phone.wires)
})
test('swapping between containers transfers both memberships with their positions',()=>{
 const board={...graph,nodes:graph.nodes.map(n=>({...n,slot:{a:0,b:1,c:4}[n.id]})),blocks:[{id:'left',view:'ports',slot:0,nodes:['a','b']},{id:'right',view:'ports',slot:4,nodes:['c']}]}
 const phone=phoneBlockBoard(board,parts),moved=movePhonePart(phone,parts,'a',4)
 assert.equal(blockOfPart(moved,'a'),'right');assert.equal(blockOfPart(moved,'c'),'left')
 assert.equal(moved.nodes.find(n=>n.id==='a').slot,4);assert.equal(moved.nodes.find(n=>n.id==='c').slot,0)
 assert.equal(moved.wires,phone.wires)
})
test('protected preset members cannot move directly or indirectly through a swap',()=>{
 const phone=phoneBlockBoard(containerBoard(),parts)
 const canMove=id=>!blockOfPart(phone,id)?.startsWith('course:')
 assert.equal(movePhonePart(phone,parts,'a',7,null,canMove),phone)
 assert.equal(movePhonePart(phone,parts,'c',0,null,canMove),phone)
 const detached=movePhonePart(phone,parts,'a',7,null,()=>true)
 assert.equal(blockOfPart(detached,'a'),null)
})
test('moving the last member outside deletes only its empty container',()=>{
 const board={...graph,nodes:graph.nodes.map(n=>({...n,slot:{a:0,b:4,c:5}[n.id]})),blocks:[{id:'only',view:'ports',slot:0,nodes:['a']}]}
 const phone=phoneBlockBoard(board,parts),moved=movePhonePart(phone,parts,'a',7)
 assert.deepEqual(moved.blocks,[]);assert.equal(moved.nodes.length,phone.nodes.length)
 assert.equal(moved.wires,phone.wires)
})

test('block translation preserves wires, membership, slots and nested local coordinates',()=>{
 const b={...graph,nodes:[...graph.nodes.map(n=>({...n,slot:3})),{id:'inside',type:'part',in:'a/body',x:9,y:12}],blocks:[{id:'x',nodes:['a','b'],view:'hidden'}]}
 const moved=translateBlock(b,parts,'x',50,-20)
 assert.equal(moved.wires,b.wires);assert.equal(moved.blocks,b.blocks)
 for(const n of b.nodes){const after=moved.nodes.find(v=>v.id===n.id)
  if(['a','b'].includes(n.id)){assert.equal(after.x,n.x+50);assert.equal(after.y,n.y-20);assert.equal(after.slot,n.slot)}
  else assert.equal(after,n)
 }
 assert.equal(translateBlock(b,parts,'missing',50,20),b)
 assert.equal(translateBlock(b,parts,'x',0,0),b)
})
test('visible block translation commits displayed member positions without shifting unrelated nodes',()=>{
 const b={...graph,blocks:[{id:'x',nodes:['a','b'],view:'ports'}]}
 const moved=translateBlock(b,parts,'x',-15,30,new Map([['a',{x:600,y:50}],['b',{x:810,y:70}]]))
 assert.deepEqual(moved.nodes.filter(n=>['a','b'].includes(n.id)).map(n=>[n.x,n.y]),[[585,80],[795,100]])
 assert.equal(moved.nodes.find(n=>n.id==='c'),graph.nodes.find(n=>n.id==='c'))
})
