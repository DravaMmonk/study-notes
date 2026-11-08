import test from 'node:test'
import assert from 'node:assert/strict'
import { visibleSlot } from './visibleSlot.js'

test('tray taps choose the topmost, leftmost visible slot and do nothing when none is visible', () => {
  const slots = [
    { slot: 1, top: 10, bottom: 30, left: 0, right: 40 },
    { slot: 4, top: 100, bottom: 140, left: 0, right: 40 },
    { slot: 3, top: 100, bottom: 140, left: 50, right: 90 },
    { slot: 7, top: 200, bottom: 240, left: 0, right: 40 },
  ]
  const bounds = (top, bottom, left = 0, right = 100) => ({ top, bottom, left, right })
  assert.equal(visibleSlot(slots, bounds(110, 180)), 4)
  assert.equal(visibleSlot(slots, bounds(110, 180, 45, 100)), 3)
  assert.equal(visibleSlot(slots, bounds(150, 180)), undefined)
  assert.equal(visibleSlot(slots, bounds(240, 300)), undefined)
  assert.equal(visibleSlot([], bounds(0, 100)), undefined)
})
