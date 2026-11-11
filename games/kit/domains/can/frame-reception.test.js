import { test } from 'node:test'
import assert from 'node:assert/strict'
import { receivedFrames } from './frame-reception.js'

const tick = (n, outputs = {}, sent = 1, line = 1) => ({ tick: n, outputs, sent, line })

test('publishes checked fields only after the receiver drives ACK', () => {
  const ticks = [tick(0, { rxId: 0x123 }), tick(1, { rxLength: 2 }), tick(2, { rxByte: 0 }), tick(3, { rxByte: 255 }), tick(4, { ready: 1, kind: 0 }), tick(5, {}, 0, 0)]
  assert.deepEqual(receivedFrames(ticks), [{ id: 0x123, data: [0, 255], statusTick: 4, ackTick: 5 }])
  assert.deepEqual(receivedFrames(ticks.slice(0, -1)), [])
  assert.deepEqual(receivedFrames([...ticks.slice(0, -1), tick(5)]), [])
})

test('discards erroneous, incomplete and superseded candidates', () => {
  const ticks = [tick(0, { rxId: 1 }), tick(1, { rxLength: 1 }), tick(2, { rxByte: 4 }), tick(3, { ready: 1, kind: 2 }), tick(4, {}, 0, 0), tick(5, { rxId: 2 }), tick(6, { rxLength: 1 }), tick(7, { rxId: 3 }), tick(8, { rxLength: 0 }), tick(9, { ready: 1, kind: 0 }), tick(10, {}, 0, 0), tick(11, { rxId: 4 }), tick(12, { rxLength: 1 }), tick(13, { ready: 1, kind: 0 }), tick(14, {}, 0, 0)]
  assert.deepEqual(receivedFrames(ticks), [{ id: 3, data: [], statusTick: 9, ackTick: 10 }])
})
