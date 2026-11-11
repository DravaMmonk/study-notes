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

test('wait responses delay each grant, and overflow aborts without sending data', () => {
  const profile = { message: Array.from({ length: 22 }, (_, i) => i), blockSize: 1, separation: 1, flowDelay: 2, waits: 2 }
  const plan = transportPlan(profile)
  let state = newTransportState()
  const responses = []
  for (let tick = 0; tick <= Math.max(...plan.keys()); tick++) {
    if (state.response) responses.push([tick, state.response[0]])
    state = advanceTransport(state, plan.get(tick) ?? null, profile, tick)
  }
  assert.equal(state.error, null)
  assert.equal(state.complete, true)
  assert.deepEqual(responses.slice(0, 3), [[2, 0x31], [4, 0x31], [6, 0x30]])
  const overflow = { ...profile, overflow: true }
  state = newTransportState()
  for (let tick = 0; tick <= 6; tick++) state = advanceTransport(state, transportPlan(overflow).get(tick) ?? null, overflow, tick)
  assert.equal(state.aborted, true)
  assert.equal(state.complete, false)
  assert.equal(state.error, null)
})

test('a silent receiver requires a timed abort, not an early abort', () => {
  const profile = { message: Array.from({ length: 8 }, (_, i) => i), blockSize: 0, separation: 0, flowDelay: 2, silent: true, timeout: 3 }
  const first = transportPlan(profile).get(0)
  let state = advanceTransport(newTransportState(), first, profile, 0)
  const early = advanceTransport(state, null, profile, 1, true)
  assert.equal(early.error, 'unexpected timeout')
  state = advanceTransport(state, null, profile, 1)
  state = advanceTransport(state, null, profile, 2)
  state = advanceTransport(state, null, profile, 3, true)
  assert.equal(state.aborted, true)
  assert.equal(state.error, null)
})
