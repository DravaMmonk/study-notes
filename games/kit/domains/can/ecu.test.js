import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ecuReply } from './ecu.js'

test('a configured diagnostic identifier returns its own record', () => {
  const ecu = { did: 0xf190, value: [65, 66, 67] }
  assert.deepEqual(ecuReply([0x22, 0xf1, 0x90], ecu), [0x62, 0xf1, 0x90, 65, 66, 67])
  assert.deepEqual(ecuReply([0x22, 0xf1, 0x91], ecu), [0x7f, 0x22, 0x31])
  assert.deepEqual(ecuReply([0x22, 0xf1], ecu), [0x7f, 0x22, 0x13])
  assert.deepEqual(ecuReply([0x99], ecu), [0x7f, 0x99, 0x11])
  assert.equal(ecuReply(null, ecu), null)
})

test('pending responses precede the final data and ignore repeated requests', async () => {
  const { ecuAdvance } = await import('./ecu.js')
  const profile = { did: 0xf190, value: [65], waits: 2 }
  let state = { reply: null, pending: null, session: 1, idle: 0 }
  state = ecuAdvance(state, [0x22, 0xf1, 0x90], profile)
  assert.deepEqual(state.reply, [0x7f, 0x22, 0x78])
  state = ecuAdvance(state, [0x99], profile)
  assert.deepEqual(state.reply, [0x7f, 0x22, 0x78])
  state = ecuAdvance(state, null, profile)
  assert.deepEqual(state.reply, [0x62, 0xf1, 0x90, 65])
  assert.equal(ecuAdvance(state, null, profile).reply, null)
})

test('an extended-session record is protected until the session changes', async () => {
  const { ecuAdvance } = await import('./ecu.js')
  const profile = { did: 0xf190, value: [42], requiresExtended: true, waits: 0 }
  let state = { reply: null, pending: null, session: 1, idle: 0 }
  state = ecuAdvance(state, [0x22, 0xf1, 0x90], profile)
  assert.deepEqual(state.reply, [0x7f, 0x22, 0x22])
  state = ecuAdvance(state, [0x10, 3], profile)
  assert.deepEqual(state.reply, [0x50, 3, 0, 50, 1, 244])
  state = ecuAdvance(state, [0x22, 0xf1, 0x90], profile)
  assert.deepEqual(state.reply, [0x62, 0xf1, 0x90, 42])
  state = ecuAdvance(state, [0x10, 1], profile)
  assert.equal(state.session, 1)
  assert.deepEqual(ecuAdvance(state, [0x22, 0xf1, 0x90], profile).reply, [0x7f, 0x22, 0x22])
})

test('tester-present messages keep an extended session from expiring', async () => {
  const { ecuAdvance } = await import('./ecu.js')
  const profile = { did: 0xf190, value: [42], requiresExtended: true, waits: 0, timeout: 3 }
  let state = { reply: null, pending: null, session: 1, idle: 0 }
  for (const request of [[0x10, 3], null, [0x3e, 0], null, [0x3e, 0], null, [0x22, 0xf1, 0x90]]) state = ecuAdvance(state, request, profile)
  assert.deepEqual(state.reply, [0x62, 0xf1, 0x90, 42])
  for (let i = 0; i < 3; i++) state = ecuAdvance(state, null, profile)
  assert.equal(state.session, 1)
  assert.deepEqual(ecuAdvance(state, [0x22, 0xf1, 0x90], profile).reply, [0x7f, 0x22, 0x22])
})
