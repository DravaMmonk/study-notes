// node --test (npm test) — the signal domain: its engine resources compute on numbers and waves and say why when
// handed the wrong kind, a wave's amount of each tone is read off whatever else it holds, the starter's parts
// (parts.json) hold together over the resources, boards read from and write back to blueprint text, and its starter
// game (starter/, what npm run new-game copies) passes its own checks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { defineParts, partProblems } from '../../engine/parts/define.js'
import { OPS, PITCHES, SAMPLES } from './ops.js'
import { vocabulary } from './vocabulary.js'
import { board } from './board.js'
import { primitivesOnly } from '../../engine/board-cards.js'
import { runLevel } from './run.js'
import { same, wave } from './values.js'
import domain from './domain.js'

const w = (...data) => wave(data)
const level = { inputs: [{ name: 'k', label: 'k' }, { name: 'a', label: 'a' }, { name: 'b', label: 'b' }], outputs: [{ name: 'out', label: 'Out' }], tests: [{ inputs: { k: 2, a: w(1, 0, -1), b: w(1, 1, 1) }, expect: { out: w(3, 1, -1) } }] }
const content = readContent('starter', import.meta.dirname)
const { PARTS } = defineParts(content.partDefs, OPS)
const plain = primitivesOnly(board, PARTS)
const { fromText, toText } = board
const { partOf } = plain

test('the resources compute on numbers and waves, and say why when handed the wrong kind', () => {
  assert.deepEqual(OPS.mix.run([w(1, 2), w(3, 4)]), w(4, 6))
  assert.deepEqual(OPS.scale.run([-2, w(1, 2)]), w(-2, -4))
  assert.deepEqual(OPS.multiply.run([w(1, 2), w(3, 4)]), w(3, 8))
  assert.equal(OPS.mean.run([w(1, 2, 6)]), 3)
  assert.equal(OPS.tone.run([], { pitch: 'low' }).w, SAMPLES)
  assert.throws(() => OPS.mix.run([w(1, 2), w(1, 2, 3)]), /length/)
  assert.throws(() => OPS.scale.run([w(1), w(1, 2)]), /wants a number/)
  assert.throws(() => OPS.mean.run([3]), /wants a wave/)
})

test('a wave holds as much of each tone as went into it, whatever else it holds', () => {
  const tone = (pitch) => OPS.tone.run([], { pitch })
  const made = (amounts) => Object.keys(PITCHES).map((pitch) => OPS.scale.run([amounts[pitch], tone(pitch)])).reduce((a, b) => OPS.mix.run([a, b]))
  const amounts = { low: 3, mid: -1.5, high: 0.25 }
  const offset = wave(Array.from({ length: SAMPLES }, (_, n) => 0.75 + (n % 2 ? -1 : 1)))
  for (const x of [made(amounts), OPS.mix.run([made(amounts), offset])]) for (const pitch of Object.keys(PITCHES)) assert.ok(same(OPS.amount.run([x], { pitch }), amounts[pitch]))
  // The amount is twice the mean of the wave times the tone: a tone against itself averages a half, against another 0.
  for (const p of Object.keys(PITCHES)) for (const q of Object.keys(PITCHES)) assert.ok(same(OPS.mean.run([OPS.multiply.run([tone(p), tone(q)])]), p === q ? 0.5 : 0))
})

test('a part made of the resources gives 「—」 when an input is 「—」', () => {
  assert.deepEqual(partProblems(content.partDefs, vocabulary), [])
  assert.deepEqual(PARTS.mix.eval({ a: w(1, 2), b: w(1, 1) }, { params: {} }), w(2, 3))
  assert.equal(PARTS.mix.eval({ a: w(1, 2), b: null }, { params: {} }), null)
})

test('a board reads from blueprint text, runs, and writes back as the same text', () => {
  const lines = ['s = scale(k, a)', 'm = mix(s, b)', 'out <- m']
  const made = fromText(lines, level, plain)
  assert.equal(runLevel(level, made, partOf).pass, true)
  assert.deepEqual(toText(made, level, plain), lines)
  assert.throws(() => fromText(['s = gain(k, a)'], level, plain), (e) => e.line === 1)
})

test('the starter game passes its checks', () => {
  const lines = domain.validate(domain.spec(content))
  assert.deepEqual(lines.filter((l) => l.fail), [])
  assert.equal(lines.length, content.levels.length)
})
