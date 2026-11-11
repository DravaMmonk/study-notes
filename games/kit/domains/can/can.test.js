// node --test games/kit/domains/can — the bus: frames, stuffing and CRC as ISO 11898-1 has them; what a task's
// outputs must be (wants.js); boards as blueprint text (board.js); what hidden tests catch, on a course written here;
// a level of the starter game (starter/) drawn headlessly (scene.js); every game on the domain read frozen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arbitrationLength, bitsOf, busOf, contender, crc15, frameBits, stuff, transmitBits, wiredAnd } from './bus.js'
import { board } from './board.js'
import { PARTS } from './parts.js'
import { wantOf } from './wants.js'
import { canCourse } from './course.js'
import { runLevel, runTest } from './run.js'
import { runTicks } from '../../engine/ticks.js'
import { packed } from '../../engine/boards.js'
import { primitivesOnly } from '../../engine/circuit-domain.js'
import { assemble, deepFreeze } from '../../engine/content.js'
import domain from './domain.js'
import { readFileSync, readdirSync } from 'node:fs'

const plain = primitivesOnly(board, PARTS)
const { fromText, toText } = board

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

test('competing senders withdraw after sampling an arbitration loss', () => {
  const nodes = [contender('high', { id: 0x500 }), contender('middle', { id: 0x300 }), contender('low', { id: 0x100 })]
  const result = runTicks({ nodes, ticks: 16, line: wiredAnd })
  assert.equal(result.steps[1].said.high, 1)
  assert.equal(result.steps[1].line, 0)
  assert.equal(result.steps[2].said.high, 1)
  assert.equal(result.steps[2].said.middle, 1)
  assert.equal(result.steps[2].line, 0)
  assert.equal(result.steps[4].said.middle, 1)
  assert.equal(transmitBits({ id: 0x100 }).at(-12), 1)
})

test('arbitration judges the loss tick and ignores a mismatch after arbitration', () => {
  const tx = { id: 0x500, data: [] }
  const bits = transmitBits(tx)
  const inputs = { bit: bits, phase: bits.map((_, tick) => Number(tick < arbitrationLength(tx.id))), start: bits.map((_, tick) => Number(tick === 0)) }
  const test = { bus: { bits: bits.map(() => 1) }, inputs, contenders: [{ id: 0x100, data: [] }] }
  const params = { bit: 'bit', arbitration: 'phase', start: 'start' }
  const result = wantOf({ send: { arbitrationDrive: params }, lost: { arbitrationLost: params } })(test)
  assert.equal(result.send[1], 1)
  assert.equal(result.lost[1], 1)
  assert.equal(result.send[2], 1)
  const winner = { id: 0x100, data: [] }
  const winnerBits = transmitBits(winner)
  const world = winnerBits.map(() => 1)
  world[winnerBits.length - 12] = 0
  const check = { bus: { bits: world }, inputs: { bit: winnerBits, phase: winnerBits.map((_, tick) => Number(tick < arbitrationLength(winner.id))), start: winnerBits.map((_, tick) => Number(tick === 0)) }, contenders: [{ id: 0x500, data: [] }] }
  assert.ok(wantOf({ lost: { arbitrationLost: params } })(check).lost.every((value) => value === 0))
})

test('a losing node can read the winner identifier from the shared line', () => {
  const tx = { id: 0x500, data: [] }
  const data = transmitBits(tx)
  const at = 12
  const bit = [...Array(at).fill(1), ...data, ...Array(40).fill(1)]
  const phase = bit.map((_, tick) => Number(tick >= at && tick < at + arbitrationLength(tx.id)))
  const start = bit.map((_, tick) => Number(tick === at))
  const test = { txAt: at, bus: { bits: bit.map(() => 1) }, inputs: { bit, phase, start }, contenders: [{ id: 0x100, data: [0xa5], at }] }
  const params = { bit: 'bit', arbitration: 'phase', start: 'start' }
  const out = wantOf({ id: { winnerIdentifier: params }, length: { winnerLength: params }, byte: { winnerByte: params }, status: { winnerStatus: params }, drive: { receiverDrive: params } })(test)
  assert.deepEqual(out.id.flatMap((value, tick) => value === null ? [] : [[tick, value]]), [[24, 0x100]])
  assert.deepEqual(out.length.filter((value) => value !== null), [1])
  assert.deepEqual(out.byte.filter((value) => value !== null), [0xa5])
  const crcTick = at + frameBits({ id: 0x100, data: [0xa5] }).length - 13
  assert.equal(out.status[crcTick], true)
  assert.equal(out.drive[crcTick + 1], 0)
})

test('retry waits through the winner acknowledgement and intermission', () => {
  const tx = { id: 0x500, data: [42] }
  const winner = { id: 0x100, data: [0xa5], at: 12 }
  const test = { tx, txAt: 12, contenders: [winner], bus: { bits: Array(250).fill(1) }, inputs: { start: Array.from({ length: 250 }, (_, tick) => Number(tick === 12)) } }
  const params = { start: 'start' }
  const out = wantOf({ drive: { retryDrive: params }, lost: { retryLost: params }, done: { retryDone: params }, attempts: { retryAttempts: params } })(test)
  const retry = 12 + frameBits(winner).length
  const ack = retry - 12
  assert.equal(out.lost[13], 1)
  assert.equal(out.drive[ack], 0)
  assert.equal(out.lost[retry], 0)
  assert.deepEqual(out.attempts.flatMap((value, tick) => value ? [tick] : []), [12, retry])
  assert.equal(out.done[retry + frameBits(tx).length - 1], true)
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

test('destuffing counts a stuff bit as the start of the next run', () => {
  const bit = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0]
  const result = wantOf({ out: { destuffed: { input: 'bit' } } })({ inputs: { bit } })
  assert.deepEqual(result.out, [0, 0, 0, 0, 0, null, 1, 1, 1, 1, null, 0])
  const signals = wantOf({ valid: { destuffValid: { input: 'bit' } }, gathered: { destuffedGather: { input: 'bit' } } })({ inputs: { bit } })
  assert.deepEqual(signals.valid, [true, true, true, true, true, false, true, true, true, true, false, true])
  assert.deepEqual(signals.gathered, [0, 0, 0, 0, 0, 0, 1, 3, 7, 15, 15, 30])
  const reset = [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]
  const restarted = wantOf({ out: { destuffedReset: { input: 'bit', reset: 'reset' } }, valid: { destuffValidReset: { input: 'bit', reset: 'reset' } } })({ inputs: { bit, reset } })
  assert.deepEqual(restarted.out, [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, null, 0])
  assert.deepEqual(restarted.valid, [true, true, true, true, true, true, true, true, true, true, false, true])
})

test('data length appears on the last unstuffed DLC bit', () => {
  const examples = [
    { id: 0x123, data: [], tick: 19 },
    { id: 0x7ff, data: [1, 2], tick: 21 },
    { id: 0, data: Array(8).fill(0), tick: 21 },
  ]
  for (const frame of examples) {
    const bus = busOf({ idle: 0, frames: [frame], tail: 0 })
    const out = wantOf({ length: 'dataLength' })({ bus }).length
    assert.equal(out[frame.tick], frame.data.length)
    assert.equal(out.filter((value) => value !== null).length, 1)
  }
})

test('identifier appears on its final original bit even when the header is stuffed', () => {
  for (const [id, tick] of [[0x000, 13], [0x7ff, 13], [0x2a5, 11]]) {
    const bus = busOf({ idle: 0, frames: [{ id }], tail: 0 })
    const out = wantOf({ id: 'identifier' })({ bus }).id
    assert.equal(out[tick], id)
    assert.equal(out.filter((value) => value !== null).length, 1)
  }
})

test('data bytes occur at their own last bits, including stuffing in earlier bytes', () => {
  const frames = [{ id: 0x7ff, data: [0xa5, 0] }, { id: 0, data: [0, 0xff] }]
  const expected = [[[29, 0xa5], [38, 0]], [[30, 0], [39, 0xff]]]
  for (let k = 0; k < frames.length; k++) {
    const bus = busOf({ idle: 0, frames: [frames[k]], tail: 0 })
    const out = wantOf({ byte: 'dataByte' })({ bus }).byte
    assert.deepEqual(out.flatMap((value, tick) => value === null ? [] : [[tick, value]]), expected[k])
  }
})

test('end of frame is the last EOF bit, before three intermission bits', () => {
  const frames = [{ id: 0x123, data: [] }, { id: 0x7ff, data: [0xa5, 0] }, { id: 0, data: Array(8).fill(0) }]
  for (const [k, tick] of [44, 63, 123].entries()) {
    const bus = busOf({ idle: 0, frames: [frames[k]], tail: 0 })
    const out = wantOf({ end: 'endOfFrame' })({ bus }).end
    assert.equal(out[tick], true)
    assert.equal(out.filter((value) => value !== null).length, 1)
    assert.deepEqual(bus.bits.slice(tick + 1), [1, 1, 1])
  }
})

test('frame indices occur at each start, including adjacent frames', () => {
  const bus = busOf({ idle: 12, frames: [{ id: 0x123, data: [] }, { id: 0x7ff, data: [0xa5] }], tail: 0 })
  const out = wantOf({ index: 'frameIndex' })({ bus }).index
  assert.deepEqual(out.flatMap((value, tick) => value === null ? [] : [[tick, value]]), bus.frames.map((frame, index) => [frame.at, index + 1]))
})

test('frame status distinguishes CRC errors and a final stuffing error', () => {
  const frame = { id: 9, data: [] }
  const bus = busOf({ idle: 0, frames: [frame], tail: 0 })
  const good = [...bus.bits]
  const finalStuff = frameBits(frame).length - 14
  assert.notEqual(good[finalStuff], good[finalStuff - 1])
  const badStuff = [...good]
  badStuff[finalStuff] = badStuff[finalStuff - 1]
  const status = wantOf({ ok: { frameStatus: { bit: 'bit' } } })
  const normal = status({ bus, inputs: { bit: good } }).ok
  const broken = status({ bus, inputs: { bit: badStuff } }).ok
  const ready = wantOf({ ready: { frameStatusReady: { bit: 'bit' } } })({ bus, inputs: { bit: badStuff } }).ready
  assert.equal(normal[finalStuff + 1], true)
  assert.equal(broken[finalStuff], false)
  assert.equal(ready[finalStuff], 1)
  assert.equal(ready[finalStuff + 1], 0)
  assert.equal(broken.filter((value) => value !== null).length, 1)

  const corrupted = busOf({ idle: 0, frames: [{ id: 0x2a5, data: [0x55] }], tail: 0 })
  const bits = [...corrupted.bits]
  bits[20] ^= 1
  const altered = busOf({ idle: 0, frames: [{ id: 0x2a5, data: [0xd5] }], tail: 0 })
  const badCrc = status({ bus: altered, inputs: { bit: bits } }).ok
  assert.deepEqual(badCrc.flatMap((value, tick) => value === null ? [] : [[tick, value]]), [[frameBits({ id: 0x2a5, data: [0x55] }).length - 13, false]])
})

test('stuffing error latches and resets even when checking is disabled', () => {
  const bit = [0, 0, 0, 0, 0, 0, 1, 1, 1]
  const enable = [1, 1, 1, 1, 1, 1, 1, 0, 1]
  const reset = [1, 0, 0, 0, 0, 0, 0, 1, 0]
  const test = { bus: { bits: bit }, inputs: { bit, enable, reset } }
  assert.deepEqual(wantOf({ error: { stuffingError: { bit: 'bit', enable: 'enable', reset: 'reset' } } })(test).error, [0, 0, 0, 0, 0, 1, 1, 0, 0])
})

test('XOR and polynomial remainders handle enabled ticks and reset', () => {
  assert.equal(PARTS.xor.eval({ a: 0x4599, b: 0x1234 }), 0x57ad)
  assert.equal(PARTS.xor.eval({ a: null, b: 1 }), null)
  const params = { bit: 'bit', enable: 'enable', reset: 'reset', width: 3, poly: 3 }
  const test = { bus: { bits: Array(7).fill(0) }, inputs: { bit: [1, 1, 0, 1, 1, 0, 1], enable: [1, 1, 1, 1, 0, 1, 1], reset: [0, 0, 0, 0, 0, 1, 0] } }
  assert.deepEqual(wantOf({ rem: { remainder: params } })(test).rem, [3, 5, 1, 1, 1, 0, 3])
  const message = [1, 0, 1, 1, 0, 1]
  const codeword = [...message, ...bitsOf(crc15(message), 15)]
  const check = { bus: { bits: codeword }, inputs: { bit: codeword, enable: codeword.map(() => 1), reset: codeword.map(() => 0) } }
  const values = wantOf({ rem: { remainder: { ...params, width: 15, poly: 0x4599 } } })(check).rem
  assert.equal(values[message.length - 1], crc15(message))
  assert.equal(values.at(-1), 0)
})

test('blueprint text reads into a board: settings as the cards keep them, ports by position and form', () => {
  const task = { listens: true, inputs: [{ name: 'go', label: 'go' }], outputs: [{ name: 'n', label: 'n' }] }
  const b = fromText(['r = reg[reg=A, start=1]()', 'c = compare[form=lt](r, go)', 'k = keep[reg=A](line)', 'n <- c'], task, plain)
  assert.deepEqual(b.nodes.map((n) => n.id), ['line', 'go', 'n', 'r', 'c', 'k'])
  assert.deepEqual(b.nodes.find((n) => n.id === 'r').params, { reg: 'A', start: '1' })
  assert.deepEqual(b.wires, [{ from: 'r', to: 'c', port: 'a' }, { from: 'go', to: 'c', port: 'b' }, { from: 'line', to: 'k', port: 'in' }, { from: 'c', to: 'n', port: 'in' }])
  // Written out and read back, a board writes the same text again.
  const text = toText(b, task, plain)
  assert.deepEqual(toText(fromText(text, task, plain), task, plain), text)
  assert.throws(() => fromText(['x = counter(go)'], task, plain), (e) => e.line === 1)
})

// A course written here: a counter built and then used to wait out the quiet before a frame, and a number gathered
// bit by bit while Go on holds.
const L = (s) => ({ zh: s, en: s })
const sof = (quiet) => ['c = counter(line)', `q = const[value=${quiet - 1}]()`, 'lt = compare[form=lt](q, c)', 'z = const[value=0]()', 'e = compare[form=eq](line, z)', 's = select(lt, e, lt)', 'sof <- s']
const gather = (restart) => ['r = reg[reg=A, start=0]()', 'd = arith[form=add](r, r)', 'a = arith[form=add](d, bit)', ...(restart === 'z' ? ['z = const[value=0]()'] : []), `s = select(go, a, ${restart})`, 'k = keep[reg=A](s)', 'n <- s']
// A level of one task, the level's id its task's.
const level = (id, task, once = {}) => ({ id, ...once, tasks: [{ id, ...task }] })
const COURSE = {
  primitives: ['reg', 'keep', 'compare', 'arith', 'select', 'const'],
  eras: [{ id: 1, foundation: ['count', 'start', 'gather'] }],
  levels: [
    level('count', { inputs: [{ name: 'go', label: L('go') }], outputs: [{ name: 'n', label: L('n') }], want: { n: { streak: { input: 'go' } } },
      tests: [{ bus: { idle: 6, frames: [], tail: 0 }, inputs: { go: [1, 1, 0, 1, 1, 1] } }],
      solution: ['r = reg[reg=A, start=0]()', 'i = arith[form=inc](r)', 'z = const[value=0]()', 's = select(go, i, z)', 'k = keep[reg=A](s)', 'n <- r'] }, { builds: { type: 'counter' } }),
    // The visible buses start after eleven quiet bits or more; the hidden one is plugged in after ten.
    level('start', { listens: true, outputs: [{ name: 'sof', label: L('sof') }], want: { sof: 'startOfFrame' },
      tests: [{ bus: { frames: [{ id: '0x123', data: ['0x01'] }] } }, { bus: { idle: 11, frames: [{ id: '0x0f3', data: ['0x55', '0xaa'] }, { id: '0x2a5', data: [] }] } }],
      hidden: [{ bus: { idle: 10, frames: [{ id: '0x123', data: ['0x01'] }, { id: '0x0f3', data: [] }] } }],
      solution: sof(11) }),
    // Go on drops to 0 only where the bit is 0 in the visible test, and where it is 1 in the hidden one.
    level('gather', { inputs: [{ name: 'bit', label: L('bit') }, { name: 'go', label: L('go') }], outputs: [{ name: 'n', label: L('n') }], want: { n: { gathered: { bit: 'bit', go: 'go' } } },
      tests: [{ bus: { idle: 6, frames: [], tail: 0 }, inputs: { bit: [1, 0, 1, 0, 1, 1], go: [1, 1, 1, 0, 1, 1] } }],
      hidden: [{ bus: { idle: 4, frames: [], tail: 0 }, inputs: { bit: [1, 1, 1, 1], go: [1, 0, 1, 1] } }],
      solution: gather('z'), naive: gather('bit') }),
  ],
}

test('a hidden test catches a board that only fits the visible ones', () => {
  const circuit = canCourse(COURSE)
  assert.deepEqual(circuit.wrong, [])
  const { partOf } = circuit
  const task = (id) => circuit.played.get(id)[0]
  const fits = (T, b) => [runLevel(T, b, partOf).pass, runLevel({ ...T, tests: T.hidden }, b, partOf).pass]
  // A start of frame after seven quiet bits: inside a frame no run is that long, so only the bus plugged in mid-wait
  // tells it from eleven. The counter it waits with is the one the course built.
  assert.deepEqual(fits(task('start'), fromText(sof(7), task('start'), circuit)), [true, false])
  assert.deepEqual(fits(task('start'), task('start').solution), [true, true])
  // Starting again from the bit that came with Go on 0 (the naive board) is right only while that bit is 0.
  assert.deepEqual(fits(task('gather'), task('gather').naive), [true, false])
  assert.deepEqual(fits(task('gather'), task('gather').solution), [true, true])
})

test('a test may bind a task input to the bus waveform', () => {
  const content = JSON.parse(JSON.stringify(COURSE))
  const task = content.levels.find((level) => level.id === 'gather').tasks[0]
  task.tests[0].lineInputs = ['bit']
  delete task.tests[0].inputs.bit
  const course = canCourse(content)
  assert.deepEqual(course.wrong, [])
  const test = course.played.get('gather')[0].tests[0]
  assert.deepEqual(test.inputs.bit, test.bus.bits)
  task.tests[0].inputs.bit = [0]
  assert.ok(canCourse(content).wrong.some((problem) => problem.includes('both explicit values and the line')))
})

test('test constants, pulses and peer low ticks expand and reject conflicts', () => {
  const content = JSON.parse(JSON.stringify(COURSE))
  const task = content.levels.find((level) => level.id === 'gather').tasks[0]
  task.tests[0] = { bus: { idle: 6, frames: [], tail: 0 }, constants: { bit: 1 }, pulses: { go: [1, 4] }, peerLow: [2] }
  const course = canCourse(content)
  assert.deepEqual(course.wrong, [])
  const test = course.played.get('gather')[0].tests[0]
  assert.deepEqual(test.inputs.bit, [1, 1, 1, 1, 1, 1])
  assert.deepEqual(test.inputs.go, [0, 1, 0, 0, 1, 0])
  assert.deepEqual(test.bus.bits, [1, 1, 0, 1, 1, 1])
  task.tests[0].pulses.bit = [6]
  const wrong = canCourse(content).wrong
  assert.ok(wrong.some((problem) => problem.includes('more than one source')))
  assert.ok(wrong.some((problem) => problem.includes('outside the test')))
})

test('ACK retry course tests require a complete active-state retry and a matching queue', () => {
  const content = JSON.parse(JSON.stringify(COURSE))
  const task = content.levels.find((level) => level.id === 'gather').tasks[0]
  task.inputs = ['item', 'available', 'start'].map((name) => ({ name, label: L(name) }))
  task.outputs = ['next', 'rewind'].map((name) => ({ name, label: L(name) }))
  task.pulls = { input: 'item', available: 'available', next: 'next', rewind: 'rewind' }
  task.want = { next: { ackRetryNext: { start: 'start' } } }
  const tx = { id: 0x123, data: [0xa5] }
  const size = transmitBits(tx).length
  const ack = size - 12
  task.tests = [{ bus: { idle: size, frames: [], tail: 0 }, tx, queue: tx.data, pulses: { start: [0] }, peerLow: [ack] }]
  assert.ok(!canCourse(content).wrong.some((problem) => problem.includes('ACK retry')))
  task.tests[0].peerLow = []
  assert.ok(canCourse(content).wrong.some((problem) => problem.includes('must finish with an acknowledged frame')))
  task.tests[0].peerLow = [ack, ack - 1]
  task.tests[0].queue = [0]
  const wrong = canCourse(content).wrong
  assert.ok(wrong.some((problem) => problem.includes('queue must contain')))
  assert.ok(wrong.some((problem) => problem.includes('peers may only acknowledge')))
})

test('passive ACK retry course tests require passive preparation and a successful retry', () => {
  const content = JSON.parse(JSON.stringify(COURSE))
  const task = content.levels.find((level) => level.id === 'gather').tasks[0]
  task.inputs = ['item', 'available', 'start', 'prep', 'reset'].map((name) => ({ name, label: L(name) }))
  task.outputs = ['next', 'rewind'].map((name) => ({ name, label: L(name) }))
  task.pulls = { input: 'item', available: 'available', next: 'next', rewind: 'rewind' }
  task.want = { next: { passiveAckNext: { start: 'start', prep: 'prep', reset: 'reset' } } }
  const tx = { id: 0x123, data: [0xa5] }
  const size = transmitBits(tx).length
  const ack = 20 + size - 12
  const length = 20 + size
  task.tests = [{ bus: { idle: length, frames: [], tail: 0 }, tx, queue: tx.data, inputs: { prep: Array.from({ length }, (_, tick) => Number(tick < 16)) }, pulses: { start: [20], reset: [0] }, peerLow: [ack] }]
  assert.ok(!canCourse(content).wrong.some((problem) => problem.includes('passive ACK retry')))
  task.tests[0].inputs.prep[15] = 0
  task.tests[0].peerLow = []
  const wrong = canCourse(content).wrong
  assert.ok(wrong.some((problem) => problem.includes('sixteen preparation errors')))
  assert.ok(wrong.some((problem) => problem.includes('must finish with an acknowledged frame')))
})

test('a board drives the wired-AND bus and cannot say what it hears in the same tick', () => {
  const task = { listens: true, drives: true, inputs: [{ name: 'bit', label: L('bit') }], outputs: [], want: wantOf({ send: { delayedInput: { input: 'bit', first: 1 } } }) }
  const test = { bus: { bits: [1, 1, 0, 1], frames: [] }, inputs: { bit: [0, 1, 1, 0] } }
  const legal = fromText(['r = reg[reg=A, start=1]()', 'k = keep[reg=A](bit)', 'send <- r'], task, plain)
  const result = runTest(task, legal, test, plain.partOf)
  assert.equal(result.fail, undefined)
  assert.deepEqual(result.ticks.map((tick) => tick.sent), [1, 0, 1, 1])
  assert.deepEqual(result.ticks.map((tick) => tick.line), [1, 0, 0, 1])
  const flipped = runTest(task, legal, { ...test, flipTicks: [2] }, plain.partOf)
  assert.equal(flipped.ticks[2].line, 1)
  const loop = fromText(['send <- line'], task, plain)
  assert.ok(runTest(task, loop, test, plain.partOf).error)
})

test('bit error ignores ACK, detects an inverted sample and resets', () => {
  const bit = [1, 1, 0, 0, 1, 1]
  const test = { bus: { bits: [1, 0, 1, 1, 1, 1] }, inputs: { bit, arb: [0, 0, 0, 0, 0, 0], ack: [0, 1, 0, 0, 0, 0], start: [1, 0, 0, 0, 0, 1] }, flipTicks: [3] }
  const out = wantOf({ error: { bitError: { bit: 'bit', arbitration: 'arb', ack: 'ack', start: 'start' } } })(test).error
  assert.deepEqual(out, [0, 0, 0, 1, 1, 0])
})

test('an active error flag starts on the next tick and has an eight-bit delimiter', () => {
  const pulses = Array.from({ length: 20 }, (_, tick) => Number(tick === 2))
  const test = { bus: { bits: Array(20).fill(1) }, inputs: { error: pulses } }
  const out = wantOf({ send: { errorFlagDrive: { error: 'error' } }, done: { errorFlagDone: { error: 'error' } } })(test)
  assert.deepEqual(out.send.slice(0, 17), [1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1])
  assert.deepEqual(out.done.flatMap((value, tick) => value ? [tick] : []), [16])
})

test('fault counters use the specified event subset and latch bus-off', () => {
  const event = [...Array(16).fill(1), 5, 2, ...Array(129).fill(3), 4]
  const test = { bus: { bits: event.map(() => 1) }, inputs: { event, reset: event.map(() => 0) } }
  const params = { event: 'event', reset: 'reset' }
  const out = wantOf({ tx: { faultCount: { ...params, which: 'tx' } }, rx: { faultCount: { ...params, which: 'rx' } }, mode: { faultMode: params } })(test)
  assert.equal(out.tx[15], 128)
  assert.equal(out.tx[16], 128)
  assert.equal(out.tx[17], 127)
  assert.equal(out.rx[event.length - 1], 127)
  assert.equal(out.mode[event.length - 1], 0)
  const errors = [...Array(32).fill(1), 2, 0]
  const reset = [...Array(33).fill(0), 1]
  const off = wantOf({ tx: { faultCount: { ...params, which: 'tx' } }, mode: { faultMode: params } })({ bus: { bits: errors }, inputs: { event: errors, reset } })
  assert.deepEqual(off.tx.slice(-3), [256, 256, 0])
  assert.deepEqual(off.mode.slice(-3), [2, 2, 0])
  const actions = Array(65).fill(0)
  actions.fill(1, 0, 16)
  actions[40] = 2
  const flag = wantOf({ drive: { faultFlagDrive: { ...params, report: 'report' } } })({ bus: { bits: actions.map(() => 1) }, inputs: { event: actions, reset: actions.map(() => 0), report: actions.map((_, tick) => Number(tick === 20 || tick === 45)) } }).drive
  assert.deepEqual(flag.slice(21, 27), [1, 1, 1, 1, 1, 1])
  assert.deepEqual(flag.slice(46, 52), [0, 0, 0, 0, 0, 0])
})

test('an error entering passive state still sends an active error flag', () => {
  const event = [...Array(16).fill(1), ...Array(16).fill(0)]
  const test = { bus: { bits: event.map(() => 1) }, inputs: { event, reset: event.map((_, tick) => Number(tick === 0)), report: event.map((_, tick) => Number(tick === 15)) } }
  const wanted = wantOf({ mode: { faultMode: { event: 'event', reset: 'reset' } }, drive: { transitionFlagDrive: { event: 'event', reset: 'reset', report: 'report' } } })(test)
  assert.equal(wanted.mode[15], 1)
  assert.deepEqual(wanted.drive.slice(16, 30), [...Array(6).fill(0), ...Array(8).fill(1)])
  test.inputs.report = event.map((_, tick) => Number(tick === 16))
  assert.deepEqual(wantOf({ drive: { transitionFlagDrive: { event: 'event', reset: 'reset', report: 'report' } } })(test).drive.slice(17, 31), Array(14).fill(1))
})

test('a packed board reads its wired line input, not an unrelated world line', () => {
  const innerTask = { listens: true, inputs: [], outputs: [{ name: 'seen', label: L('seen') }] }
  const inner = fromText(['seen <- line'], innerTask, plain)
  const component = packed({ circuit: inner, inputs: ['line'], outputs: ['seen'] })
  const partOf = (type) => type === 'wrapped' ? component : plain.partOf(type)
  const types = { ...plain, partOf, BUILT: { wrapped: component }, builtBy: () => innerTask, types: () => [...plain.types(), 'wrapped'] }
  const task = { inputs: [{ name: 'other', label: L('other') }], outputs: [{ name: 'seen', label: L('seen') }], want: () => ({ seen: [0] }) }
  const circuit = fromText(['p = wrapped(other)', 'seen <- p'], task, types)
  const result = runTest(task, circuit, { bus: { bits: [1], frames: [] }, inputs: { other: [0] } }, partOf)
  assert.equal(result.fail, undefined)
  assert.equal(result.ticks[0].outputs.seen, 0)
})

test('a queue advances only after the board asks, and must be consumed', () => {
  const task = { inputs: [{ name: 'item', label: L('item') }, { name: 'available', label: L('available') }, { name: 'last', label: L('last') }, { name: 'go', label: L('go') }], outputs: [{ name: 'next', label: L('next') }, { name: 'seen', label: L('seen') }], pulls: { input: 'item', available: 'available', last: 'last', next: 'next' }, want: () => ({ seen: [10, 10, 20, 20, null] }) }
  const test = { bus: { bits: [1, 1, 1, 1, 1], frames: [] }, inputs: { go: [0, 1, 0, 1, 0] }, queue: [10, 20] }
  const take = fromText(['next <- go', 'seen <- item'], task, plain)
  const run = runTest(task, take, test, plain.partOf)
  assert.equal(run.fail, undefined)
  assert.deepEqual(run.ticks.map((tick) => tick.bind.item), [10, 10, 20, 20, null])
  assert.deepEqual(run.ticks.map((tick) => tick.bind.available), [1, 1, 1, 1, 0])
  assert.deepEqual(run.ticks.map((tick) => tick.bind.last), [0, 0, 1, 1, null])
  const stuck = fromText(['z = const[value=0]()', 'next <- z', 'seen <- item'], task, plain)
  assert.ok(runTest({ ...task, want: () => ({}) }, stuck, test, plain.partOf).fail)
})

test('a queue can replay its bytes, with rewind taking priority over advance', () => {
  const task = { inputs: ['item', 'available', 'go', 'reset'].map((name) => ({ name, label: L(name) })), outputs: ['next', 'rewind', 'seen'].map((name) => ({ name, label: L(name) })), pulls: { input: 'item', available: 'available', next: 'next', rewind: 'rewind' }, want: () => ({ seen: [10, 20, 10, 20, null] }) }
  const test = { bus: { bits: [1, 1, 1, 1, 1] }, inputs: { go: [1, 1, 1, 1, 0], reset: [0, 1, 0, 0, 0] }, queue: [10, 20] }
  const circuit = fromText(['next <- go', 'rewind <- reset', 'seen <- item'], task, plain)
  const run = runTest(task, circuit, test, plain.partOf)
  assert.equal(run.fail, undefined)
  assert.deepEqual(run.ticks.map((tick) => tick.bind.item), [10, 20, 10, 20, null])
})

test('missing ACK retry oracle replays the frame after the error flag and intermission', () => {
  const tx = { id: 0x123, data: [0xa5] }
  const bits = transmitBits(tx)
  const firstAck = bits.length - 12
  const retryAt = firstAck + 18
  const secondAck = retryAt + firstAck
  const length = retryAt + bits.length + 2
  const bus = Array(length).fill(1)
  bus[secondAck] = 0
  const test = { tx, bus: { bits: bus }, inputs: { start: bus.map((_, tick) => Number(tick === 0)) } }
  const calls = Object.fromEntries(['Drive', 'Next', 'Rewind', 'Attempts', 'Done', 'Tec'].map((name) => [name, { [`ackRetry${name}`]: { start: 'start' } }]))
  const result = wantOf(calls)(test)
  assert.deepEqual(result.Attempts.flatMap((v, tick) => v ? [tick] : []), [0, retryAt])
  assert.deepEqual(result.Rewind.flatMap((v, tick) => v ? [tick] : []), [firstAck])
  assert.deepEqual(result.Drive.slice(firstAck + 1, retryAt), [...Array(6).fill(0), ...Array(11).fill(1)])
  assert.deepEqual(result.Next.flatMap((v, tick) => v ? [tick] : []), [27, retryAt + 27])
  assert.equal(result.Tec[firstAck], 8)
  assert.equal(result.Tec[retryAt + bits.length - 5], 8)
  assert.equal(result.Tec[retryAt + bits.length - 4], 7)
  assert.equal(result.Tec[retryAt + bits.length - 1], 7)
})

test('passive senders wait eight additional idle bits after intermission', () => {
  const test = { bus: { bits: Array(24).fill(1) }, inputs: { end: Array(24).fill(0), mode: Array(24).fill(0) } }
  test.inputs.end[1] = 1
  test.inputs.mode[1] = 1
  const ready = wantOf({ ready: { suspendReady: { end: 'end', mode: 'mode' } } })(test).ready
  assert.deepEqual(ready.slice(0, 11), [...Array(10).fill(false), true])
  test.inputs.end[12] = 1
  test.inputs.mode[12] = 0
  const again = wantOf({ ready: { suspendReady: { end: 'end', mode: 'mode' } } })(test).ready
  assert.equal(again[12], false)
  assert.equal(again[13], true)
  test.inputs.request = Array(24).fill(0)
  test.inputs.request[9] = 1
  test.inputs.request[10] = 1
  const request = wantOf({ allowed: { suspendRequest: { end: 'end', mode: 'mode', request: 'request' } } })(test).allowed
  assert.equal(request[9], false)
  assert.equal(request[10], true)
  test.inputs.mode[12] = 2
  assert.equal(wantOf({ ready: { suspendReady: { end: 'end', mode: 'mode' } } })(test).ready[23], false)
})

test('passive missing ACK retry waits through suspension and does not increase TEC', () => {
  const tx = { id: 0x123, data: [0xa5] }
  const bits = transmitBits(tx)
  const start = 20
  const ack = start + bits.length - 12
  const retry = ack + 26
  const length = retry + bits.length + 1
  const bus = Array(length).fill(1)
  bus[retry + bits.length - 12] = 0
  const inputs = { start: bus.map((_, tick) => Number(tick === start)), prep: bus.map((_, tick) => Number(tick < 16)), reset: bus.map((_, tick) => Number(tick === 0)) }
  const calls = Object.fromEntries(['Drive', 'Next', 'Rewind', 'Attempts', 'Done', 'Tec', 'Mode'].map((name) => [name, { [`passiveAck${name}`]: { start: 'start', prep: 'prep', reset: 'reset' } }]))
  const result = wantOf(calls)({ tx, bus: { bits: bus }, inputs })
  assert.deepEqual(result.Attempts.flatMap((v, tick) => v ? [tick] : []), [start, retry])
  assert.deepEqual(result.Rewind.flatMap((v, tick) => v ? [tick] : []), [ack])
  assert.deepEqual(result.Drive.slice(ack + 1, retry), Array(25).fill(1))
  assert.equal(result.Tec[ack], 128)
  assert.equal(result.Tec[retry + bits.length - 5], 128)
  assert.equal(result.Tec[retry + bits.length - 4], 127)
  assert.equal(result.Tec[retry + bits.length - 1], 127)
  assert.equal(result.Mode[ack], 1)
  assert.equal(result.Mode[retry + bits.length - 1], 0)
})

test('bus-off recovery counts disjoint eleven-bit groups and clears interrupted runs', () => {
  const bit = [...Array(10).fill(1), 0, ...Array(1408).fill(1), ...Array(12).fill(1)]
  const off = bit.map(() => 1)
  const test = { bus: { bits: bit }, inputs: { bit, off } }
  const calls = { groups: { recoveryCount: { bit: 'bit', off: 'off' } }, ready: { recoveryReady: { bit: 'bit', off: 'off' } } }
  const result = wantOf(calls)(test)
  assert.equal(result.groups[10], 0)
  assert.equal(result.groups[21], 1)
  assert.equal(result.ready[1417], false)
  assert.equal(result.ready[1418], true)
  assert.equal(result.groups.at(-1), 128)
  off[1419] = 0
  const reset = wantOf(calls)(test)
  assert.equal(reset.groups[1419], 0)
  assert.equal(reset.ready[1419], false)
})

test('a transmitter releases ACK while another node can acknowledge', () => {
  const tx = { id: 0x123, data: [0xa5] }
  const frame = frameBits(tx)
  const ack = frame.length - 12
  const peer = frame.map((_, tick) => tick === ack ? 0 : 1)
  const test = { tx, bus: { bits: peer }, inputs: { start: frame.map((_, tick) => Number(tick === 0)) } }
  const want = wantOf({ send: { frameDrive: { start: 'start' } }, line: { frameLine: { start: 'start' } }, done: { frameSent: { start: 'start' } }, next: { frameQueueNext: { start: 'start' } }, arb: { frameArbitrating: { start: 'start' } }, ack: { frameAck: { start: 'start' } }, eof: { frameEof: { start: 'start' } }, missing: { frameAckMissing: { start: 'start' } } })(test)
  assert.equal(want.send[ack], 1)
  assert.equal(want.line[ack], 0)
  assert.equal(want.ack[ack], 1)
  assert.equal(want.eof[frame.length - 4], 1)
  assert.equal(want.missing[ack], false)
  assert.equal(want.missing[ack - 1], null)
  assert.deepEqual(want.done.flatMap((value, tick) => value ? [tick] : []), [frame.length - 1])
  assert.deepEqual(want.next.flatMap((value, tick) => value ? [tick] : []), [27])
  assert.deepEqual(want.arb.slice(0, 15), [...Array(13).fill(1), 0, 0])
})

test('serialising latches the byte and a new start replaces an unfinished one', () => {
  const value = [0xa5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0, 0x80, 0, 0, 0, 0, 0, 0, 0]
  const start = value.map((_, tick) => [0, 10, 12].includes(tick) ? 1 : 0)
  const test = { bus: { bits: value.map(() => 1) }, inputs: { value, start } }
  const params = { value: 'value', start: 'start' }
  const out = wantOf({ bit: { serialBit: params }, busy: { serialBusy: params }, done: { serialDone: params }, drive: { serialDrive: params } })(test)
  assert.deepEqual(out.bit, [1, 0, 1, 0, 0, 1, 0, 1, null, null, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0])
  assert.deepEqual(out.done.flatMap((done, tick) => done ? [tick] : []), [7, 19])
  assert.equal(out.busy[8], false)
  assert.equal(out.drive[8], 1)
})

test('stuffing output inserts a bit without consuming the next input', () => {
  const bit = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1]
  const valid = bit.map(() => 1)
  const start = bit.map((_, tick) => tick === 0 ? 1 : 0)
  const test = { bus: { bits: bit }, inputs: { bit, valid, start } }
  const params = { bit: 'bit', valid: 'valid', start: 'start' }
  const out = wantOf({ bit: { stuffOut: params }, accepted: { stuffAccepted: params }, inserted: { stuffInserted: params } })(test)
  assert.deepEqual(out.bit, [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1])
  assert.deepEqual(out.inserted.flatMap((value, tick) => value ? [tick] : []), [5, 10])
  assert.equal(out.accepted[5], 0)
  assert.equal(out.accepted[6], 1)
  assert.equal(out.accepted[10], 0)
})

test('a serializer holds its bit during backpressure and sends a final pending stuff bit', () => {
  const value = [0xa5, ...Array(11).fill(0)]
  const start = [1, ...Array(11).fill(0)]
  const advance = [0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1]
  const test = { bus: { bits: value.map(() => 1) }, inputs: { value, start, advance } }
  const params = { value: 'value', start: 'start', advance: 'advance' }
  const out = wantOf({ bit: { pacedBit: params }, done: { pacedDone: params } })(test)
  assert.deepEqual(out.bit.slice(0, 6), [1, 1, 1, 0, 1, 1])
  assert.deepEqual(out.done.flatMap((done, tick) => done ? [tick] : []), [10])
  const source = { bus: { bits: Array(10).fill(1) }, inputs: { value: [31, ...Array(9).fill(0)], start: [1, ...Array(9).fill(0)] } }
  const result = wantOf({ drive: { stuffedSerialDrive: { value: 'value', start: 'start' } }, done: { stuffedSerialDone: { value: 'value', start: 'start' } }, crc: { stuffedSerialCrc: { value: 'value', start: 'start' } } })(source)
  assert.deepEqual(result.drive, [0, 0, 0, 1, 1, 1, 1, 1, 0, 1])
  assert.equal(result.done[7], true)
  assert.equal(result.drive[8], 0)
  assert.equal(result.crc[7], crc15(bitsOf(31, 8)))
  assert.equal(result.crc[8], null)
})

test('field serialization latches both width and value at start', () => {
  const test = { bus: { bits: Array(8).fill(1) }, inputs: { value: [0xa, 0, 0, 0, 0, 0, 0, 0], width: [4, 1, 1, 1, 1, 1, 1, 1], start: [1, 0, 0, 0, 0, 0, 0, 0], advance: [0, 1, 1, 1, 0, 1, 1, 1] } }
  const params = { value: 'value', width: 'width', start: 'start', advance: 'advance' }
  const result = wantOf({ bit: { fieldBit: params }, busy: { fieldBusy: params }, done: { fieldDone: params } })(test)
  assert.deepEqual(result.bit, [1, 1, 0, 1, 0, 0, null, null])
  assert.deepEqual(result.done.flatMap((done, tick) => done ? [tick] : []), [5])
  assert.equal(result.busy[6], false)
})

// The starter game (what npm run new-game copies), as content.js assembles it.
const starter = () => {
  const dir = new URL('./starter/', import.meta.url)
  const json = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
  return assemble({ id: 'starter', game: json('game.json'), levels: readdirSync(new URL('levels/', dir)).map((f) => [f.slice(0, -5), json(`levels/${f}`)]), glossary: json('glossary.json') })
}

test('a level drawn headlessly: each test’s bus as a waveform, every frame marked by its identifier', () => {
  const spec = domain.spec(starter())
  const [id, tasks] = [...spec.circuit.played].find(([, read]) => read.some((T) => T.tests.some((t) => t.bus.frames.length)))
  const tests = tasks.flatMap((T) => T.tests)
  const svg = domain.scene(spec, id)
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
  assert.equal(svg.match(/class="bus-line"/g).length, tests.length)
  for (const f of tests.flatMap((t) => t.bus.frames)) assert.ok(svg.includes(`>0x${f.id.toString(16)}<`))
  assert.equal(svg.match(/class="bus-sof"/g).length, tests.flatMap((t) => t.bus.frames).length)
  assert.equal(domain.scene(spec, 'nope'), null)
})

test('a course read never writes into content: the starter, read frozen', () => {
  const spec = domain.spec(deepFreeze(starter()))
  assert.deepEqual(spec.circuit.wrong, [])
  assert.deepEqual(domain.validate(spec).filter((l) => l.fail), [])
})
