import { test } from 'node:test'
import assert from 'node:assert/strict'
import { migrations } from './saves.js'

const merge = (save) => migrations([{ version: 2, ops: [{ merge: ['1-11', ['1-11', '1-12']] }] }]).migrate({ version: 1, ...save })

test('merged levels become the tasks of one level', () => {
  const out = merge({ solved: ['1-11'], data: { '1-11': 'a', '1-12': 'b' }, slots: { '1-11': {}, '1-12': {} }, best: { '1-12': 3 }, introSeen: { '1-12': true } })
  assert.deepEqual(out.solved, [])
  assert.deepEqual(out.data, { '1-11': ['a', 'b'] })
  assert.deepEqual(out.slots, {})
  assert.deepEqual(out.tasks, { '1-11': 1 })
  assert.deepEqual(out.best, { '1-11': 3 })
  assert.deepEqual(out.introSeen, { '1-11': true })
})

test('merged levels all solved solve the level', () => {
  const out = merge({ solved: ['1-12', '1-11', '0-1'], data: { '1-12': 'b' } })
  assert.deepEqual(out.solved, ['0-1', '1-11'])
  assert.deepEqual(out.data, { '1-11': [null, 'b'] })
  assert.equal(out.tasks, undefined)
})

test('a later task solved alone passes no task', () => {
  const out = merge({ solved: ['1-12'], tasks: {} })
  assert.deepEqual(out.solved, [])
  assert.deepEqual(out.tasks, {})
})

const split = (save) => migrations([{ version: 2, ops: [{ split: ['1-11', ['1-10', '1-11']] }] }]).migrate({ version: 1, ...save })

test('a split level gives each task its board, solved as far as its tasks passed', () => {
  const out = split({ solved: ['0-1'], data: { '1-11': ['a', 'b'] }, tasks: { '1-11': 1 }, best: { '1-11': 3 }, introSeen: { '1-11': true } })
  assert.deepEqual(out.solved, ['0-1', '1-10'])
  assert.deepEqual(out.data, { '1-10': 'a', '1-11': 'b' })
  assert.deepEqual(out.tasks, {})
  assert.deepEqual(out.best, { '1-11': 3 })
  assert.deepEqual(out.introSeen, { '1-10': true })
})

test('a split level solved solves every part', () => {
  const out = split({ solved: ['1-11'], data: { '1-11': [null, 'b'] } })
  assert.deepEqual(out.solved, ['1-10', '1-11'])
  assert.deepEqual(out.data, { '1-11': 'b' })
})
