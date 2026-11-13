import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cases, hidden, inOrder, property, sameAs, ticks } from './judge.js'

test('reference comparisons read a work and report the wanted and actual values', () => {
  const judge = sameAs(2, {
    at: 'answer',
    got: (work) => work.answer,
    same: (want, got) => Math.abs(want - got) < 0.1,
    why: () => 'outside the tolerance',
  })
  assert.equal(judge({ answer: 2.05 }), null)
  assert.deepEqual(judge({ answer: 3 }), { at: 'answer', want: 2, got: 3, why: 'outside the tolerance' })
})

test('case judging stops at the first failure and identifies the case', () => {
  const checked = []
  const judge = cases([2, 4, 6], (work, want) => {
    checked.push(want)
    return sameAs(want, { why: () => 'wrong answer' })(work(want))
  })
  assert.deepEqual(judge((want) => want / 2 + 1), { check: 1, want: 4, got: 3, why: 'wrong answer' })
  assert.deepEqual(checked, [2, 4])
  assert.equal(judge((want) => want), null)
})

test('ticks skip unconstrained values and report the first wrong port in tick order', () => {
  const judge = ticks({
    checked: [{ name: 'x' }, { name: 'y' }],
    want: (name) => ({ x: [undefined, 2], y: [null, 3] })[name],
    why: (port) => port.name,
  })
  const first = { tick: 0, outputs: { x: 9 } }
  assert.equal(judge([first, { tick: 1, outputs: { x: 2, y: 3 } }]), null)
  assert.deepEqual(judge([first, { tick: 1, outputs: { x: 4, y: 5 } }]), {
    at: { tick: 1, id: 'x' }, want: 2, got: 4, why: 'x',
  })
})

test('ordered checks stop at a property failure before attempting the next check', () => {
  const filled = property((work) => work.length > 0, () => ({ at: { row: 0, slot: 0 }, why: 'empty' }))
  const example = cases(['a'], (work, want) => sameAs(want, { why: () => 'different' })(work[0]))
  const judge = inOrder(filled, example)
  assert.deepEqual(judge([]), { at: { row: 0, slot: 0 }, why: 'empty' })
  assert.deepEqual(judge(['b']), { check: 0, want: 'a', got: 'b', why: 'different' })
  assert.equal(judge(['a']), null)
})

test('hidden cases are absent from the visible checks and still expose the first failure', () => {
  const inspect = (work, want) => sameAs(want, { why: () => 'different' })(work[want - 1])
  const shown = cases([1], inspect)
  const unseen = cases([2], inspect)
  const judge = inOrder(shown, hidden(unseen))
  assert.deepEqual(judge.checks, [1])
  assert.deepEqual(unseen.checks, [2])
  assert.deepEqual(judge([1, 0]), { check: 0, want: 2, got: 0, why: 'different' })
})
