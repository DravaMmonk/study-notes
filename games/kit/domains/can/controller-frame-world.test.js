import { test } from 'node:test'
import assert from 'node:assert/strict'
import { transmitBits } from './bus.js'
import { projectController } from './controller-frame-world.js'

const params = { start: 'start', prep: 'prep', request: 'request' }
function scenario(tx, length = 350) {
  return { tx, contenders: [], ticks: length, flipTicks: [], bus: { bits: Array(length).fill(1), frames: [{ at: 10, id: 0x100, data: [7] }] }, inputs: { start: Array.from({ length }, (_, tick) => Number(tick === 100)), prep: Array(length).fill(0), request: Array(length).fill(0) } }
}

test('event projection accounts for a failed acknowledgement before a successful retry', () => {
  const tx = { id: 0x234, data: [1] }, sample = scenario(tx), bits = transmitBits(tx)
  const firstAck = 100 + bits.length - 12, retry = firstAck + 18
  sample.bus.bits[retry + bits.length - 12] = 0
  const result = projectController(sample, params)
  assert.deepEqual(result.attempts, [{ tick: 100, tec: 0, rec: 0 }, { tick: retry, tec: 8, rec: 0 }])
  assert.equal(result.done, retry + bits.length - 1)
  assert.equal(result.tec, 7)
  assert.deepEqual(result.receptions, [{ id: 0x100, data: [7] }])
})

test('event projection receives an arbitration winner before retrying', () => {
  const tx = { id: 0x500, data: [] }, rival = { id: 0x080, data: [4], at: 100 }, sample = scenario(tx)
  sample.contenders = [rival]
  const retry = 100 + transmitBits(rival).length
  sample.bus.bits[retry + transmitBits(tx).length - 12] = 0
  const result = projectController(sample, params)
  assert.deepEqual(result.attempts.map((attempt) => attempt.tick), [100, retry])
  assert.deepEqual(result.receptions, [{ id: 0x100, data: [7] }, { id: 0x080, data: [4] }])
})
