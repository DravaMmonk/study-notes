// node --test games/kit/domains/can — the bus: frames, stuffing and CRC as ISO 11898-1 has them.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bitsOf, busOf, crc15, frameBits, stuff, wiredAnd } from './bus.js'

// The longest run of equal bits in a stretch.
const longestRun = (bits) => bits.reduce((acc, b, k) => {
  const run = k && b === bits[k - 1] ? acc.run + 1 : 1
  return { run, max: Math.max(acc.max, run) }
}, { run: 0, max: 0 }).max

// Undo stuffing: drop the bit after every five equal ones.
function unstuff(bits) {
  const out = []
  let run = 0
  let last = null
  for (let k = 0; k < bits.length; k++) {
    out.push(bits[k])
    run = bits[k] === last ? run + 1 : 1
    last = bits[k]
    if (run === 5) {
      k++
      last = bits[k]
      run = 1
    }
  }
  return out
}

test('the bus is dominant when anyone says dominant', () => {
  assert.equal(wiredAnd([1, 0, undefined]), 0)
  assert.equal(wiredAnd([1, undefined]), 1)
  assert.equal(wiredAnd([]), 1)
})

test('stuffing never leaves six equal bits, and comes off again', () => {
  for (const bits of [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], bitsOf(0x7f0, 11)]) {
    const s = stuff(bits)
    assert.ok(longestRun(s) <= 5)
    assert.deepEqual(unstuff(s), bits)
  }
  // The stuff bit counts in the run after it: 0×5 then the stuff 1 and four more 1s make a run of five again.
  assert.deepEqual(stuff([0, 0, 0, 0, 0, 1, 1, 1, 1]), [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0])
})

test('a message followed by its CRC divides evenly', () => {
  const msg = [0, ...bitsOf(0x123, 11), 0, 0, 0, ...bitsOf(1, 4), ...bitsOf(0xa5, 8)]
  assert.equal(crc15([...msg, ...bitsOf(crc15(msg), 15)]), 0)
})

test('a frame ends in eleven recessive bits after its ACK slot', () => {
  const bits = frameBits({ id: 0x123, data: [0x01] })
  assert.deepEqual(bits.slice(-13), [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
  // Unstuffed, the frame starts with the start of frame and the identifier, highest bit first.
  assert.deepEqual(unstuff(bits).slice(0, 12), [0, ...bitsOf(0x123, 11)])
})

test('a bus places its frames after the idle bits', () => {
  const { bits, frames } = busOf({ idle: 12, frames: [{ id: 0x123, data: [] }, { id: 0x2a5, data: [], gap: 2 }] })
  assert.equal(frames[0].at, 12)
  assert.equal(bits[frames[0].at], 0)
  assert.equal(frames[1].at, 12 + frameBits({ id: 0x123 }).length + 2)
  assert.ok(bits.slice(frames[1].at - 13, frames[1].at).every((b) => b === 1))
})
