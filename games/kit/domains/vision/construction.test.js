import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { fromRows, make, toRows } from './image.js'
import { fromText } from './board.js'
import { readTest, runTest } from './run.js'
import domain from './domain.js'
import { builtDefaults, CONSTRUCTION_PARTS, readOutside } from './construction.js'
import { filterImage } from './operators.js'

const approx = (a, b, tol = 1e-9) => {
  assert.equal(a.w, b.w); assert.equal(a.h, b.h); assert.equal(a.c, b.c)
  a.data.forEach((v,k) => assert.ok(Math.abs(v-b.data[k]) < tol, `${k}: ${v} versus ${b.data[k]}`))
}
const course = () => domain.spec(readContent('vision-lab')).vision
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

test('earned kernels and axis-parameterised lines match independent direct filtering on rectangular RGB data', () => {
  const v=course()
  const rows=[[[.1,.2,.3],[.9,.5,.6],[.4,.7,.2]],[[.8,.3,.2],[.2,.4,.5],[.6,.1,.9]]]
  for(const outside of ['zero','clamp']) {
    const out=run(v,'convolve',{image:rows,kernel:[[.1,.2,.4]]},`[outside=${outside}]`).out
    approx(out,filterImage(fromRows(rows),fromRows([[.1,.2,.4]]),{outside,convention:'convolution'}))
    const line=run(v,'weightedLine',{image:rows,left:.1,centre:.2,right:.4},`[outside=${outside},axis=y]`).out
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
  for(const type of ['separable3','sobel','convolve','weightedLine']) {
    const task=v.builtBy(type),params=builtDefaults(task.builds)
    assert.deepEqual(Object.keys(params).sort(),[...(task.builds.settings??[])].sort())
    const settings='['+Object.entries(params).map(([k,val])=>`${k}=${val}`).join(',')+']'
    for(const example of task.tests) {
      const raw=Object.fromEntries(Object.entries(example.inputs).map(([key,value])=>[key,typeof value==='number'?value:toRows(value)]))
      const out=run(v,type,raw,settings)
      for(const port of task.outputs)approx(out[port.name],example.expect[port.name])
    }
  }
})
