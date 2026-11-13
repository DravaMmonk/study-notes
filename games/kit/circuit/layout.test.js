import test from 'node:test'
import assert from 'node:assert/strict'
import { alignedLayout, pipelineLayout, reflowLayout, layoutMetrics } from './layout.js'
const roleOf = (n) => n.type === 'in' ? 'source' : n.type === 'out' ? 'sink' : 'part'
const sizeOf = () => ({w:100,h:64})
const options = {roleOf,sizeOf,width:700,portY:(_id,key,side)=>side==='in'&&key==='b'?66:46}
const graph = {nodes:[{id:'in',type:'in'},{id:'a'},{id:'b'},{id:'c'},{id:'k'},{id:'out',type:'out'}],wires:[{from:'in',to:'a',port:'a'},{from:'a',to:'b',port:'a'},{from:'b',to:'c',port:'a'},{from:'k',to:'c',port:'b'},{from:'c',to:'out',port:'a'}]}
const blocks=[{id:'first',view:'ports',nodes:['a','b']},{id:'last',view:'ports',nodes:['c']}]
test('a chain aligns actual input and output offsets, including non-first inputs',()=>{
 const p=alignedLayout(graph.nodes.filter(n=>['k','c'].includes(n.id)),graph.wires,options)
 assert.equal(p.positions.get('k').y+46,p.positions.get('c').y+66)
})
test('blocks wrap, private constants follow consumers, and layout is deterministic',()=>{
 const p=pipelineLayout(graph,blocks,options)
 assert.deepEqual(p,pipelineLayout(graph,blocks,options))
 assert(p.nodes.get('k').x<p.nodes.get('c').x)
 assert(p.nodes.get('c').x-p.nodes.get('k').x<150)
 assert(p.units.every(u=>u.x+u.w<=p.width))
 assert(p.units[1].y>p.units[0].y)
 const m=layoutMetrics(graph,p,options)
 assert(m.area<500000,JSON.stringify(m));assert(m.longest<1200,JSON.stringify(m));assert(m.crossings<8,JSON.stringify(m));assert(m.total<3000,JSON.stringify(m))
})
test('the lane between sources and sinks is capped, and still holds wider content',()=>{
 const ends=[{id:'in',type:'in'},{id:'out',type:'out'}]
 const empty=pipelineLayout({nodes:ends,wires:[]},[],{...options,width:2000,lane:300})
 assert.equal(empty.nodes.get('out').x-(empty.nodes.get('in').x+100),300+24*2)
 const narrow=pipelineLayout({nodes:ends,wires:[]},[],{...options,width:400,lane:300})
 assert.equal(narrow.width,400)
 const full=pipelineLayout(graph,blocks,{...options,lane:50})
 assert(full.units.every(u=>u.x+u.w<=full.nodes.get('out').x))
})
test('independent branches stack rather than consume separate columns',()=>{
 const g={nodes:[{id:'a'},{id:'b'},{id:'c'}],wires:[{from:'a',to:'c',port:'a'},{from:'b',to:'c',port:'b'}]}
 const p=pipelineLayout(g,[],options)
 assert.equal(p.nodes.get('a').x,p.nodes.get('b').x)
 assert.notEqual(p.nodes.get('a').y,p.nodes.get('b').y)
})
test('mode reflow retains the changed block anchor and never mutates stored coordinates',()=>{
 const before=pipelineLayout(graph,blocks,options), saved=structuredClone(graph)
 const hidden=pipelineLayout(graph,blocks.map(b=>b.id==='first'?{...b,view:'hidden'}:b),options)
 const after=reflowLayout(before,hidden,'first')
 assert.equal(after.units[0].x,before.units[0].x);assert.equal(after.units[0].y,before.units[0].y)
 assert.deepEqual(graph,saved)
})
