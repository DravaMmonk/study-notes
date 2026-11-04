import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromRows, make, toRows } from './image.js'
import { fromText } from './board.js'
import { readTest, runTest } from './run.js'
import domain from './domain.js'
import { builtDefaults, CONSTRUCTION_PARTS, readOutside } from './construction.js'
import { filterImage } from './operators.js'
import { builds, circuit, game, level } from './fixture.js'

const approx = (a, b, tol = 1e-9) => {
  assert.equal(a.w, b.w); assert.equal(a.h, b.h); assert.equal(a.c, b.c)
  a.data.forEach((v,k) => assert.ok(Math.abs(v-b.data[k]) < tol, `${k}: ${v} versus ${b.data[k]}`))
}
// A small construction course: each part is a learner circuit over the execution services, later parts reuse
// earlier ones. The levels carry no tests; these tests run the parts on independent references instead.
const spatial = ['outside', 'axis']
const COURSE = [
  ['difference', ['a', 'b'], ['out'], ['d = arithmetic[op=sub](a,b)', 'm = abs(d)', 'out <- m']],
  ['alignedDifference', ['observed', 'reference', { name: 'd', type: 'vector' }], ['out'], ['s = shift(observed,d)', 'c = difference(s,reference)', 'out <- c'], {
    tests: [{ inputs: { observed: [[0.1, 0.4, 0.8, 0.3]], reference: [[0.55, 0.8, 0.3, 0]], d: { x: 1, y: 0 } }, expect: { out: [[0.15000000000000002, 0, 0, 0]] } }] }],
  // A two-pass wrapper that exposes only its boundary: its internal axes must survive a new node's defaults.
  ['separable3', ['image', 'weights', { name: 'horizontal', type: 'vector' }, { name: 'vertical', type: 'vector' }], ['out'], ['h = weightedLine(image,weights,horizontal)', 'v = weightedLine(h,weights,vertical)', 'out <- v'], {}, { settings: ['outside'] }],
  ['correlate', ['image', 'kernel'], ['out'], ['t = windowTable(image,kernel)', 'p = arithmetic[op=mul](t.samples,t.weights)', 's = reduceRows[mode=sum](p)', 'r = restore(s,image)', 'out <- r'], {}, { settings: spatial }],
  ['convolve', ['image', 'kernel'], ['out'], ['k = reverse(kernel)', 'v = correlate(image,k)', 'out <- v'], {}, { settings: spatial }],
  // One complex row transform per row with 1/N normalisation, from expanded rows; then both axes; then its inverse.
  ['rowSpectrum', ['real', 'imag'], ['re', 'im'], ['r = expandRows(real)', 'i = expandRows(imag)', 't = arithmetic[op=mul](r.position,r.frequency)', 'quarter = const[value=0.25]()', 'ts = arithmetic[op=sub](t,quarter)', 'c = cosine(t)', 's = cosine(ts)',
    'ac = arithmetic[op=mul](r.values,c)', 'bs = arithmetic[op=mul](i.values,s)', 'bc = arithmetic[op=mul](i.values,c)', 'an = arithmetic[op=mul](r.values,s)', 'pre = arithmetic[op=add](ac,bs)', 'pim = arithmetic[op=sub](bc,an)',
    'mre = reduceRows[mode=mean](pre)', 'mim = reduceRows[mode=mean](pim)', 'ore = restore(mre,real)', 'oim = restore(mim,real)', 're <- ore', 'im <- oim']],
  ['spectrum2D', ['real', 'imag'], ['re', 'im'], ['a = rowSpectrum(real,imag)', 'tr = transpose(a.re)', 'ti = transpose(a.im)', 'b = rowSpectrum(tr,ti)', 'br = transpose(b.re)', 'bi = transpose(b.im)', 're <- br', 'im <- bi']],
  ['synthesise2D', ['real', 'imag'], ['out', 'imaginary'], ['zero = const[value=0]()', 'negative = arithmetic[op=sub](zero,imag)', 'p = spectrum2D(real,negative)', 's = size(real)', 'count = arithmetic[op=mul](s.w,s.h)', 'r = arithmetic[op=mul](p.re,count)', 'i = arithmetic[op=mul](p.im,count)', 'ni = arithmetic[op=sub](zero,i)', 'out <- r', 'imaginary <- ni']],
]
const course = () => domain.spec(game({ levels: COURSE.map(([type, inputs, outputs, solution, more = {}, build = {}]) =>
  level(type, circuit(`t_${type}`, { inputs, outputs, solution, ...more }), { builds: builds(type, build) })) })).vision
function run(vision, type, bind, settings = '') {
  const task = vision.builtBy(type)
  const board = fromText([`p = ${type}${settings}(${task.inputs.map(i => i.name).join(',')})`, ...task.outputs.map(o=>`${o.name} <- p${task.outputs.length>1?`.${o.name}`:''}`)],task,vision.partOf)
  const given = readTest({inputs:bind,expect:Object.fromEntries(task.outputs.map(o=>[o.name,0]))})
  return runTest(task,board,given,vision.partOf).outputs
}

test('boundary reads distinguish zero, replicate, periodic and symmetric reflection at either end', () => {
  const image=fromRows([[2,5,9]])
  const read=(mode)=>[-2,-1,0,1,2,3,4].map(x=>readOutside(image,x,0,0,mode))
  assert.deepEqual(read('zero'),[0,0,2,5,9,0,0])
  assert.deepEqual(read('clamp'),[2,2,2,5,9,9,9])
  assert.deepEqual(read('wrap'),[5,9,2,5,9,2,5])
  assert.deepEqual(read('reflect'),[5,2,2,5,9,9,5])
  assert.equal(readOutside(fromRows([[7]]),-91,82,0,'reflect'),7)
})

test('window execution does not filter: it exposes RGB samples and positional weights independently', () => {
  const image=fromRows([[[.2,.3,.4],[.5,.6,.7]],[[.8,.9,1],[1.1,1.2,1.3]]])
  const kernel=fromRows([[1,2,3]])
  const node={params:{outside:'wrap'}}
  const samples=CONSTRUCTION_PARTS.windowTable.eval({image,kernel},node,{},'samples')
  const weights=CONSTRUCTION_PARTS.windowTable.eval({image,kernel},node,{},'weights')
  assert.deepEqual([samples.w,samples.h,samples.c],[3,4,3])
  assert.deepEqual(toRows(weights),[[1,2,3],[1,2,3],[1,2,3],[1,2,3]])
  assert.deepEqual(toRows(samples)[0],[[.5,.6,.7],[.2,.3,.4],[.5,.6,.7]])
  assert.throws(()=>CONSTRUCTION_PARTS.expandRows.eval({image:make(100,100)},{}))
  assert.throws(()=>CONSTRUCTION_PARTS.restore.eval({values:fromRows([[1,2]]),shape:image}))
})

test('earned kernels and direction-input lines match independent direct filtering on rectangular RGB data', () => {
  const v=course()
  const rows=[[[.1,.2,.3],[.9,.5,.6],[.4,.7,.2]],[[.8,.3,.2],[.2,.4,.5],[.6,.1,.9]]]
  for(const outside of ['zero','clamp']) {
    const out=run(v,'convolve',{image:rows,kernel:[[.1,.2,.4]]},`[outside=${outside}]`).out
    approx(out,filterImage(fromRows(rows),fromRows([[.1,.2,.4]]),{outside,convention:'convolution'}))
    const line=CONSTRUCTION_PARTS.weightedLine.eval({image:fromRows(rows),weights:fromRows([[.1,.2,.4]]),d:{x:0,y:1}},{params:{outside}})
    approx(line,filterImage(fromRows(rows),fromRows([[.1],[.2],[.4]]),{outside}))
  }
  const valid=CONSTRUCTION_PARTS.trim.eval({image:make(5,4,1,(x,y)=>10*y+x),r:{x:1,y:1}})
  assert.deepEqual(toRows(valid),[[11,12,13],[21,22,23]])
})

// This direct 2D reference does not use the domain's row-expansion or reduction machinery.
function direct2D(real,imag) {
  const h=real.length,w=real[0].length
  const out={re:make(w,h),im:make(w,h)}
  for(let v=0;v<h;v++)for(let u=0;u<w;u++)for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const a=2*Math.PI*(u*x/w+v*y/h),c=Math.cos(a),s=Math.sin(a),at=v*w+u
    out.re.data[at]+=(real[y][x]*c+imag[y][x]*s)/(w*h)
    out.im.data[at]+=(imag[y][x]*c-real[y][x]*s)/(w*h)
  }
  return out
}
test('learner Fourier circuits match an independent complex 2D transform including phase, DC and non-square sizes',()=>{
  const v=course()
  for(const [w,h] of [[3,2],[5,3],[4,4]]) {
    const real=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>.3+Math.sin(.7*x+1.2*y)))
    const imag=real.map((r,y)=>r.map((_,x)=>.2*Math.cos(.3*x-.4*y)))
    const got=run(v,'spectrum2D',{real,imag}),want=direct2D(real,imag)
    approx(got.re,want.re);approx(got.im,want.im)
    const realOnly=direct2D(real,real.map(r=>r.map(()=>0)))
    const back=run(v,'synthesise2D',{real:toRows(realOnly.re),imag:toRows(realOnly.im)})
    approx(back.out,fromRows(real));approx(back.imaginary,make(w,h))
  }
})

test('nested packed reuse runs the actual passed circuit and forwards only declared spatial settings',()=>{
  const v=course(),task=v.builtBy('difference')
  const owned=fromText(['ownReverse = sub(b,a)','ownAbs = abs(ownReverse)','out <- ownAbs'],task,v.partOf)
  v.syncOwn({[task.taskId]:owned})
  const aligned=v.builtBy('alignedDifference'),example=aligned.tests[0]
  const result=runTest(aligned,aligned.solution,example,v.partOf)
  assert.equal(result.fail,undefined)
  assert.ok(result.trace.some(s=>s.node?.id==='ownAbs'||s.id==='ownAbs'),JSON.stringify(result.trace.map(s=>({id:s.id,node:s.node?.id,path:s.path}))))
  v.syncOwn()
  const reflected=run(v,'convolve',{image:[[2,5,9]],kernel:[[1,0,0]]},'[outside=reflect]').out
  assert.deepEqual(toRows(reflected),[[5,9,9]])
  assert.equal(v.BUILT.convolve.opens({outside:'reflect'}).circuit.nodes.find(n=>n.type==='correlate').params.outside,'reflect')
})

test('new packed-node defaults preserve internal axis choices instead of overriding hidden settings',()=>{
  const v=course()
  const rows=[[.1,.9,.4,.3],[.8,.2,.6,.5],[.3,.7,.1,.9]],h=[.1,.2,.4]
  const placed=(type)=>{
    const params=builtDefaults(v.builtBy(type).builds)
    assert.deepEqual(Object.keys(params).sort(),[...(v.builtBy(type).builds.settings??[])].sort())
    return '['+Object.entries(params).map(([k,val])=>`${k}=${val}`).join(',')+']'
  }
  assert.equal(placed('separable3'),'[outside=zero]')
  approx(run(v,'separable3',{image:rows,weights:[h],horizontal:{x:1,y:0},vertical:{x:0,y:1}},placed('separable3')).out,filterImage(fromRows(rows),fromRows(h.map(a=>h.map(b=>a*b))),{outside:'zero'}))
  approx(CONSTRUCTION_PARTS.weightedLine.eval({image:fromRows(rows),weights:fromRows([h]),d:{x:0,y:1}},{params:{outside:'zero'}}),filterImage(fromRows(rows),fromRows(h.map(x=>[x])),{outside:'zero'}))
  approx(run(v,'convolve',{image:rows,kernel:[h]},placed('convolve')).out,filterImage(fromRows(rows),fromRows([h]),{outside:'zero',convention:'convolution'}))
})


test('offset reads preserve channels and signed values for horizontal, vertical and diagonal displacements',()=>{
  const image=make(3,2,3,(x,y,ch)=>10*y+3*x+ch-4)
  for(const outside of ['zero','clamp','wrap','reflect'])for(const [dx,dy] of [[-1,0],[0,1],[1,-1],[0,0]]){
    const got=CONSTRUCTION_PARTS.shift.eval({image,d:{x:dx,y:dy}},{params:{outside}})
    approx(got,make(3,2,3,(x,y,ch)=>readOutside(image,x+dx,y+dy,ch,outside)))
  }
  for(const [dx,dy] of [[.5,0],[0,.5]])assert.throws(()=>CONSTRUCTION_PARTS.shift.eval({image,d:{x:dx,y:dy}},{}))
})


test('weighted-line preset accepts one weight vector and matches direct filtering across borders and directions',()=>{
  const image=make(4,3,3,(x,y,ch)=>(x-2)*.3+y+ch*.2)
  for(const outside of ['zero','clamp'])for(const d of [{x:1,y:0},{x:0,y:1},{x:-1,y:0}]){
    const weights=fromRows([[-1,.5,2]])
    const got=CONSTRUCTION_PARTS.weightedLine.eval({image,weights,d},{params:{outside}})
    const row=d.x<0?[[2,.5,-1]]:[[-1,.5,2]]
    const kernel=fromRows(d.y?row[0].map(v=>[v]):row)
    approx(got,filterImage(image,kernel,{outside}))
  }
  for(const [outside,want] of [['wrap',[[9,2,5]]],['reflect',[[2,2,5]]]]){
    const out=CONSTRUCTION_PARTS.weightedLine.eval({image:fromRows([[2,5,9]]),weights:fromRows([[1,0,0]]),d:{x:1,y:0}},{params:{outside}})
    assert.deepEqual(toRows(out),want)
  }
  const run=weights=>CONSTRUCTION_PARTS.weightedLine.eval({image,weights,d:{x:1,y:0}}, {})
  for(const rows of [[[1,2]],[[1],[2],[3]],[[[1,2,3]]]])assert.throws(()=>run(fromRows(rows)))
  assert.throws(()=>run(1))
  assert.deepEqual(CONSTRUCTION_PARTS.weightedLine.inputs,['image','weights','d'])
  assert.equal(CONSTRUCTION_PARTS.weightedLine.opens,undefined)
})


test('weighted-line preset never reads a saved learner implementation',()=>{
  const task=circuit('preset_use',{inputs:['image','weights',{name:'d',type:'vector'}],adds:['weightedLine'],configurations:{'*.outside':['zero']},solution:['p = weightedLine(image,weights,d)','out <- p'],tests:[{inputs:{image:[[2,5,9]],weights:[[1,0,0]],d:{x:1,y:0}},expect:{out:[[0,2,5]]}}]})
  const v=domain.spec(game({levels:[level('P',task)]})).vision
  assert.equal(v.BUILT.weightedLine,undefined)
  v.syncOwn({preset_use:{nodes:[],wires:[]}})
  const source=v.played.get('P')[0]
  const result=runTest(source,source.solution,source.tests[0],v.partOf)
  assert.equal(result.fail,undefined)
  assert.deepEqual(toRows(result.outputs.out),[[0,2,5]])
  assert.equal(v.partOf('weightedLine').opens,undefined)
  v.syncOwn()
})
