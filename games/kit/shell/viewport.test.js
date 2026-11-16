import { test } from 'node:test'
import assert from 'node:assert/strict'
import { playFrame } from './viewport.js'

test('elastic offsets cannot displace the play surface, including after keyboard dismissal', () => {
  for (const offsetTop of [-160, 0, 240, 800]) {
    assert.deepEqual(playFrame({ height: 700, offsetTop, scale: 1 }, 700, false), { height: 700, top: 0 })
    assert.deepEqual(playFrame({ height: 700, offsetTop, scale: 1 }, 700, true), { height: 700, top: 0 })
  }
})

test('keyboard panning stays inside the layout viewport and handles a resized browser bar', () => {
  assert.deepEqual(playFrame({ height: 400, offsetTop: 120, scale: 1 }, 700, true), { height: 400, top: 120 })
  assert.deepEqual(playFrame({ height: 400, offsetTop: 600, scale: 1 }, 700, true), { height: 400, top: 300 })
  assert.deepEqual(playFrame({ height: 760, offsetTop: -40, scale: 1 }, 700, false), { height: 700, top: 0 })
})

test('native zoom leaves the play surface at layout size, including when panned', () => {
  for (const offsetTop of [0, 240]) {
    const zoomed = { height: 350, offsetTop, scale: 2 }
    assert.equal(playFrame(zoomed, 700, false), null)
    assert.equal(playFrame(zoomed, 700, true), null)
  }
})
