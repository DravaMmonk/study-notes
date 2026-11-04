import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { closeGames, gameOf } from '../../engine/games.mjs'
import { fresh } from '../../shell/progress.js'
import domain from './domain.js'
import { taskBoard, taskDefaults } from './tooling.js'
import { PARTS } from './fixture.js'
import { play } from './play.js'
import { fromRows,toRows } from './image.js'
import { builds, circuit, game, level } from './fixture.js'
after(closeGames)

const failures=(content)=>domain.validate(domain.spec(content)).filter(r=>r.fail).map(r=>r.text)
const pair={a:[[1,4]],b:[[3,1]]}

// A: two tasks, each bringing one tool, and a built comparator. B: brings const at level scope and widens arithmetic.op.
const tools=()=>game({levels:[
  level('A',[
    circuit('a_signed',{adds:['arithmetic'],configurations:{'arithmetic.op':['sub']},tests:[{inputs:pair,expect:{out:[[-2,3]]}}],solution:['d = arithmetic[op=sub](a,b)','out <- d']}),
    circuit('a_size',{adds:['abs'],tests:[{inputs:pair,expect:{out:[[2,3]]}}],solution:['d = arithmetic[op=sub](a,b)','m = abs(d)','out <- m']}),
  ],{builds:builds('difference')}),
  level('B',[
    circuit('b_scale',{configurations:{'arithmetic.op':['mul']},tests:[{inputs:pair,expect:{out:[[4,6]]}}],solution:['two = const[value=2]()','d = difference(a,b)','m = arithmetic[op=mul](d,two)','out <- m']}),
    circuit('b_add',{configurations:{'arithmetic.op':['add']},tests:[{inputs:pair,expect:{out:[[3,7]]}}],solution:['d = difference(a,b)','m = arithmetic[op=add](d,a)','out <- m']}),
  ],{adds:['const']}),
]})

// S1, then two sibling branches (S2 widens the boundary choice, Q does not), then S3, which widens it task by task.
const shiftTask=(id,outside,dx,out,more={})=>circuit(id,{inputs:['image',{name:'d',type:'vector'}],tests:[{inputs:{image:[[1,2,3]],d:{x:dx,y:0}},expect:{out}}],solution:[`s = shift[outside=${outside}](image,d)`,'out <- s'],...more})
const borders=()=>game({
  levels:[
    level('S1',shiftTask('s1','zero',1,[[2,3,0]],{adds:['shift'],configurations:{'*.outside':['zero']}})),
    level('S2',shiftTask('s2','clamp',1,[[2,3,3]],{configurations:{'*.outside':['clamp']}})),
    level('Q',shiftTask('q','zero',1,[[2,3,0]])),
    level('S3',[shiftTask('s3_clamp','clamp',1,[[2,3,3]]),shiftTask('s3_wrap','wrap',1,[[2,3,1]],{configurations:{'*.outside':['wrap']}}),shiftTask('s3_reflect','reflect',2,[[3,3,2]],{configurations:{'*.outside':['reflect']}})]),
  ],
  eras:[{id:0,title:{zh:'E',en:'E'},question:{zh:'Q',en:'Q'},foundation:['S1',{parallel:[{id:'p',levels:['S2']},{id:'q',levels:['Q']}]},'S3']}],
})

// W introduces a direction input, then reuses the same read circuit for rows and columns.
const lines=()=>game({levels:[
  level('W',[
    shiftTask('w_line','zero',1,[[2,3,0]],{adds:['shift'],configurations:{'*.outside':['zero']}}),
    circuit('w_vertical',{inputs:['image',{name:'d',type:'vector'}],tests:[{inputs:{image:[[1,2],[3,4]],d:{x:0,y:1}},expect:{out:[[3,4],[0,0]]}}],solution:['r = shift(image,d)','out <- r']}),
  ],{builds:builds('nextCell',{settings:['outside']})}),
  level('W2',circuit('w2',{inputs:['image',{name:'d',type:'vector'}],tests:[{inputs:{image:[[1,2],[3,4]],d:{x:0,y:1}},expect:{out:[[3,4],[0,0]]}}],solution:['p = nextCell(image,d)','out <- p']})),
]})

test('the components book earns primitives at stable task introductions',async()=>{
  const g=await gameOf(tools()),p=fresh()
  assert.ok(g.parts.earned(p).includes('part:arithmetic'))
  assert.ok(!g.parts.earned(p).includes('part:abs'))
  assert.ok(!g.parts.earned(p).includes('part:const'))
  assert.ok(g.parts.earned({...p,passed:['a_signed']}).includes('part:abs'))
  assert.ok(g.parts.earned({...p,solved:['A']}).includes('part:abs'))
})

test('tools appear in their introducing task, including the folded tray, even in all-unlocked mode',()=>{
  const content=tools(),v=domain.spec(content).vision,[first,second]=v.played.get('A')
  const flags=new Set(v.LEVELS.filter(l=>l.builds).map(l=>l.builds.type))
  const held=t=>{const p=v.offerIn(t,flags);return [...p.shown,...p.folded]}
  assert.deepEqual(held(first),['arithmetic'])
  assert.ok(held(second).includes('abs'))
  assert.ok(!held(first).includes('const'))
  assert.deepEqual(v.introductions('abs','A'),['a_size'])
  assert.deepEqual(v.introductions('const','B'),['b_scale'],'a level-scoped tool is introduced by its first task')
  assert.deepEqual(failures(content),[])
  content.levels[0].tasks[0].solution=['x = abs(a)','out <- x']
  assert.ok(failures(content).some(text=>text.includes('does not hold')))
  const idle=tools()
  idle.levels[1].tasks[0].solution=['d = difference(a,b)','m = arithmetic[op=mul](d,a)','out <- m']
  assert.ok(failures(idle).some(text=>text.includes('introduces const, which its answer does not use')))
})

test('boundary configurations open only after the current path has introduced them',()=>{
  const v=domain.spec(borders()).vision,at=(id,k=0)=>v.settingsIn(v.played.get(id)[k],'shift','outside')
  assert.deepEqual(at('S1'),['zero'])
  assert.deepEqual(at('S2'),['zero','clamp'])
  assert.deepEqual(at('Q'),['zero'],'a sibling branch does not open its choices here')
  assert.deepEqual(at('S3',0),['zero','clamp'])
  assert.deepEqual(at('S3',1),['zero','clamp','wrap'])
  assert.deepEqual(at('S3',2),['zero','clamp','wrap','reflect'])
  assert.deepEqual(failures(borders()),[])
  const none=borders();delete none.levels[0].tasks[0].configurations
  assert.ok(failures(none).some(text=>text.includes('holds shift with no shift.outside introduced')))
  const board={nodes:[{id:'s',type:'shift',params:{outside:'reflect'}},{id:'x',type:'abs'}],wires:[{from:'x',to:'s',port:'image'}]}
  const ready=taskBoard(board,new Set(['shift']),(type,key)=>v.settingsIn(v.played.get('S1')[0],type,key),v.partOf)
  assert.equal(ready.nodes.length,1);assert.equal(ready.nodes[0].params.outside,'zero');assert.equal(ready.wires.length,0)
})

test('configurable arithmetic preserves broadcasting, signed values and division errors',()=>{
  const run=(op,a,b)=>PARTS.arithmetic.eval({a,b},{params:{op}})
  assert.equal(run('sub',2,5),-3);assert.equal(run('mul',-2,4),-8);assert.equal(run('div',3,4),.75)
  assert.deepEqual(toRows(run('add',fromRows([[.2,.6]]),.1)),[[.30000000000000004,.7]])
  assert.throws(()=>run('div',1,0));assert.throws(()=>run('unknown',1,2))
})

test('one offset-read primitive supports direction inputs through packed reuse',()=>{
  const content=lines(),v=domain.spec(content).vision,[horizontal,vertical]=v.played.get('W')
  assert.equal(PARTS.offset,undefined)
  assert.equal(v.builtBy('nextCell').taskId,vertical.taskId)
  assert.deepEqual(v.partOf('nextCell').inputs,['image','d'])
  assert.deepEqual(Object.keys(v.partOf('nextCell').settings),['outside'])
  for(const task of [horizontal,vertical])assert.ok(task.solution.nodes.some(n=>n.type==='shift'))
  assert.deepEqual(failures(content),[])
})


test('enum choices accumulate along the path in the part’s own order, and defaults fall to an available choice',()=>{
  const v=domain.spec(tools()).vision,task=(id,k=0)=>v.played.get(id)[k],ops=(id,k)=>v.settingsIn(task(id,k),'arithmetic','op')
  assert.deepEqual(ops('A',0),['sub'])
  assert.deepEqual(ops('A',1),['sub'])
  assert.deepEqual(ops('B',0),['sub','mul'])
  assert.deepEqual(ops('B',1),['add','sub','mul'],'declared after mul, listed in the part’s order')
  const original={nodes:[{id:'op',type:'arithmetic',params:{op:'div'}}],wires:[]}
  assert.equal(taskBoard(original,new Set(['arithmetic']),(type,key)=>v.settingsIn(task('A'),type,key),v.partOf).nodes[0].params.op,'sub')
  assert.equal(original.nodes[0].params.op,'div','the saved board is not changed')
  const flags=new Set(v.LEVELS.filter(l=>l.builds).map(l=>l.builds.type))
  for(const level of v.LEVELS)for(const t of v.played.get(level.id)){
    const tools=v.offerIn(t,flags)
    for(const type of [...tools.shown,...tools.folded]){
      const params=taskDefaults(type,v.partOf,(type,key)=>v.settingsIn(t,type,key))
      for(const key of Object.keys(v.partOf(type)?.settings??{}))assert.ok(v.settingsIn(t,type,key).includes(params[key]),`${t.taskId}: unavailable default ${type}.${key}`)
    }
  }
})

test('headless attempts share task defaults and refuse explicitly unavailable settings',()=>{
  const v=domain.spec(tools()).vision,source=v.played.get('A')[0],ctx={game:{vision:v},level:{source},flags:new Set(),progress:{built:{}},solved:false}
  const implicit=play.attempt(ctx,'d = arithmetic(a,b)\nout <- d')
  assert.equal(implicit.pass,true)
  assert.equal(implicit.board.nodes.find(n=>n.id==='d').params.op,'sub')
  const unavailable=play.attempt(ctx,'d = arithmetic[op=div](a,b)\nout <- d')
  assert.equal(unavailable.pass,false)
  assert.match(unavailable.refused[0].en,/Not introduced/)
})
