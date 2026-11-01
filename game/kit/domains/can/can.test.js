// node --test games/kit/domains/can — the bus: frames, stuffing and CRC as ISO 11898-1 has them; what a level's
// outputs must be (wants.js); boards as blueprint text (board.js); what the hidden tests of 《车在说话》 catch; a
// level drawn headlessly (scene.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bitsOf, busOf, crc15, frameBits, stuff, wiredAnd } from './bus.js'
import { fromText } from './board.js'
import { PARTS } from './parts.js'
import { wantOf } from './wants.js'
import { busCourse } from './course.js'
import { runLevel } from './run.js'
import { readContent } from '../../engine/content-node.js'
import domain from './domain.js'

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

test('the signals a level wants, tick by tick', () => {
  const bus = { bits: [1, 0, 0, 1], frames: [] }
  const want = wantOf({ a: { previous: { first: 1 } }, b: { unchanged: { first: 1 } }, c: 'tick', d: { since: { tick: 2 } } })
  assert.deepEqual(want({ bus }), { a: [1, 1, 0, 0], b: [true, false, true, false], c: [0, 1, 2, 3], d: [false, false, true, true] })
  const inputs = { go: [1, 1, 0, 1, 1], bit: [1, 0, 1, 1, 1] }
  const five = { bits: [1, 1, 1, 1, 1], frames: [] }
  assert.deepEqual(wantOf({ n: { streak: { input: 'go' } }, g: { gathered: { bit: 'bit', go: 'go' } } })({ bus: five, inputs }), { n: [0, 1, 2, 0, 1], g: [1, 2, 0, 1, 3] })
  // A frame's start and identifier: the first dominant bit after eleven quiet ones, the identifier eleven bits on.
  const one = busOf({ idle: 12, frames: [{ id: 0x123, data: [] }] })
  const got = wantOf({ s: 'startOfFrame', id: 'identifier' })({ bus: one })
  assert.deepEqual(got.s.flatMap((v, t) => (v ? [t] : [])), [12])
  assert.equal(got.id[12 + 11], 0x123)
  assert.equal(got.id.filter((v) => v !== null).length, 1)
})

test('blueprint text reads into a board: settings as the cards keep them, ports by position and form', () => {
  const level = { listens: true, inputs: [{ name: 'go' }], outputs: [{ name: 'n' }] }
  const b = fromText(['r = reg[reg=A, start=1]()', 'c = compare[form=lt](r, go)', 'k = keep[reg=A](line)', 'n <- c'], level, (t) => PARTS[t])
  assert.deepEqual(b.nodes.map((n) => n.id), ['line', 'go', 'n', 'r', 'c', 'k'])
  assert.deepEqual(b.nodes.find((n) => n.id === 'r').params, { reg: 'A', start: '1' })
  assert.deepEqual(b.wires, [{ from: 'r', to: 'c', port: 'a' }, { from: 'go', to: 'c', port: 'b' }, { from: 'line', to: 'k', port: 'in' }, { from: 'c', to: 'n', port: 'in' }])
  assert.throws(() => fromText(['x = counter(go)'], level, (t) => PARTS[t]), (e) => e.line === 1)
})

test('a hidden test catches a board that only fits the visible ones', () => {
  const { LEVELS, partOf } = busCourse(readContent('bus'))
  const level = (id) => LEVELS.find((L) => L.id === id)
  const fits = (L, board) => [runLevel(L, board, partOf).pass, runLevel({ ...L, tests: L.hidden }, board, partOf).pass]
  // A start of frame after seven quiet bits: inside a frame no run is that long, so only the bus plugged in mid-wait
  // tells it from eleven.
  const sof = (quiet) => ['c = counter(line)', `q = const[value=${quiet - 1}]()`, 'lt = compare[form=lt](q, c)', 'z = const[value=0]()', 'e = compare[form=eq](line, z)', 's = select(lt, e, lt)', 'sof <- s']
  assert.deepEqual(fits(level('1-7'), fromText(sof(7), level('1-7'), partOf)), [true, false])
  assert.deepEqual(fits(level('1-7'), fromText(sof(11), level('1-7'), partOf)), [true, true])
  // Starting again from the bit that came with Go on 0 (the naive board) is right only while that bit is 0.
  assert.deepEqual(fits(level('1-8'), level('1-8').naive), [true, false])
  assert.deepEqual(fits(level('1-8'), level('1-8').solution), [true, true])
})

test('a level drawn headlessly: each test’s bus as a waveform, every frame marked by its identifier', () => {
  const spec = domain.spec(readContent('bus'))
  const svg = domain.scene(spec, '1-2')
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
  assert.equal(svg.match(/class="bus-line"/g).length, spec.levels.find((l) => l.id === '1-2').tests.length)
  assert.ok(svg.includes('>0x123<') && svg.includes('>0x2a5<'))
  assert.equal(domain.scene(spec, 'nope'), null)
})
