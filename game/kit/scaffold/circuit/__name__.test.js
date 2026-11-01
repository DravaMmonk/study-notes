// node --test (npm test) — the __name__ domain: its parts compute, boards read from and write back to blueprint text,
// and its starter game (starter/, what npm run new-game copies) passes its own checks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { PARTS } from './parts.js'
import { fromText, toText } from './board.js'
import { runLevel } from './run.js'
import domain from './domain.js'

const level = { inputs: [{ name: 'a', label: 'a' }, { name: 'b', label: 'b' }], outputs: [{ name: 'sum', label: 'Sum' }], tests: [{ inputs: { a: 2, b: 3 }, expect: { sum: 5 } }] }
const partOf = (type) => PARTS[type]

test('add gives the sum, and 「—」 when an input is 「—」', () => {
  assert.equal(PARTS.add.eval({ a: 2, b: 3 }), 5)
  assert.equal(PARTS.add.eval({ a: 2, b: null }), null)
})

test('a board reads from blueprint text, runs, and writes back as the same text', () => {
  const lines = ['s = add(a, b)', 'sum <- s']
  const board = fromText(lines, level, partOf)
  assert.equal(runLevel(level, board, partOf).pass, true)
  assert.deepEqual(toText(board, partOf), lines)
  assert.throws(() => fromText(['s = mul(a, b)'], level, partOf), (e) => e.line === 1)
})

test('the starter game passes its checks', () => {
  const content = readContent('starter', import.meta.dirname)
  const lines = domain.validate(domain.spec(content))
  assert.deepEqual(lines.filter((l) => l.fail), [])
  assert.equal(lines.length, content.levels.length)
})
