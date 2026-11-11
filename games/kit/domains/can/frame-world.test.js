import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scheduleFrames } from './frame-world.js'
import { transmitBits } from './bus.js'

test('clean frames arbitrate by identifier and losers wait through intermission', () => {
  const requests = [{ node: 'high', at: 10, id: 0x500, data: [1] }, { node: 'low', at: 10, id: 0x100, data: [] }, { node: 'later', at: 11, id: 0x200, data: [2] }]
  const events = scheduleFrames(requests)
  assert.deepEqual(events.map((event) => event.node), ['low', 'later', 'high'])
  assert.deepEqual(events[0].contenders, ['low', 'high'])
  assert.equal(events[1].start, 10 + transmitBits(requests[1]).length)
  assert.equal(events[2].start, events[1].end)
  assert.equal(events[2].end, events[2].start + transmitBits(requests[0]).length)
})

test('rejects cases that need a richer collision or queue model', () => {
  const frame = { at: 0, id: 1, data: [] }
  assert.throws(() => scheduleFrames([{ ...frame, node: 'a' }, { ...frame, node: 'b' }]), /equal identifier/)
  assert.throws(() => scheduleFrames([{ ...frame, node: 'a' }, { ...frame, id: 2, node: 'a' }]), /contend with itself/)
  assert.throws(() => scheduleFrames([{ ...frame, data: [256], node: 'a' }]), /invalid/)
})
