import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceTransport, newTransportState, transportPlan } from './transport.js'

test('the receiver grants flow control and reassembles the planned frames', () => {
  const profile = { message: Array.from({ length: 31 }, (_, i) => i), blockSize: 2, separation: 2, flowDelay: 3 }
  const plan = transportPlan(profile)
  let state = newTransportState()
  for (let tick = 0; tick <= Math.max(...plan.keys()); tick++) state = advanceTransport(state, plan.get(tick) ?? null, profile, tick)
  assert.equal(state.error, null)
  assert.equal(state.complete, true)
  assert.deepEqual(state.data, profile.message)
})

test('the receiver rejects a frame sent before permission or with a bad sequence', () => {
  const profile = { message: Array.from({ length: 15 }, (_, i) => i), blockSize: 1, separation: 1, flowDelay: 3 }
  let state = advanceTransport(newTransportState(), transportPlan(profile).get(0), profile, 0)
  state = advanceTransport(state, [0x21, ...profile.message.slice(6, 13)], profile, 1)
  assert.equal(state.error, 'unexpected consecutive frame')
  state = newTransportState()
  state = advanceTransport(state, transportPlan(profile).get(0), profile, 0)
  state = advanceTransport(state, null, profile, 1)
  state = advanceTransport(state, null, profile, 2)
  state = advanceTransport(state, [0x22, ...profile.message.slice(6, 13)], profile, 3)
  assert.equal(state.error, 'unexpected consecutive frame')
})
