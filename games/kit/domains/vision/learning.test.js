import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { pinhole, pinholeView } from './benches/pinhole.js'
import { filterWindow } from './filter-window.js'
import domain from './domain.js'

const trial = () => readContent('vision-lab')

test('shared construction anchors precede independent routes and each join consumes their parts', () => {
  const content = trial()
  const { course, vision } = domain.spec(content)
  const before = (a,b) => Boolean(course.before(a,b))
  assert.equal(before('0-1','0-2'),true)
  for (const sibling of ['1-2','1-3','1-9']) assert.equal(before('1-1',sibling),true)
  for (const [a,b] of [['1-2','1-3'],['1-3','1-9'],['2-5','2-7']]) {
    assert.equal(before(a,b),false); assert.equal(before(b,a),false)
  }
  for(const id of ['1-5','1-8','1-9']) assert.equal(before(id,'1-10'),true)
  for(const id of ['2-11','2-12']) assert.equal(before(id,'2-13'),true)
  assert.ok(content.levels.every(l=>l.tasks.every(t=>t.kind==='circuit')))
  for(const type of ['sample','stencil','kernelFilter','colourMix']) assert.equal(content.primitives.includes(type),false)
  assert.ok(content.levels.find(l=>l.id==='1-10').tasks[0].solution.some(s=>s.includes('sobel[')))
  assert.ok(content.levels.find(l=>l.id==='2-13').tasks[0].solution.some(s=>s.includes('synthesise2D(')))
  assert.equal(vision.wrong.length,0)
})

test('the camera model retains framing coverage independently of the current curriculum', () => {
  const model=pinhole.make({sensor:{height:24,width:36,pxHeight:240,pxWidth:360},object:'arrow',objects:[{id:'tower',X:0,H:120,Z:240},{id:'lamp',X:80,H:10,Z:80}],unit:'mm'} )
  const clipped=model.view({f:32,aim:0})
  assert.equal(clipped.in_tower,0)
  const partial=model.view({f:32,aim:55})
  assert.equal(partial.visible_lamp,1)
  assert.equal(partial.in_lamp,0)
  const framed=model.view({f:32,aim:40})
  assert.equal(framed.in_tower,1);assert.equal(framed.h_tower,16);assert.equal(framed.visible_lamp,0)
})

test('pixel conversion uses the chosen axis pitch and keeps signed offset distinct from column', () => {
  const setup = { axis: 'horizontal', sensor: { width: 8, height: 10, pxWidth: 16, pxHeight: 100 } }
  const q = pinholeView(setup, { X: -1, Z: 4, f: 2 })
  assert.equal(q.pitch, 0.5)
  assert.equal(q.u_px, -1)
  assert.equal(q.centre, 7.5)
  assert.equal(q.column, 6.5)
  const v = pinholeView({ ...setup, axis: 'vertical' }, { X: -1, Z: 4, f: 2 })
  assert.equal(v.pitch, 0.1)
  assert.equal(v.u_px, -5)
  assert.equal(q.fov, v.fov, 'vertical FOV does not change when the coordinate axis changes')
  assert.equal(q.fovW, v.fovW)
})

test('the neighbourhood aid reads positional weights and zero padding along the requested axis', () => {
  const rows = [[1, 3], [4, 0], [2, 8]]
  const vertical = filterWindow(rows, { weights: [1, 0, -1], axis: 'column' }, 1, 1)
  assert.deepEqual(vertical.map((f) => [f.x, f.y, f.value, f.weight]), [[1, 0, 3, 1], [1, 1, 0, 0], [1, 2, 8, -1]])
  const edge = filterWindow(rows, { weights: [1, 2, 3], axis: 'row' }, 0, 0)
  assert.deepEqual(edge.map((f) => [f.value, f.outside]), [[0, true], [1, false], [3, false]])
})

test('save invalidation preserves copy changes but drops answers whose output contract changed', () => {
  const level = trial().levels.find((l) => l.id === '2-13')
  const copy = structuredClone(level)
  copy.intro = [{ t: 'Different wording' }]
  assert.equal(domain.changes.stale(level, copy), false)
  copy.tasks[0].outputs.pop()
  assert.equal(domain.changes.stale(level, copy), true)
  const program = structuredClone(level)
  program.tasks[0].solution = ['out <- image']
  assert.equal(domain.changes.stale(level, program), true, 'changed reference semantics invalidate built parts too')
})

test('changed starter circuits invalidate saved boards while copy edits preserve them', () => {
  const level = trial().levels.find((l) => l.id === '1-1')
  const changed = structuredClone(level)
  changed.tasks[0].starter = ['g = grid(w, h)']
  assert.equal(domain.changes.stale(level, changed), true)
})
