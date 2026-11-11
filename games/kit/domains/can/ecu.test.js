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
