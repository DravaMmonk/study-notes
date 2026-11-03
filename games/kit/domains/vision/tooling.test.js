import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { closeGames, gameOf } from '../../engine/games.mjs'
import { fresh } from '../../shell/progress.js'
import domain from './domain.js'
import { taskBoard } from './tooling.js'
import { PARTS } from './parts.js'
import { fromRows,toRows } from './image.js'
const read=()=>domain.spec(readContent('vision-lab')).vision
after(closeGames)

test('the components book earns primitives at stable task introductions',async()=>{
  const game=await gameOf(readContent('vision-lab')),p=fresh()
  assert.ok(game.parts.earned(p).includes('part:arithmetic'))
  assert.ok(!game.parts.earned(p).includes('part:abs'))
  assert.ok(game.parts.earned({...p,passed:['v0_signed']}).includes('part:abs'))
  assert.ok(game.parts.earned({...p,solved:['0-1']}).includes('part:abs'))
})

test('tools appear in their introducing task, including the folded tray, even in all-unlocked mode',()=>{
  const v=read(),[first,second]=v.played.get('0-1')
  const flags=new Set(v.LEVELS.filter(l=>l.builds).map(l=>l.builds.type))
  const tools=t=>{const p=v.offerIn(t,flags);return [...p.shown,...p.folded]}
  assert.deepEqual(tools(first),['arithmetic'])
  assert.ok(tools(second).includes('abs'))
  assert.ok(!tools(first).includes('const'))
  assert.deepEqual(v.introductions('abs','0-1'),['v0_difference'])
  assert.deepEqual(v.introductions('trim','1-6'),['v1_valid'])
  const wrong=structuredClone(readContent('vision-lab'))
  wrong.levels.find(l=>l.id==='0-1').tasks[0].solution=['x = abs(a)','out <- x']
  assert.ok(domain.validate(domain.spec(wrong)).some(r=>r.fail&&r.text.includes('does not hold')))
})

test('boundary configurations open only after the current path has introduced them',()=>{
  const v=read(),at=(id,k=0)=>v.outsideIn(v.played.get(id)[k])
  assert.deepEqual(at('0-2'),['zero'])
  assert.deepEqual(at('1-5'),['zero','clamp'])
  assert.deepEqual(at('1-6',0),['zero','clamp'])
  assert.deepEqual(at('1-6',1),['zero','clamp','wrap'])
  assert.deepEqual(at('1-6',2),['zero','clamp','wrap','reflect'])
  const board={nodes:[{id:'s',type:'shift',params:{outside:'reflect'}},{id:'x',type:'abs'}],wires:[{from:'x',to:'s',port:'image'}]}
  const ready=taskBoard(board,new Set(['shift']),['zero'])
  assert.equal(ready.nodes.length,1);assert.equal(ready.nodes[0].params.outside,'zero');assert.equal(ready.wires.length,0)
})

test('configurable arithmetic preserves broadcasting, signed values and division errors',()=>{
  const run=(op,a,b)=>PARTS.arithmetic.eval({a,b},{params:{op}})
  assert.equal(run('sub',2,5),-3);assert.equal(run('mul',-2,4),-8);assert.equal(run('div',3,4),.75)
  assert.deepEqual(toRows(run('add',fromRows([[.2,.6]]),.1)),[[.30000000000000004,.7]])
  assert.throws(()=>run('div',1,0));assert.throws(()=>run('unknown',1,2))
})
