// node --test games/kit/shell — a game's progress in the browser: kept for the puzzles it was made on, and a save made
// on other puzzles read as a fresh start.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createProgress } from './progress.js'

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
