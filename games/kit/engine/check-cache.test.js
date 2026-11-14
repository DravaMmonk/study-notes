// node --test (npm test) — which levels' kept checks a change reaches (check-cache.js), on a small course written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { levelKeys } from './check-cache.js'

const level = (id, answer, title = id) => ({ id, title: { zh: title }, answer, tasks: [{ id: `${id}t`, answer }] })
const content = (levels) => ({ id: 'toy', domain: 'toy', levels })
// a → b → c, and d on its own branch after a.
const course = {
  index: new Map(['a', 'b', 'c', 'd'].map((id, k) => [id, k])),
  before: (x, y) => ({ b: ['a'], c: ['a', 'b'], d: ['a'] }[y] ?? []).includes(x),
}
const keys = (levels) => levelKeys(content(levels), course).keys
const changed = (before, after) => [...before.keys()].filter((id) => before.get(id) !== after.get(id))
const base = [level('a', 1), level('b', 2), level('c', 3), level('d', 4)]

test('a level’s own words change only its own key', () => {
  assert.deepEqual(changed(keys(base), keys([level('a', 1, 'renamed'), ...base.slice(1)])), ['a'])
})

test('a level’s answer changes its key and those of the levels after it, not those beside it', () => {
  assert.deepEqual(changed(keys(base), keys([base[0], level('b', 9), ...base.slice(2)])), ['b', 'c'])
  assert.deepEqual(changed(keys(base), keys([level('a', 9), ...base.slice(1)])), ['a', 'b', 'c', 'd'])
})

test('the game around its levels changes every key', () => {
  const other = levelKeys({ ...content(base), primitives: ['x'] }, course).keys
  assert.deepEqual(changed(keys(base), other), ['a', 'b', 'c', 'd'])
})

test('a task is kept under its level', () => {
  assert.equal(levelKeys(content(base), course).home.get('bt'), 'b')
})
