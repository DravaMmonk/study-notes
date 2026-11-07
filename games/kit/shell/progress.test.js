// node --test games/kit/shell — a game's progress in the browser: kept for the puzzles it was made on, and a save made
// on other puzzles read as a fresh start.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createProgress, fresh, passed, taskOpen, taskPassed } from './progress.js'

const storage = new Map()
globalThis.window = { localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } }

test('a save is read for the stamp it was made on, and on another stamp the player starts afresh', () => {
  const made = createProgress({ id: 'g', stamp: 'aaaa' })
  made.save({ ...made.load(), solved: ['1-1'] })
  assert.deepEqual(createProgress({ id: 'g', stamp: 'aaaa' }).load().solved, ['1-1'])
  const other = createProgress({ id: 'g', stamp: 'bbbb' }).load()
  assert.deepEqual([other.stamp, other.solved], ['bbbb', []])
  storage.set(made.key, '{ not json')
  assert.deepEqual(made.load().solved, [])
})

const level = { id: 'level', tasks: [{ key: 'first' }, { key: 'second' }, { key: 'last' }], unlocks: ['part'] }
const game = { byId: { level }, better: () => true }

test('unlocking all opens later tasks without passing them', () => {
  const p = fresh()
  assert.equal(taskOpen(game, p, level.id, 0), true)
  assert.equal(taskOpen(game, p, level.id, 2), false)
  assert.equal(taskOpen(game, { ...p, all: true }, level.id, 2), true)
  assert.equal(taskPassed(game, { ...p, all: true }, level.id, 2), false)
})

test('passing the last task early neither completes the level nor earns its reward', () => {
  const last = passed(game, { ...fresh(), all: true }, level, 2, { count: 4 })
  assert.deepEqual(last.passed, ['last'])
  assert.deepEqual(last.solved, [])
  assert.deepEqual(last.flags, [])
  const complete = passed(game, passed(game, last, level, 0), level, 1)
  assert.deepEqual(complete.solved, [level.id])
  assert.deepEqual(complete.flags, ['part'])
  assert.deepEqual(complete.best[level.id], { count: 4 })
})
