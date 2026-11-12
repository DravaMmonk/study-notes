import { test } from 'node:test'
import { deepStrictEqual, equal } from 'node:assert'
import { advanceFleet, newFleetState } from './fleet.js'

const read = [0x22, 0xf1, 0x88]
const profiles = [{ online: true, version: 0 }, { online: false, version: 2 }, { online: true, version: 3, requiresExtended: true }, { online: true, version: 4, waits: 2 }]
const step = (state, target, request, tick) => advanceFleet(state, target, request, profiles, tick)

test('fleet preserves zero versions and leaves offline controllers silent', () => {
  let state = step(newFleetState(profiles), 0, read, 0)
  deepStrictEqual([state.source, state.response], [0, [0x62, 0xf1, 0x88, 0]])
  state = step(state, 1, read, 1)
  deepStrictEqual([state.source, state.response], [null, null])
})

test('sessions and pending responses belong to their controller', () => {
  let state = step(newFleetState(profiles), 2, read, 0)
  deepStrictEqual(state.response, [0x7f, 0x22, 0x22])
  state = step(state, 2, [0x10, 3], 1)
  deepStrictEqual(state.response, [0x50, 3, 0, 0x32, 1, 0xf4])
  state = step(state, 2, read, 2)
  deepStrictEqual(state.response, [0x62, 0xf1, 0x88, 3])
  equal(state.controllers[0].session, 1)
  state = step(state, 3, read, 3)
  deepStrictEqual(state.response, [0x7f, 0x22, 0x78])
  state = step(state, 0, read, 4)
  deepStrictEqual([state.source, state.response], [0, [0x62, 0xf1, 0x88, 0]])
  state = step(state, null, null, 5)
  deepStrictEqual([state.source, state.response], [3, [0x7f, 0x22, 0x78]])
  state = step(state, null, null, 6)
  deepStrictEqual([state.source, state.response], [3, [0x62, 0xf1, 0x88, 4]])
})

test('dependent programming waits for the first controller to restart successfully', () => {
  const flash = { maxBlock: 4, expectedChecksum: 3, image: [1, 2], versionAfter: [7], fixedDtcs: [0x123456] }
  const vehicle = [
    { online: true, version: 1, dtcs: [{ code: 0x123456, status: 8 }], flash },
    { online: true, version: 2, after: 0, flash: { ...flash, versionAfter: [8] } },
  ]
  let state = newFleetState(vehicle), tick = 0
  const send = (target, request) => { state = advanceFleet(state, target, request, vehicle, tick++); return state.response }
  deepStrictEqual(send(1, [0x10, 2]), [0x7f, 0x10, 0x22])
  deepStrictEqual(send(0, [0x10, 2]), [0x50, 2, 0, 0x32, 1, 0xf4])
  deepStrictEqual(send(0, [0x31, 1, 0xff, 0]), [0x71, 1, 0xff, 0])
  deepStrictEqual(send(0, [0x34, 0, 0x12, 0, 0, 2]), [0x74, 0x10, 4])
  deepStrictEqual(send(0, [0x36, 1, 1, 2]), [0x76, 1])
  deepStrictEqual(send(0, [0x37]), [0x77])
  deepStrictEqual(send(0, [0x31, 1, 0xff, 1]), [0x71, 1, 0xff, 1, 3, 0])
  deepStrictEqual(send(0, [0x11, 1]), [0x51, 1])
  deepStrictEqual(send(1, [0x10, 2]), [0x50, 2, 0, 0x32, 1, 0xf4])
  deepStrictEqual(send(0, read), [0x62, 0xf1, 0x88, 7])
  deepStrictEqual(send(0, [0x31, 1, 0xfe, 0]), [0x71, 1, 0xfe, 0])
  equal(state.controllers[0].dtcs.length, 0)
  equal(state.controllers[0].driven, true)
  equal(state.controllers[1].driven, false)
})

test('a broadcast queues replies from online controllers in index order', () => {
  const vehicle = [{ online: true, version: 0 }, { online: false, version: 2 }, { online: true, version: 3 }]
  let state = advanceFleet(newFleetState(vehicle), 255, read, vehicle, 0)
  deepStrictEqual([state.source, state.response], [0, [0x62, 0xf1, 0x88, 0]])
  state = advanceFleet(state, null, null, vehicle, 1)
  deepStrictEqual([state.source, state.response], [2, [0x62, 0xf1, 0x88, 3]])
  state = advanceFleet(state, null, null, vehicle, 2)
  deepStrictEqual([state.source, state.response], [null, null])
})
