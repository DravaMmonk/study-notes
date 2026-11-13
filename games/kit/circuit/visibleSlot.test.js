import test from 'node:test'
import assert from 'node:assert/strict'
import { visibleSlot } from './visibleSlot.js'

const outer = { slot: 0, region: null, top: 10, bottom: 30, left: 0, right: 40 }
const inside = { slot: 0, region: 'frame/body', top: 100, bottom: 140, left: 10, right: 45 }
const beside = { slot: 4, region: null, top: 100, bottom: 140, left: 50, right: 90 }
const slots = [beside, inside, outer]
const bounds = (top, bottom, left = 0, right = 100) => ({ top, bottom, left, right })

test('a tray tap can pick a visible slot inside a frame', () => {
  assert.equal(visibleSlot(slots, bounds(110, 180, 0, 45)), inside)
})

test('frame and board slots share top-to-bottom and left-to-right order', () => {
  assert.equal(visibleSlot(slots, bounds(0, 180)), outer)
  assert.equal(visibleSlot(slots, bounds(110, 180)), inside)
  assert.equal(visibleSlot(slots, bounds(110, 180, 45)), beside)
})

test('a slot that refuses the part is skipped', () => {
  assert.equal(visibleSlot(slots, bounds(110, 180), (slot) => slot.region === null), beside)
})

test('no slot is selected when all are offscreen or refuse the part', () => {
  assert.equal(visibleSlot(slots, bounds(140, 200)), undefined)
  assert.equal(visibleSlot(slots, bounds(110, 180), () => false), undefined)
})
