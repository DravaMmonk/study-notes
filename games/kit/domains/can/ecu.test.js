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
  let state = { reply: null, pending: null, session: 1, idle: 0, unlocked: false, seedIssued: false, failures: 0, locked: 0 }
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
  let state = { reply: null, pending: null, session: 1, idle: 0, unlocked: false, seedIssued: false, failures: 0, locked: 0 }
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
  let state = { reply: null, pending: null, session: 1, idle: 0, unlocked: false, seedIssued: false, failures: 0, locked: 0 }
  for (const request of [[0x10, 3], null, [0x3e, 0], null, [0x3e, 0], null, [0x22, 0xf1, 0x90]]) state = ecuAdvance(state, request, profile)
  assert.deepEqual(state.reply, [0x62, 0xf1, 0x90, 42])
  for (let i = 0; i < 3; i++) state = ecuAdvance(state, null, profile)
  assert.equal(state.session, 1)
  assert.deepEqual(ecuAdvance(state, [0x22, 0xf1, 0x90], profile).reply, [0x7f, 0x22, 0x22])
})

test('fictional seed-key security protects a record and temporarily locks repeated failures', async () => {
  const { ecuAdvance } = await import('./ecu.js')
  const profile = { did: 0xf190, value: [42], requiresExtended: true, requiresSecurity: true, seed: 0x12, waits: 0 }
  let state = { reply: null, pending: null, session: 1, idle: 0, unlocked: false, seedIssued: false, failures: 0, locked: 0 }
  state = ecuAdvance(state, [0x10, 3], profile)
  assert.deepEqual(ecuAdvance(state, [0x22, 0xf1, 0x90], profile).reply, [0x7f, 0x22, 0x33])
  state = ecuAdvance(state, [0x27, 1], profile)
  assert.deepEqual(state.reply, [0x67, 1, 0x12])
  state = ecuAdvance(state, [0x27, 2, 0x48], profile)
  assert.deepEqual(state.reply, [0x67, 2])
  assert.deepEqual(ecuAdvance(state, [0x22, 0xf1, 0x90], profile).reply, [0x62, 0xf1, 0x90, 42])
  state = ecuAdvance(state, [0x10, 1], profile)
  state = ecuAdvance(state, [0x10, 3], profile)
  for (let i = 0; i < 3; i++) { state = ecuAdvance(state, [0x27, 1], profile); state = ecuAdvance(state, [0x27, 2, 0], profile) }
  assert.deepEqual(state.reply, [0x7f, 0x27, 0x36])
  state = ecuAdvance(state, [0x27, 1], profile)
  assert.deepEqual(state.reply, [0x7f, 0x27, 0x37])
  for (let i = 0; i < 2; i++) state = ecuAdvance(state, null, profile)
  assert.deepEqual(ecuAdvance(state, [0x27, 1], profile).reply, [0x67, 1, 0x12])
})

test('trouble-code status filtering and clearing change the actual ECU state', async () => {
  const { ecuAdvance } = await import('./ecu.js')
  const profile = { did: 0xf190, value: [], waits: 0 }
  let state = { reply: null, pending: null, session: 1, idle: 0, unlocked: false, seedIssued: false, failures: 0, locked: 0, dtcs: [{ code: 0x123456, status: 8 }, { code: 0xabcdef, status: 1 }, { code: 0x010203, status: 9 }] }
  state = ecuAdvance(state, [0x19, 2, 8], profile)
  assert.deepEqual(state.reply, [0x59, 2, 255, 0x12, 0x34, 0x56, 8, 1, 2, 3, 9])
  state = ecuAdvance(state, [0x14, 255, 255, 255], profile)
  assert.deepEqual(state.reply, [0x54])
  assert.deepEqual(ecuAdvance(state, [0x19, 2, 8], profile).reply, [0x59, 2, 255])
})

test('the ECU drives the fictional programmer and returns to default session after reset', async () => {
  const { ecuAdvance } = await import('./ecu.js')
  const { newFlashState } = await import('./flash.js')
  const profile = { did: 0xf190, value: [1], waits: 0, flash: { maxBlock: 4, expectedChecksum: 3 } }
  let state = { reply: null, pending: null, session: 1, idle: 0, unlocked: false, seedIssued: false, failures: 0, locked: 0, dtcs: [], flash: newFlashState() }
  for (const request of [[0x10, 2], [0x31, 1, 255, 0], [0x34, 0, 0x12, 0, 0, 2], [0x36, 1, 1, 2], [0x37], [0x31, 1, 255, 1], [0x11, 1]]) state = ecuAdvance(state, request, profile)
  assert.deepEqual(state.reply, [0x51, 1])
  assert.equal(state.session, 1)
  assert.equal(state.flash.applicationValid, true)
})

test('power loss leaves an incomplete application invalid and requires a new erase', async () => {
  const { ecuAdvance } = await import('./ecu.js')
  const { newFlashState } = await import('./flash.js')
  const profile = { did: 0xf190, value: [], waits: 0, powerCycles: [4], flash: { maxBlock: 4, expectedChecksum: 10 } }
  let state = { reply: null, pending: null, session: 1, idle: 0, unlocked: false, seedIssued: false, failures: 0, locked: 0, dtcs: [], flash: newFlashState() }
  const before = [[0x10, 2], [0x31, 1, 255, 0], [0x34, 0, 0x12, 0, 0, 4], [0x36, 1, 1, 2], null]
  before.forEach((request, tick) => { state = ecuAdvance(state, request, profile, tick) })
  assert.equal(state.session, 1)
  assert.equal(state.flash.applicationValid, false)
  assert.deepEqual(state.flash.data, [1, 2])
  state = ecuAdvance(state, [0x10, 2], profile, 5)
  assert.deepEqual(ecuAdvance(state, [0x36, 2, 3, 4], profile, 6).reply, [0x7f, 0x36, 0x24])
  for (const [tick, request] of [[6, [0x31, 1, 255, 0]], [7, [0x34, 0, 0x12, 0, 0, 4]], [8, [0x36, 1, 1, 2]], [9, [0x36, 2, 3, 4]], [10, [0x37]], [11, [0x31, 1, 255, 1]], [12, [0x11, 1]]]) state = ecuAdvance(state, request, profile, tick)
  assert.deepEqual(state.reply, [0x51, 1])
  assert.equal(state.flash.applicationValid, true)
})
