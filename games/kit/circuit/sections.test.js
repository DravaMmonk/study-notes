import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placement } from './model.js'
import { arrangeSections, editSection, firstOpenSlot, sectionPreset, sectionsOf } from './sections.js'
import { print } from './text.js'
const parts={role:n=>n.type==='in'?'source':n.type==='out'?'sink':'part',inputs:n=>n.type==='in'?[]:['in'],outputs:()=>null}
const board={nodes:[{id:'input',type:'in'},{id:'a',type:'part'},{id:'b',type:'part'},{id:'c',type:'part'},{id:'d',type:'part'},{id:'out',type:'out'}],wires:[{from:'input',to:'a',port:'in'},{from:'a',to:'b',port:'in'},{from:'b',to:'c',port:'in'},{from:'c',to:'d',port:'in'},{from:'d',to:'out',port:'in'}]}
test('course stages preset continuous rows and leave new work unfolded',()=>{
 const got=sectionPreset(board,[{id:'old',label:'Read',nodes:['a','b','c']}],parts)
 assert.deepEqual(got.sections,[{row:0,note:'Read',folded:true},{row:2}])
 assert.deepEqual(sectionsOf(got,placement(got,parts)).map(s=>s.nodes),[['a','b','c'],['d']])
 assert.equal(board.sections,undefined)
})
test('moving a divider changes membership while deleting it never removes a part',()=>{
 const preset=sectionPreset(board,[{label:'Read',nodes:['a','b']}],parts)
 const moved=editSection(preset,parts,1,{row:2,note:'Changed'})
 assert.deepEqual(sectionsOf(moved,placement(moved,parts))[0].nodes,['a','b','c','d'])
 const removed=editSection(moved,parts,2,null)
 assert.deepEqual(removed.nodes,moved.nodes)
 assert.equal(removed.wires,moved.wires)
 assert.equal(removed.sections.length,1)
})
test('explicit empty sections survive presets and dividers never enter blueprint text',()=>{
 const empty={...board,sections:[]}
 assert.equal(sectionPreset(empty,[{label:'x',nodes:['a']}],parts),empty)
 assert.equal(print({...board,sections:[{row:0,note:'Private layout',folded:true}]},parts),print(board,parts))
})
test('arrangement preserves dividers, circuit expressions and wires',()=>{
 const preset=sectionPreset(board,[{label:'Read',nodes:['a','b']}],parts)
 const arranged=arrangeSections(preset,parts)
 assert.equal(arranged.sections,preset.sections)
 assert.equal(arranged.wires,preset.wires)
 assert.deepEqual(arranged.nodes.map(n=>[n.id,n.type,n.params]),preset.nodes.map(n=>[n.id,n.type,n.params]))
})
test('a trailing divider retains a visible empty insertion row',()=>{
 const b={...board,sections:[{row:4,note:'New work'}]}
 assert.ok(placement(b,parts).rows>=5)
 assert.ok(placement(b,parts).free.includes(8))
})

test('new parts skip free holes in folded sections', () => {
 const preset=sectionPreset(board,[{label:'Read',nodes:['a','b','c']}],parts)
 assert.equal(firstOpenSlot(preset,parts),5)
 assert.equal(firstOpenSlot({...preset,sections:preset.sections.map(s=>({...s,folded:true}))},parts),placement(preset,parts).free.at(-1))
})
