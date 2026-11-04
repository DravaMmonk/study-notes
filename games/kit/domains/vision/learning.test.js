import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pinhole, pinholeView } from './benches/pinhole.js'
import { filterWindow } from './filter-window.js'
import domain from './domain.js'
import { T, circuit, level } from './fixture.js'

// A level of one circuit task with two outputs, a starter and words around it.
const saved = () => level('L', circuit('l_pair', {
  inputs: ['image'], outputs: ['out', 'copy'],
  tests: [{ inputs: { image: [[1, 2]] }, expect: { out: [[2, 4]], copy: [[1, 2]] } }],
  solution: ['two = const[value=2]()', 'p = arithmetic[op=mul](image,two)', 'out <- p', 'copy <- image'],
  starter: ['two = const[value=2]()'],
}), { intro: [{ t: T('Words') }] })

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
  const level = saved()
  const copy = saved()
  copy.intro = [{ t: T('Different wording') }]
  copy.tasks[0].brief = T('Different brief')
  copy.tasks[0].outputs[0].label = T('Different label')
  assert.equal(domain.changes.stale(level, copy), false)
  copy.tasks[0].outputs.pop()
  assert.equal(domain.changes.stale(level, copy), true)
  const program = saved()
  program.tasks[0].solution = ['out <- image', 'copy <- image']
  assert.equal(domain.changes.stale(level, program), true, 'changed reference semantics invalidate built parts too')
})

test('changed starter circuits invalidate saved boards while copy edits preserve them', () => {
  const level = saved()
  const changed = saved()
  changed.tasks[0].starter = ['one = const[value=1]()']
  assert.equal(domain.changes.stale(level, changed), true)
  const reworded = saved()
  reworded.tasks[0].step = T('A step name')
  assert.equal(domain.changes.stale(level, reworded), false)
})
