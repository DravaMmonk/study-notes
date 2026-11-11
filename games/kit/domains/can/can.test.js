// node --test games/kit/domains/can — the bus: frames, stuffing and CRC as ISO 11898-1 has them; what a task's
// outputs must be (wants.js); boards as blueprint text (board.js); what hidden tests catch, on a course written here;
// a level of the starter game (starter/) drawn headlessly (scene.js); every game on the domain read frozen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bitsOf, busOf, crc15, frameBits, stuff, wiredAnd } from './bus.js'
import { board } from './board.js'
import { PARTS } from './parts.js'
import { wantOf } from './wants.js'
import { canCourse } from './course.js'
import { runLevel } from './run.js'
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
