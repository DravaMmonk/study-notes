// The audit panel's numbers over made-up sessions (./stats.js): difficulty level by level, and when difficulty-spike
// reports, fails, or keeps quiet.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SPIKE, perLevel, spikes } from './stats.js'

// A course of four required levels in a row, and an optional one hanging after b.
const course = {
  plan: {
    requires: new Map([['a', []], ['b', ['a']], ['c', ['b']], ['d', ['c']], ['x', ['b']]]),
    place: new Map([['a', { role: 'foundation' }], ['b', { role: 'foundation' }], ['c', { role: 'foundation' }], ['d', { role: 'foundation' }], ['x', { role: 'challenge' }]]),
  },
}
const session = (attempts, outcomes = {}) => ({
  limits: { attempts: 6 },
  levels: Object.entries(attempts).map(([level, n]) => ({ level, task: 0, outcome: outcomes[level] ?? 'solved', required: level !== 'x', attempts: n, hints: 0, parts: [] })),
})

test('a level given up costs the cap and one more; a skipped level costs nothing', () => {
  const stats = perLevel([session({ a: 1, b: 6, c: 2 }, { b: 'gave-up', c: 'skipped' })])
  assert.equal(stats.get('a').cost, 1)
  assert.equal(stats.get('b').cost, 7)
  assert.equal(stats.get('b').solved, 0)
  assert.equal(stats.has('c'), false)
})

test('a level that stands out against its neighbours on the tree is a spike; optional levels are not its neighbours', () => {
  const found = spikes(course, [session({ a: 1, b: 1, c: 5, d: 1, x: 9 })])
  assert.deepEqual(found.map((f) => f.level), ['c'])
  assert.equal(found[0].enough, false)
  // Twice its neighbours but fewer than SPIKE.gap attempts more is no spike.
  assert.deepEqual(spikes(course, [session({ a: 1, b: 1, c: 2, d: 1 })]), [])
})

test('with enough sessions a spike is a finding the check fails on', () => {
  const many = Array.from({ length: SPIKE.sessions }, () => session({ a: 1, b: 1, c: 5, d: 1 }))
  assert.equal(spikes(course, many)[0].enough, true)
})
