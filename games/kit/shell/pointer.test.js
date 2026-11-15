import assert from 'node:assert/strict'
import { test } from 'node:test'
import { trackPointer } from '../pointer.js'

const emit = (target, type, data) => target.dispatchEvent(Object.assign(new Event(type), data))

test('a pointer session ignores other pointers and finishes once', (t) => {
  const target = new EventTarget()
  globalThis.window = target
  t.after(() => { delete globalThis.window })
  const events = []
  const cancel = trackPointer(4, { move: ({ x }) => events.push(x), finish: (commit, release) => events.push(commit, release.x) })
  emit(target, 'pointermove', { pointerId: 9, x: 100 })
  emit(target, 'pointercancel', { pointerId: 9 })
  emit(target, 'pointerup', { pointerId: 9 })
  emit(target, 'pointermove', { pointerId: 4, x: 12 })
  emit(target, 'pointerup', { pointerId: 4, x: 15 })
  emit(target, 'pointermove', { pointerId: 4, x: 13 })
  cancel()
  assert.deepEqual(events, [12, true, 15])
})

test('Escape, pointer cancellation, blur and disposal end without committing', (t) => {
  const target = new EventTarget()
  globalThis.window = target
  t.after(() => { delete globalThis.window })
  const events = []
  for (const [type, data] of [['keydown', { key: 'Escape' }], ['pointercancel', { pointerId: 4 }], ['blur', {}], [null]]) {
    const cancel = trackPointer(4, { move: () => assert.fail('moved after disposal'), finish: (commit) => events.push(commit), escape: true })
    if (type === null) cancel()
    else emit(target, type, data)
    cancel()
    emit(target, 'pointermove', { pointerId: 4 })
    emit(target, 'pointerup', { pointerId: 4 })
  }
  assert.deepEqual(events, [false, false, false, false])
})
