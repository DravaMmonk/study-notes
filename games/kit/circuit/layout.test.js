import test from 'node:test'
import assert from 'node:assert/strict'
import { alignedLayout, flowSpots, pipelineLayout, reflowLayout, layoutMetrics } from './layout.js'
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
 assert.equal(empty.nodes.get('out').x-(empty.nodes.get('in').x+100),300+56*2)
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
test('columns run on or start a band below, whichever the board shows larger, and never wider than the most',()=>{
 const g={nodes:[{id:'in',type:'in'},{id:'a'},{id:'b'},{id:'c'},{id:'out',type:'out'}],wires:[{from:'in',to:'a',port:'a'},{from:'a',to:'b',port:'a'},{from:'b',to:'c',port:'a'},{from:'c',to:'out',port:'in'}]}
 const x=(p,id)=>p.nodes.get(id).x,y=(p,id)=>p.nodes.get(id).y
 const low=pipelineLayout(g,[],{...options,width:560,height:120})
 assert(x(low,'a')<x(low,'b')&&x(low,'b')<x(low,'c'),'a low board takes the long row, left to right as the wires run')
 assert.equal(y(low,'c'),y(low,'a'),'a chain runs level')
 const tall=pipelineLayout(g,[],{...options,width:560,height:900})
 assert(y(tall,'c')>y(tall,'a'),'a tall one of the same width, a band below')
 const capped=pipelineLayout(g,[],{...options,width:5000,height:120,most:560})
 assert(y(capped,'c')>y(capped,'a'),'and no board lays a row wider than the most')
 assert(capped.width<=560)
})
test('a wire never runs behind a card: a constant stands in the column before what it feeds, beside its other feeder',()=>{
 const g={nodes:[{id:'x',type:'in'},{id:'s'},{id:'k'},{id:'m'},{id:'out',type:'out'}],wires:[{from:'x',to:'s',port:'a'},{from:'s',to:'m',port:'a'},{from:'k',to:'m',port:'b'},{from:'m',to:'out',port:'in'}]}
 const p=pipelineLayout(g,[],options)
 assert.equal(p.nodes.get('k').x,p.nodes.get('s').x)
 assert.notEqual(p.nodes.get('k').y,p.nodes.get('s').y)
 assert(p.nodes.get('m').x-(p.nodes.get('s').x+100)>=56,'with room for the wires between the columns')
 assert.equal(p.nodes.get('x').x,0)
})
test('a blueprint’s cards are placed where its wires lead',()=>{
 const g={nodes:[{id:'x',x:20,y:40},{id:'y',x:20,y:180},{id:'out',x:980,y:40},{id:'s'},{id:'k'},{id:'m'},{id:'n'}],wires:[{from:'x',to:'s',port:'a'},{from:'y',to:'s',port:'b'},{from:'s',to:'m',port:'a'},{from:'k',to:'m',port:'b'},{from:'m',to:'n',port:'a'},{from:'n',to:'out',port:'in'}]}
 flowSpots(g,g.nodes.slice(3))
 const at=(id)=>g.nodes.find(n=>n.id===id)
 assert(at('s').x<at('m').x&&at('m').x<at('n').x,'a column a depth')
 assert.equal(at('k').x,at('s').x,'a constant stands just left of what it feeds')
 assert.notEqual(at('k').y,at('s').y)
 assert.equal(at('s').y,110,'between the two cards that feed it')
 assert.equal(at('out').x,980)
})
test('a card stands clear of a wire that passes its column',()=>{
 // x feeds n two columns on; s and m stand in the columns between, fed from y.
 const g={nodes:[{id:'x',type:'in'},{id:'y',type:'in'},{id:'s'},{id:'m'},{id:'n'},{id:'out',type:'out'}],wires:[{from:'y',to:'s',port:'a'},{from:'s',to:'m',port:'a'},{from:'x',to:'n',port:'a'},{from:'m',to:'n',port:'b'},{from:'n',to:'out',port:'in'}]}
 const p=pipelineLayout(g,[],{...options,width:1400})
 const at=(id)=>p.nodes.get(id)
 const [from,to]=[at('x').y+46,at('n').y+46]
 for(const id of ['s','m']){
  const [top,bottom]=[at(id).y,at(id).y+64]
  assert(Math.max(from,to)<top||Math.min(from,to)>bottom,`${id} at ${top}..${bottom} is off the wire from ${from} to ${to}`)
 }
})
