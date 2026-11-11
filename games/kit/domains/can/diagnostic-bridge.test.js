import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceDiagnosticBridge, newDiagnosticBridge } from './diagnostic-bridge.js'

test('the ECU responds to an actual request and waits for flow control', () => {
  const profile = { did: 0xf190, value: Array.from({ length: 17 }, (_, i) => 65 + i) }
  let state = advanceDiagnosticBridge(newDiagnosticBridge(), [3, 0x22, 0xf1, 0x90], profile)
  assert.deepEqual(state.frame, [0x10, 20, 0x62, 0xf1, 0x90, 65, 66, 67])
  assert.equal(advanceDiagnosticBridge(state, null, profile).error, 'expected unlimited flow control')
  state = advanceDiagnosticBridge(state, [0x30, 0, 0], profile)
  assert.deepEqual(state.frame, [0x21, 68, 69, 70, 71, 72, 73, 74])
  state = advanceDiagnosticBridge(state, null, profile)
  assert.deepEqual(state.frame, [0x22, 75, 76, 77, 78, 79, 80, 81])
  state = advanceDiagnosticBridge(state, null, profile)
  assert.equal(state.phase, 'done')
  assert.equal(state.error, null)
})
