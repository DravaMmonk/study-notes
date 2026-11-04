import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { closeGames, gameOf } from '../../engine/games.mjs'
import { fresh } from '../../shell/progress.js'
import domain from './domain.js'
import { taskBoard, taskDefaults } from './tooling.js'
import { PARTS } from './parts.js'
import { play } from './play.js'
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
  const v=read(),at=(id,k=0)=>v.settingsIn(v.played.get(id)[k],'shift','outside')
  assert.deepEqual(at('0-2'),['zero'])
  assert.deepEqual(at('1-5'),['zero','clamp'])
  assert.deepEqual(at('1-6',0),['zero','clamp'])
  assert.deepEqual(at('1-6',1),['zero','clamp','wrap'])
  assert.deepEqual(at('1-6',2),['zero','clamp','wrap','reflect'])
  const board={nodes:[{id:'s',type:'shift',params:{outside:'reflect'}},{id:'x',type:'abs'}],wires:[{from:'x',to:'s',port:'image'}]}
  const ready=taskBoard(board,new Set(['shift']),(type,key)=>v.settingsIn(v.played.get('0-2')[0],type,key))
  assert.equal(ready.nodes.length,1);assert.equal(ready.nodes[0].params.outside,'zero');assert.equal(ready.wires.length,0)
})

test('configurable arithmetic preserves broadcasting, signed values and division errors',()=>{
  const run=(op,a,b)=>PARTS.arithmetic.eval({a,b},{params:{op}})
  assert.equal(run('sub',2,5),-3);assert.equal(run('mul',-2,4),-8);assert.equal(run('div',3,4),.75)
  assert.deepEqual(toRows(run('add',fromRows([[.2,.6]]),.1)),[[.30000000000000004,.7]])
  assert.throws(()=>run('div',1,0));assert.throws(()=>run('unknown',1,2))
})


test('vertical weighting is introduced on the shared prerequisite before two-axis reuse',()=>{
  const v=read(),[horizontal,vertical]=v.played.get('1-1')
  assert.equal(vertical.taskId,'v1_vertical')
  assert.deepEqual(v.settingsIn(horizontal,'offset','axis'),['x'])
  assert.deepEqual(v.settingsIn(vertical,'offset','axis'),['x','y'])
  for(const id of ['1-2','1-3','1-8'])assert.deepEqual(v.settingsIn(v.played.get(id)[0],'offset','axis'),['x','y'])
  assert.equal(v.builtBy('weightedLine').taskId,vertical.taskId)
  const board={nodes:[{id:'s',type:'offset',params:{axis:'y'}}],wires:[]}
  assert.equal(taskBoard(board,new Set(['offset']),(type,key)=>v.settingsIn(horizontal,type,key)).nodes[0].params.axis,'x')
  assert.equal(taskBoard(board,new Set(['offset']),(type,key)=>v.settingsIn(vertical,type,key)).nodes[0].params.axis,'y')
  const wrong=structuredClone(readContent('vision-lab'))
  const first=wrong.levels.find(l=>l.id==='1-1').tasks[0]
  first.solution=first.solution.map(line=>line.replace('offset(', 'offset[axis=y]('))
  assert.ok(domain.validate(domain.spec(wrong)).some(result=>result.fail&&result.text.includes('offset.axis=y before its task introduction')))
})


test('enum configurations and helper components appear only where their prerequisite tasks need them',()=>{
  const v=read(),task=(id,k=0)=>v.played.get(id)[k],values=(id,type,key,k=0)=>v.settingsIn(task(id,k),type,key)
  assert.deepEqual(values('0-1','arithmetic','op'),['sub'])
  assert.deepEqual(values('1-1','arithmetic','op'),['add','sub','mul'])
  assert.deepEqual(values('2-6','arithmetic','op'),['add','sub','mul','div'])
  assert.deepEqual(values('1-3','reduceRows','mode',1),['sum'])
  assert.deepEqual(values('2-2','reduceRows','mode'),['mean','sum'])
  assert.deepEqual(values('1-4','convolve','axis'),['x'])
  assert.deepEqual(values('1-7','convolve','axis'),['x','y'])
  const flags=new Set(v.LEVELS.filter(level=>level.builds).map(level=>level.builds.type))
  const held=t=>{const tools=v.offerIn(t,flags);return [...tools.shown,...tools.folded]}
  assert.ok(!held(task('1-3')).includes('reduceRows'))
  assert.ok(held(task('1-3',1)).includes('reduceRows'))
  assert.ok(!held(task('2-4')).includes('size'))
  assert.ok(held(task('2-11')).includes('size'))
  assert.ok(held(task('2-12')).includes('size'))
  for(const [id,pre,combined] of [['1-5',['v1_smooth_border','v1_residual'],'v1_detail'],['2-1','v2_cycle','v2_wave'],['1-3','v1_contributions','v1_kernel'],['1-8','v1_strength','v1_sobel'],['2-4','v2_probe_scan','v2_spectrum'],['2-6','v2_rescale','v2_phase'],['2-8','v2_columns','v2_two_axes']])assert.deepEqual(v.played.get(id).map(t=>t.taskId),[pre,combined].flat())
  const original={nodes:[{id:'op',type:'arithmetic',params:{op:'div'}}],wires:[]}
  assert.equal(taskBoard(original,new Set(['arithmetic']),(type,key)=>v.settingsIn(task('0-1'),type,key)).nodes[0].params.op,'sub')
  assert.equal(original.nodes[0].params.op,'div')
  for(const level of v.LEVELS)for(const t of v.played.get(level.id)){
    for(const type of held(t)){
      const params=taskDefaults(type,v.partOf,(type,key)=>v.settingsIn(t,type,key))
      for(const key of Object.keys(v.partOf(type)?.settings??{}))assert.ok(v.settingsIn(t,type,key).includes(params[key]),`${t.taskId}: unavailable default ${type}.${key}`)
    }
  }
  for(const level of v.LEVELS)for(const t of v.played.get(level.id))for(const introduced of t.fresh)assert.ok(t.solution.nodes.some(node=>node.type===introduced),`${t.taskId} introduces unused ${introduced}`)
})


test('headless attempts share task defaults and refuse explicitly unavailable settings',()=>{
  const v=read(),source=v.played.get('0-1')[0],ctx={game:{vision:v},level:{source},flags:new Set(),progress:{built:{}},solved:false}
  const implicit=play.attempt(ctx,'d = arithmetic(a,b)\nout <- d')
  assert.equal(implicit.pass,true)
  assert.equal(implicit.board.nodes.find(n=>n.id==='d').params.op,'sub')
  const unavailable=play.attempt(ctx,'d = arithmetic[op=div](a,b)\nout <- d')
  assert.equal(unavailable.pass,false)
  assert.match(unavailable.refused[0].en,/Not introduced/)
})
