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
