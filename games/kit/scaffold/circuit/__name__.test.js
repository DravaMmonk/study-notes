// node --test (npm test) — the __name__ domain: its engine resources compute, the starter's parts (parts.json) hold
// together over them, boards read from and write back to blueprint text, and its starter game (starter/, what npm run
// new-game copies) passes its own checks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { defineParts, partProblems } from '../../engine/parts/define.js'
import { FIXED_PARTS } from './parts.js'
import { OPS } from './ops.js'
import { vocabulary } from './vocabulary.js'
import { fromText, toText } from './board.js'
import { runLevel } from './run.js'
import domain from './domain.js'

const level = { inputs: [{ name: 'a', label: 'a' }, { name: 'b', label: 'b' }], outputs: [{ name: 'sum', label: 'Sum' }], tests: [{ inputs: { a: 2, b: 3 }, expect: { sum: 5 } }] }
const content = readContent('starter', import.meta.dirname)
const { PARTS } = defineParts(content.partDefs, OPS)
const partOf = (type) => FIXED_PARTS[type] ?? PARTS[type]

test('the resources compute; a part made of them gives 「—」 when an input is 「—」', () => {
  assert.equal(OPS.add.run([2, 3]), 5)
  assert.throws(() => OPS.sub.run([2, 'x']), /not a number/)
  assert.deepEqual(partProblems(content.partDefs, vocabulary), [])
  assert.equal(PARTS.add.eval({ a: 2, b: 3 }, { params: {} }), 5)
  assert.equal(PARTS.add.eval({ a: 2, b: null }, { params: {} }), null)
})

test('a board reads from blueprint text, runs, and writes back as the same text', () => {
  const lines = ['s = add(a, b)', 'sum <- s']
  const board = fromText(lines, level, partOf)
  assert.equal(runLevel(level, board, partOf).pass, true)
  assert.deepEqual(toText(board, partOf), lines)
  assert.throws(() => fromText(['s = mul(a, b)'], level, partOf), (e) => e.line === 1)
})

test('the starter game passes its checks', () => {
  const lines = domain.validate(domain.spec(content))
  assert.deepEqual(lines.filter((l) => l.fail), [])
  assert.equal(lines.length, content.levels.length)
})
