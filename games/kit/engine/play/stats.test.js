// The audit panel's numbers over made-up sessions (./stats.js): difficulty level by level, and when difficulty-spike
// reports, fails, or keeps quiet.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { perLevel } from './stats.js'

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
