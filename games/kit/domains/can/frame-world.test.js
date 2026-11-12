import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scheduleFrames, scheduleObservations } from './frame-world.js'
import { contender, frameBits, sayer, transmitBits, wiredAnd } from './bus.js'
import { runTicks } from '../../engine/ticks.js'

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

test('the first frame agrees with independently sampled bit-level arbitration', () => {
  const requests = [{ node: 'a', at: 0, id: 0x321, data: [3] }, { node: 'b', at: 0, id: 0x123, data: [8, 9] }]
  const [winner] = scheduleFrames(requests)
  const bits = frameBits(requests[1])
  const ack = bits.map((_, tick) => tick === bits.length - 12 ? 0 : 1)
  const run = runTicks({ nodes: [...requests.map((frame) => contender(frame.node, frame)), sayer('receiver', ack)], ticks: bits.length, line: wiredAnd })
  assert.equal(winner.node, 'b')
  assert.deepEqual(run.steps.map((step) => step.line), bits)
})


test('clock checks appear in time order without becoming frames', () => {
  const frames = [{ node: 'a', at: 10, id: 0x120, data: [4] }, { node: 'b', at: 150, id: 0x121, data: [5] }]
  const events = scheduleObservations(frames, [0, 120, 300])
  assert.deepEqual(events.map(({ start, id }) => [start, id]), [[0, null], [10, 0x120], [120, null], [150, 0x121], [300, null]])
  assert.equal(events[2].data, null)
  assert.throws(() => scheduleObservations(frames, [10]), /clock checks/)
  assert.throws(() => scheduleObservations(frames, [120, 120]), /clock checks/)
})

test('board frame requests participate in clean arbitration', async () => {
  const { scheduleEmissions } = await import('./frame-world.js')
  const ticks = [{ tick: 0, outputs: { send: true, id: 0x200, data: [1, 2] } }, { tick: 1, outputs: { send: false } }]
  const events = scheduleEmissions(ticks, { send: 'send', id: 'id', data: 'data' }, [{ node: 'other', at: 0, id: 0x100, data: [] }])
  assert.deepEqual(events.map(({ node }) => node), ['other', 'you'])
  assert.equal(events[1].start, events[0].end)
  assert.throws(() => scheduleEmissions([{ tick: 0, outputs: { send: true, id: -1, data: [] } }], { send: 'send', id: 'id', data: 'data' }), /invalid frame request/)
})
