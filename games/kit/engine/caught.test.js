// node --test (npm test) — a task read from the side of its checks (caught.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { caught } from './caught.js'

// Boards here are functions of a row's `x`; a test is { x, y }; a run fails when the board gives another y.
const task = { inputs: [{ name: 'x' }], outputs: [{ name: 'y' }], solution: (x) => 2 * x, works: [{ board: (x) => x + 2 }, { board: (x) => x * x }] }
const check = (_, row) => (row.y === null ? { unfilled: true } : row.x < 0 ? { why: 'never below zero' } : { test: row })
const run = (board, tests) => tests.map((t) => (board(t.x) === t.y ? {} : { fail: { want: t.y, got: board(t.x), why: 'wrong value' } }))
const on = (rows) => caught({ task, rows, check, run })

test('rows are no checks until each is filled in, can happen, and is what a sound work gives', () => {
  assert.deepEqual(on([{ x: 1, y: null }]), { row: 0, why: 'unfilled' })
  assert.deepEqual(on([{ x: 1, y: 2 }, { x: -1, y: -2 }]), { row: 1, why: 'never', said: 'never below zero' })
  assert.deepEqual(on([{ x: 3, y: 5 }]), { row: 0, why: 'unsound' })
})

test('every wrong work has to fail a row: one where all agree catches none', () => {
  assert.deepEqual(on([{ x: 2, y: 4 }]).catches, [-1, -1], 'at 2 the three give the same')
  assert.deepEqual(on([{ x: 2, y: 4 }, { x: 3, y: 6 }]).catches, [1, 1])
})
