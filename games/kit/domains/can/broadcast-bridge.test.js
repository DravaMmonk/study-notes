import { test } from 'node:test'
import { deepStrictEqual, equal, match } from 'node:assert/strict'
import { advanceBroadcastBridge, newBroadcastBridge } from './broadcast-bridge.js'

test('functional read waits for both flow controls and interleaves the responders', () => {
  const profile = { valueA: Array.from({ length: 17 }, (_, i) => i), valueB: Array.from({ length: 17 }, (_, i) => i + 40) }
  let state = newBroadcastBridge()
  const step = (target, frame) => { state = advanceBroadcastBridge(state, target, frame, profile); return [state.source, state.frame] }
  deepStrictEqual(step(255, [3, 0x22, 0xf1, 0x90]), [0x7e8, [0x10, 20, 0x62, 0xf1, 0x90, 0, 1, 2]])
  match(advanceBroadcastBridge(state, 0x7e9, [0x30, 0, 0], profile).error, /flow control/)
  equal(step(0x7e8, [0x30, 0, 0])[0], 0x7e9)
  deepStrictEqual(step(0x7e9, [0x30, 0, 0])[1], [0x21, 3, 4, 5, 6, 7, 8, 9])
  equal(step(null, null)[0], 0x7e9)
  deepStrictEqual(step(null, null)[1], [0x22, 10, 11, 12, 13, 14, 15, 16])
  equal(step(null, null)[0], 0x7e9)
  deepStrictEqual(step(null, null), [null, null])
  equal(state.phase, 'done')
})
