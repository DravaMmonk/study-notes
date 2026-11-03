import { test } from 'node:test'
import assert from 'node:assert/strict'
import { playFrame } from './viewport.js'

test('elastic offsets cannot displace the play surface, including after keyboard dismissal', () => {
  for (const offsetTop of [-160, 0, 240, 800]) {
    assert.deepEqual(playFrame({ height: 700, offsetTop }, 700, false), { height: 700, top: 0 })
    assert.deepEqual(playFrame({ height: 700, offsetTop }, 700, true), { height: 700, top: 0 })
  }
})

test('keyboard panning stays inside the layout viewport and handles a resized browser bar', () => {
  assert.deepEqual(playFrame({ height: 400, offsetTop: 120 }, 700, true), { height: 400, top: 120 })
  assert.deepEqual(playFrame({ height: 400, offsetTop: 600 }, 700, true), { height: 400, top: 300 })
  assert.deepEqual(playFrame({ height: 760, offsetTop: -40 }, 700, false), { height: 700, top: 0 })
})
