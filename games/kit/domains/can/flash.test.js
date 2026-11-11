import { test } from 'node:test'
import assert from 'node:assert/strict'
import { flashRequest, newFlashState } from './flash.js'

const profile = { maxBlock: 4, expectedChecksum: 10, requiresSecurity: false }
test('programming follows erase, download, blocks, exit, check and reset', () => {
  let flash = newFlashState()
  const send = (request) => { const r = flashRequest(flash, request, profile, 2, false); flash = r.flash; return r.reply }
  assert.deepEqual(send([0x34, 0, 0x12, 0, 0, 4]), [0x7f, 0x34, 0x24])
  assert.deepEqual(send([0x31, 1, 0xff, 0]), [0x71, 1, 0xff, 0])
  assert.equal(flash.applicationValid, false)
  assert.deepEqual(send([0x34, 0, 0x12, 0, 0, 4]), [0x74, 0x10, 4])
  assert.deepEqual(send([0x36, 1, 1, 2]), [0x76, 1])
  assert.deepEqual(send([0x36, 1, 1, 2]), [0x76, 1])
  assert.deepEqual(flash.data, [1, 2])
  assert.deepEqual(send([0x36, 3, 3, 4]), [0x7f, 0x36, 0x73])
  assert.deepEqual(send([0x37]), [0x7f, 0x37, 0x24])
  assert.deepEqual(send([0x36, 2, 3, 4]), [0x76, 2])
  assert.deepEqual(send([0x37]), [0x77])
  assert.deepEqual(send([0x31, 1, 0xff, 1]), [0x71, 1, 0xff, 1, 10, 0])
  assert.deepEqual(send([0x11, 1]), [0x51, 1])
  assert.equal(flash.applicationValid, true)
})

test('block sequence wraps and failed checks prevent restart', () => {
  let flash = newFlashState()
  const send = (request) => { const r = flashRequest(flash, request, { ...profile, maxBlock: 3 }, 2, false); flash = r.flash; return r.reply }
  send([0x31, 1, 0xff, 0]); send([0x34, 0, 0x12, 0, 1, 0])
  for (let i = 1; i <= 256; i++) assert.deepEqual(send([0x36, i & 255, 0]), [0x76, i & 255])
  assert.deepEqual(send([0x37]), [0x77])
  assert.deepEqual(send([0x31, 1, 0xff, 1]), [0x71, 1, 0xff, 1, 0, 1])
  assert.deepEqual(send([0x11, 1]), [0x7f, 0x11, 0x22])
  assert.equal(flash.applicationValid, false)
})
