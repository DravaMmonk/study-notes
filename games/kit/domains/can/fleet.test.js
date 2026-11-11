import { test } from 'node:test'
import { deepStrictEqual } from 'node:assert'
import { fleetReply } from './fleet.js'

const fleet = [{ online: true, version: 0 }, { online: false, version: 2 }]
const read = [0x22, 0xf1, 0x88]

test('fleet preserves a zero version and keeps offline nodes silent', () => {
  deepStrictEqual(fleetReply(0, read, fleet), { source: 0, response: [0x62, 0xf1, 0x88, 0] })
  deepStrictEqual(fleetReply(1, read, fleet), { source: null, response: null })
  deepStrictEqual(fleetReply(2, read, fleet), { source: null, response: null })
  deepStrictEqual(fleetReply(0, null, fleet), { source: null, response: null })
  deepStrictEqual(fleetReply(0, [0x55], fleet), { source: 0, response: [0x7f, 0x55, 0x11] })
})
