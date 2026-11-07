import test from 'node:test'
import assert from 'node:assert/strict'
import { containerUnderPointer } from './dropTarget.js'

test('containers use pointer bounds, include their edges and ignore a dragged frame’s own regions',()=>{
 const items=[],layer={querySelectorAll:()=>items},excluded=new Set()
 const box=(left,top,width,height,owner=layer)=>({closest:()=>owner,getBoundingClientRect:()=>({left,top,width,height,right:left+width,bottom:top+height})})
 const group=box(0,0,100,100),frame=box(10,10,50,50),foreign=box(0,0,100,100,{})
 items.push(group,frame,foreign)
 const drag={x:20,y:20,el:{contains:el=>excluded.has(el)}}
 assert.equal(containerUnderPointer(layer,drag,'containers'),frame)
 excluded.add(frame)
 assert.equal(containerUnderPointer(layer,drag,'containers'),group)
 drag.x=100;drag.y=100
 assert.equal(containerUnderPointer(layer,drag,'containers'),group)
 drag.x=101
 assert.equal(containerUnderPointer(layer,drag,'containers'),null)
})

test('empty containers are not targets and later overlapping containers take precedence',()=>{
 const items=[],layer={querySelectorAll:()=>items}
 const box=width=>({closest:()=>layer,getBoundingClientRect:()=>({left:0,top:0,right:width,bottom:10,width,height:10})})
 const first=box(10),last=box(10)
 items.push(first,last,box(0))
 assert.equal(containerUnderPointer(layer,{x:5,y:5,el:{contains:()=>false}},'containers'),last)
})
