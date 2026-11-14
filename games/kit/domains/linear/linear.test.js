// node --test (npm test) — the linear domain: its engine resources compute on numbers, vectors and matrices and say why
// when handed the wrong kind, the starter's parts (parts.json) hold together over them, boards read from and write back
// to blueprint text, and its starter game (starter/, what npm run new-game copies) passes its own checks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { defineParts, partProblems } from '../../engine/parts/define.js'
import { OPS } from './ops.js'
import { vocabulary } from './vocabulary.js'
import { board } from './board.js'
import { primitivesOnly } from '../../engine/board-cards.js'
import { runLevel } from './run.js'
import { fromContent, same, show } from './values.js'
import domain from './domain.js'

const v = (...xs) => fromContent(xs)
const m = (...rows) => fromContent(rows)
const content = readContent('starter', import.meta.dirname)
const { PARTS } = defineParts(content.partDefs, OPS)
const plain = primitivesOnly(board, PARTS)
const { fromText, toText } = board
const { partOf } = plain

test('values read from content: a list is a vector, a list of rows a matrix; written as a card writes them', () => {
  assert.deepEqual(v(1, 2), { w: 1, h: 2, c: 1, data: [1, 2] })
  assert.deepEqual(m([1, 2], [3, 4]), { w: 2, h: 2, c: 1, data: [1, 2, 3, 4] })
  assert.equal(show(v(0.1 + 0.2, -0)), '(0.3, 0)')
  assert.equal(show(m([1, 2], [3, 4])), '[1 2; 3 4]')
  assert.equal(same(v(0.1 + 0.2), v(0.3)), true)
  assert.equal(same(v(1, 2), m([1, 2])), false)
})

test('the resources compute and say why on a value of the wrong kind or shape', () => {
  assert.deepEqual(OPS.add.run([v(1, 2), v(3, -1)]), v(4, 1))
  assert.deepEqual(OPS.scale.run([2, m([1, 0], [0, 1])]), m([2, 0], [0, 2]))
  assert.equal(OPS.entry.run([v(5, 6, 7), '3']), 7)
  assert.deepEqual(OPS.column.run([m([1, 2], [3, 4]), '2']), v(2, 4))
  assert.deepEqual(OPS.join.run([v(1, 3), v(2, 4), null]), m([1, 2], [3, 4]))
  assert.deepEqual(OPS.vec.run([1, 2, null]), v(1, 2))
  assert.equal(OPS.arith.run([1, 4], { op: 'div' }), 0.25)
  assert.throws(() => OPS.add.run([v(1, 2), v(1, 2, 3)]), /shape/)
  assert.throws(() => OPS.scale.run([v(1), v(1, 2)]), /wants a number/)
  assert.throws(() => OPS.entry.run([v(1, 2), '3']), /no number 3/)
  assert.throws(() => OPS.join.run([v(1, 2), null, v(3, 4)]), /middle/)
  assert.throws(() => OPS.arith.run([1, 0], { op: 'div' }), /division by 0/)
  assert.deepEqual(partProblems(content.partDefs, vocabulary), [])
  assert.equal(PARTS.add.eval({ u: v(1, 2), v: null }, { params: {} }), null)
})

test('a board reads from blueprint text, runs, and writes back as the same text', () => {
  const level = { inputs: [{ name: 'u', label: 'u' }, { name: 'v', label: 'v' }], outputs: [{ name: 'out', label: 'Out' }], tests: [{ inputs: { u: v(1, 2), v: v(3, 4) }, expect: { out: v(8, 12) } }] }
  const lines = ['k = num[value="2"]()', 's = add(u, v)', 'd = scale(k, s)', 'out <- d']
  const made = fromText(lines, level, plain)
  assert.equal(runLevel(level, made, partOf).pass, true)
  assert.deepEqual(toText(made, level, plain), lines)
  assert.throws(() => fromText(['s = mul(u, v)'], level, plain), (e) => e.line === 1)
})

test('the starter game passes its checks', () => {
  const lines = domain.validate(domain.spec(content))
  assert.deepEqual(lines.filter((l) => l.fail), [])
  assert.equal(lines.length, content.levels.length)
})
