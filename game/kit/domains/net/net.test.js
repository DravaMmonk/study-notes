// node --test (npm test) — the net domain: the formats its far ends speak (each decodes what it encodes; stuffing, CRC
// and the Hamming blocks as their definitions have them), what a level wants tick by tick and in order, a board on
// its wires with registers, a built part whose ports are its level's wires, boards as blueprint text, and its starter
// game (starter/, what npm run new-game copies) passing its own checks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { FLAG, FORMATS, arrived, bitsOf, checkOf, decode, encode, remainder, said, stuff, unstuff } from './wire.js'
import { PARTS } from './parts.js'
import { carriedOnto, fromText, toText } from './board.js'
import { runLevel } from './run.js'
import { wantOf } from './wants.js'
import { netCourse } from './course.js'
import { assemble } from '../../engine/content.js'
import domain from './domain.js'

const partOf = (type) => PARTS[type]
const W = (ins, outs) => ({ in: ins.map((name) => ({ name, label: name })), out: outs.map((name) => ({ name, label: name })) })

test('every format decodes what it encodes', () => {
  const frames = [[0x7e, 0x00], [0xff, 0x3c, 0x81]]
  for (const format of FORMATS) {
    // The formats without a start mark are read from the first tick; the others may come after quiet ticks.
    const quiet = ['startstop', 'flag', 'flagcheck'].includes(format) ? [0, 0] : []
    const bits = [...quiet, ...encode(format, format === 'blocks' ? [[3, 12, 7]] : frames), ...quiet]
    const bytes = decode(format, bits).filter((e) => e.byte !== undefined).map((e) => e.byte)
    assert.deepEqual(bytes, format === 'blocks' ? [3, 12, 7] : frames.flat(), format)
  }
})

test('stuffing never leaves six 1s in a row, and comes off again', () => {
  const ones = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  assert.ok(!stuff(ones).join('').includes('111111'))
  assert.deepEqual(unstuff(stuff(ones)), ones)
  // A frame whose content holds the flag still decodes to it.
  assert.deepEqual(decode('flag', encode('flag', [[0x7e]])).map((e) => e.byte ?? 'end'), [0x7e, 'end'])
  assert.deepEqual(encode('flag', [[]]), [...FLAG, ...FLAG])
})

test('a check fits its message, and a flip shows', () => {
  const msg = bitsOf(0xa5)
  assert.deepEqual(remainder([...msg, ...checkOf(msg)]), [0, 0, 0])
  const [frame] = [encode('flagcheck', [[0xa5, 0x01]])]
  const flipped = arrived(frame, { flips: [12] })
  assert.deepEqual(decode('flagcheck', frame).filter((e) => e.end).map((e) => e.intact), [true])
  assert.deepEqual(decode('flagcheck', flipped).filter((e) => e.end).map((e) => e.intact), [false])
  // A 4-bit block with its three check bits is corrected through any one flip.
  const block = encode('blocks', [[9]])
  for (let k = 0; k < 7; k++) assert.equal(decode('blocks', arrived(block, { flips: [k] }))[0].byte, 9)
})

test('a sender says its segments; the wire delays them and flips the ticks named', () => {
  assert.deepEqual(said([{ idle: 2 }, { bits: '101' }, { bytes: [1], format: 'startstop' }]), [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0])
  assert.deepEqual(arrived([1, 1, 0], { delay: 1, flips: [3] }, 5), [0, 1, 1, 1, 0])
})

test('what a level wants, tick by tick and in order', () => {
  const t = { ticks: 6, wires: { a: [0, 1, 1, 0, 1, 0], b: [0, 0, 1, 1, 1, 1] }, inputs: { r: [0, 0, 1, 0, 0, 0], byte: [0xa0, 0, 0, 0, 0, 0], go: [1, 0, 0, 0, 0, 0] }, queue: [[1, 2]] }
  const got = wantOf({ e: { echo: { wire: 'a' } }, d: { differ: { a: 'a', b: 'b' } }, l: { late: { wire: 'a', first: 0 } }, h: { heard: { wire: 'b' } }, c: { count: { reset: 'r' } }, s: { serial: { byte: 'byte', start: 'go' } }, p: { pattern: { wire: 'a', bits: '101' } }, m: { remainder: { wire: 'a', poly: '1011' } } })(t)
  assert.deepEqual(got.e.ticks, [0, 1, 1, 0, 1, 0])
  assert.deepEqual(got.d.ticks, [0, 1, 0, 1, 0, 1])
  assert.deepEqual(got.l.ticks, [0, 0, 1, 1, 0, 1])
  assert.deepEqual(got.h.ticks, [0, 0, 1, 1, 1, 1])
  assert.deepEqual(got.c.ticks, [0, 1, 0, 1, 2, 3])
  assert.deepEqual(got.s.ticks, [1, 0, 1, 0, 0, 0])
  assert.deepEqual(got.p.ticks, [0, 0, 0, 0, 1, 0])
  assert.deepEqual(got.m.ticks.map((r) => r.toString(2)), ['0', '1', '11', '110', '110', '111'])
  // In the check form it is the check bits of the bits so far.
  const check = wantOf({ m: { remainder: { wire: 'a', poly: '1011', form: 'check' } } })(t).m.ticks
  check.forEach((r, k) => assert.equal(r, parseInt(checkOf(t.wires.a.slice(0, k + 1)).join(''), 2)))
  // The remainder streamed tick by tick is the remainder of the bits so far.
  assert.equal(parseInt(remainder([0, 1, 1, 0, 1, 0]).join(''), 2), got.m.ticks[5])
  assert.deepEqual(wantOf({ x: { sent: { format: 'flag' } } })(t).x.order, [1, 2, 'end'])
  // Held ticks do not count, and their bits are not taken.
  const held = { ...t, inputs: { ...t.inputs, h: [0, 1, 1, 0, 0, 0] } }
  assert.deepEqual(wantOf({ c: { count: { reset: 'r', hold: 'h' } } })(held).c.ticks, [0, 0, 0, 1, 2, 3])
  assert.deepEqual(wantOf({ m: { remainder: { wire: 'a', poly: '1011', hold: 'h' } } })(held).m.ticks.map((r) => r.toString(2)), ['0', '0', '0', '0', '1', '10'])
})

test('a board on its wires: registers carry, the queue is pulled, the far end decodes what it says', () => {
  const late = { wires: W(['a'], ['b']), want: wantOf({ b: { late: { wire: 'a', first: 0 } } }), tests: [{ ticks: 4, wires: { a: [1, 0, 1, 1] }, inputs: {}, queue: [] }] }
  const board = fromText(['r = reg[reg=A, start=0]()', 'k = keep[reg=A](a)', 'b <- r'], late, partOf)
  assert.equal(runLevel(late, board, partOf).pass, true)
  const text = toText(board, partOf)
  assert.deepEqual(toText(fromText(text, late, partOf), partOf), text)
  assert.throws(() => fromText(['x = counter(a)'], late, partOf), (e) => e.line === 1)
  // A queue pulled one byte a tick, said as raw bits: the far end decoding bytes gets nothing it can use.
  const send = { wires: W([], ['out']), inputs: [{ name: 'byte', label: 'byte' }], outputs: [{ name: 'next', label: 'next' }], pulls: { input: 'byte', next: 'next' }, want: wantOf({ out: { sent: { format: 'bytes' } } }), tests: [{ ticks: 10, wires: {}, inputs: {}, queue: [[255]] }] }
  const once = fromText(['one = const[value=1]()', 'next <- one', 'out <- one'], send, partOf)
  const run = runLevel(send, once, partOf).runs[0]
  assert.deepEqual(run.ticks.map((t) => t.bind.byte), [255, null, null, null, null, null, null, null, null, null])
  assert.ok(!run.fail, 'ten 1s decode as 255 and a stray bit: exactly the queue')
})

test('a built part takes its level’s wires as ports', () => {
  const lv = (id, { builds, adds, ...task }) => ({ id, title: id, ...(adds && { adds }), ...(builds && { builds }), tasks: [{ brief: id, ...task }] })
  const content = assemble({
    id: 't',
    game: { domain: 'net', vocabulary: 2, title: 't', kicker: 'k', lede: 'l', primitives: ['reg', 'keep'], eras: [{ id: 1, title: 'e', question: 'q', foundation: ['1-1', '1-2'] }], saves: [] },
    levels: [
      ['1-1', lv('1-1', { adds: ['reg', 'keep'], wires: W(['a'], ['b']), tests: [{ wires: { a: { send: [{ bits: '1011' }] } } }], want: { b: { late: { wire: 'a', first: 0 } } }, solution: ['r = reg[reg=A, start=0]()', 'k = keep[reg=A](a)', 'b <- r'], builds: { type: 'delay', name: 'delay', desc: 'd' } })],
      ['1-2', lv('1-2', { wires: W(['x'], ['y']), tests: [{ wires: { x: { send: [{ bits: '1101' }] } } }], want: { y: { late: { wire: 'x', first: 0 } } }, solution: ['d = delay(x)', 'y <- d'] })],
    ],
    glossary: { groups: [], entries: [] },
  })
  const net = netCourse(content)
  assert.deepEqual(net.wrong, [])
  const L = net.played.get('1-2')[0]
  assert.equal(runLevel(L, L.solution, net.partOf).pass, true)
  // Two of them on one board keep their own registers: a delay of two ticks.
  const two = { ...L, want: wantOf({ y: 'given' }), tests: [{ ticks: 4, wires: { x: [1, 1, 0, 1] }, inputs: {}, queue: [], expect: { y: [0, 0, 1, 1] } }] }
  assert.equal(runLevel(two, fromText(['d = delay(x)', 'e = delay(d)', 'y <- e'], two, net.partOf), net.partOf).pass, true)
})

test('a board carried onto another level keeps its parts and the wires its new fixed cards still take', () => {
  const from = { wires: W(['a'], ['b']), inputs: [{ name: 'r', label: 'r' }] }
  const onto = { wires: W(['a'], ['b']), inputs: [{ name: 'h', label: 'h' }] }
  const board = fromText(['s = select(r, a, a)', 'b <- s'], from, partOf)
  const carried = carriedOnto(onto, board)
  assert.deepEqual(carried.nodes.map((n) => n.id).sort(), ['a', 'b', 'h', 's'])
  assert.deepEqual(carried.wires.map((w) => `${w.from}>${w.to}.${w.port}`).sort(), ['a>s.no', 'a>s.yes', 's>b.in'])
})

test('a reply a frame, and yes standing for 1', () => {
  const t = { ticks: 1, wires: { a: arrived([...encode('flagbyte', [[1], [2]]), ...arrived(encode('flagbyte', [[3]]), { flips: [12] })]) }, inputs: {}, queue: [] }
  assert.deepEqual(wantOf({ x: { answers: { wire: 'a', format: 'flagbyte' } } })(t).x.order, [1, 'end', 1, 'end', 0, 'end'])
  const level = { outputs: [{ name: 'o', label: 'o' }], want: wantOf({ o: 'given' }), tests: [{ ticks: 2, wires: {}, inputs: {}, queue: [], expect: { o: [1, 0] } }] }
  const eq = fromText(['z = const[value=0]()', 'e = equal(z, z)', 'o <- e'], level, partOf)
  assert.equal(runLevel(level, eq, partOf).runs[0].fail.tick, 1)
})

test('the starter game passes its checks', async () => {
  const dir = new URL('./starter/', import.meta.url)
  const json = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
  const content = assemble({
    id: 'starter',
    game: json('game.json'),
    levels: readdirSync(new URL('levels/', dir)).map((f) => [f.slice(0, -5), json(`levels/${f}`)]),
    glossary: json('glossary.json'),
  })
  const lines = await domain.validate(domain.spec(content))
  assert.deepEqual(lines.filter((l) => l.fail), [])
})
