import { resolve } from 'node:path'
// node --test (npm test) — the circuit domain: its engine resources compute, the starter's parts (parts.json) hold
// together over them, boards read from and write back to blueprint text, and its starter game (starter/, what npm run
// new-game copies) passes its own checks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readStarter } from "../../../../../games/kit/engine/resolver.js"
import { defineParts, partProblems } from '../../../core/index.js'
import { OPS } from '../../../core/index.js'
import { vocabulary } from '../../../core/index.js'
import { board } from '../../../core/index.js'
import { primitivesOnly } from '../../../core/index.js'
import { runLevel } from '../../../core/index.js'
import { runtime as domain } from '../../../core/index.js'

const level = { inputs: [{ name: 'a', label: 'a' }, { name: 'b', label: 'b' }], outputs: [{ name: 'sum', label: 'Sum' }], tests: [{ inputs: { a: 2, b: 3 }, expect: { sum: 5 } }] }
const content = readStarter(resolve(import.meta.dirname, '../../../../../games/kit/templates', import.meta.dirname.split('/').at(-1)))
const { PARTS } = defineParts(content.partDefs, OPS)
const plain = primitivesOnly(board, PARTS)
const { fromText, toText } = board
const { partOf } = plain

test('the resources compute; a part made of them gives 「—」 when an input is 「—」', () => {
  assert.equal(OPS['circuit:add'].run([2, 3]), 5)
  assert.throws(() => OPS['circuit:sub'].run([2, 'x']), /not a number/)
  assert.deepEqual(partProblems(content.partDefs, vocabulary), [])
  assert.equal(PARTS['starter/add'].eval({ a: 2, b: 3 }, { params: {} }), 5)
  assert.equal(PARTS['starter/add'].eval({ a: 2, b: null }, { params: {} }), null)
})

test('a board reads from blueprint text, runs, and writes back as the same text', () => {
  const lines = ['s = starter/add(a, b)', 'sum <- s']
  const made = fromText(lines, level, plain)
  assert.equal(runLevel(level, made, partOf).pass, true)
  assert.deepEqual(toText(made, level, plain), lines)
  assert.throws(() => fromText(['s = mul(a, b)'], level, plain), (e) => e.line === 1)
})

test('the starter game passes its checks', () => {
  const lines = domain.validate(domain.spec(content))
  assert.deepEqual(lines.filter((l) => l.fail), [])
  assert.equal(lines.length, content.levels.length)
})
