import test from 'node:test'
import assert from 'node:assert/strict'
import { visibleSlot } from './visibleSlot.js'

test('tray taps choose the first visible slot, then the first below, never one above', () => {
  const slots = [
    { slot: 1, top: 10, bottom: 30 },
    { slot: 4, top: 100, bottom: 140 },
    { slot: 3, top: 100, bottom: 140 },
    { slot: 7, top: 200, bottom: 240 },
  ]
  assert.equal(visibleSlot(slots, 110, 180, 8), 3)
  assert.equal(visibleSlot(slots, 150, 180, 8), 7)
  assert.equal(visibleSlot(slots, 250, 300, 8), 8)
  assert.equal(visibleSlot([], 0, 100, 2), 2)
})
