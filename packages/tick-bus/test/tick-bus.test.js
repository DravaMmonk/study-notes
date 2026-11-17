// node --test (npm test) — the tick-bus domain: the line's rule, what a level wants tick by tick, a board that talks
// and keeps a register, boards as blueprint text, and its starter game (starter/, what npm run new-game copies)
// passing its own checks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bitsOf, lineOf } from '../core/line.js'
import { defineParts } from '../../circuit/core/index.js'
import { board } from '../core/board.js'
import { primitivesOnly } from '../../circuit/core/index.js'
import { runLevel } from '../core/run.js'
import { wantOf } from '../core/wants.js'

const { PARTS } = defineParts({ parts: {
  'sample/reg': { name: 'Register', desc: 'Read a register', icon: 'Box', family: 'memory', settings: { reg: { control: 'text', default: 'A' }, start: { control: 'number', default: 0 } }, op: 'circuit:held' },
  'sample/keep': { name: 'Keep', desc: 'Store an input', icon: 'Box', family: 'memory', inputs: [{ name: 'in' }], settings: { reg: { control: 'text', default: 'A' } }, keeps: { input: 'in', register: 'reg' } },
} }, {})
const plain = primitivesOnly(board, PARTS)
const { fromText, toText } = board
const { partOf } = plain

test('the line is 1 when anyone says 1', () => {
  assert.equal(lineOf([0, 1, undefined]), 1)
  assert.equal(lineOf([0, undefined]), 0)
  assert.deepEqual(bitsOf('01.'), [0, 1, undefined])
})

test('a board keeps a register and says it a tick late', () => {
  const inputs = { b: [1, 0, 1] }
  const level = { talks: true, inputs: [{ name: 'b', label: 'b' }], want: wantOf({ say: { 'tick-bus:want-delayed': { input: 'b', first: 0 } } }), tests: [{ line: bitsOf('...'), inputs }] }
  const lines = ['r = sample/reg[reg=A, start=0]()', 'k = sample/keep[reg=A](b)', 'say <- r']
  const made = fromText(lines, level, plain)
  const run = runLevel(level, made, partOf)
  assert.equal(run.pass, true)
  assert.deepEqual(run.runs[0].ticks.map((t) => t.said), [0, 1, 0])
  // Written out and read back, a board writes the same text again.
  const text = toText(made, level, plain)
  assert.deepEqual(toText(fromText(text, level, plain), level, plain), text)
  assert.throws(() => fromText(['x = counter(b)'], level, plain), (e) => e.line === 1)
})

test('a board that says what it hears this very tick has a loop', () => {
  const level = { listens: true, talks: true, want: wantOf({ say: 'tick-bus:want-line' }), tests: [{ line: bitsOf('01') }] }
  assert.ok(runLevel(level, fromText(['say <- line'], level, plain), partOf).runs[0].error)
})
