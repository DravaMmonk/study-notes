// node --test games/kit/shell — a game's progress in the browser: kept for the puzzles it was made on, and a save made
// on other puzzles read as a fresh start.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createProgress, earnedUnlocks, firstTask, flagsIn, fresh, passed, requiredLevels, taskOpen, taskPassed } from './progress.js'

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


test('optional tasks can be skipped without granting their rewards or appearing passed', () => {
  const l = { id: 'mixed', tasks: [{ key: 'extra', optional: true, opens: ['extra-part'] }, { key: 'required' }], unlocks: ['level-part', 'extra-part'] }
  const g = { byId: { mixed: l }, better: () => true, flagsOf: (p) => p.flags, unlocksBefore: () => [] }
  const start = fresh()
  assert.equal(taskOpen(g, start, 'mixed', 1), true)
  assert.equal(taskPassed(g, start, 'mixed', 0), false)
  assert.equal(flagsIn(g, start, l, 1).has('extra-part'), false)
  const onlyExtra = passed(g, start, l, 0)
  assert.deepEqual(onlyExtra.solved, [])
  assert.deepEqual(onlyExtra.flags, ['extra-part'])
  const skipped = { ...start, skippedTasks: ['extra'] }
  assert.equal(firstTask(g, skipped, 'mixed'), 1)
  const done = passed(g, skipped, l, 1)
  assert.deepEqual(done.solved, ['mixed'])
  assert.deepEqual(done.flags, ['level-part'])
  assert.deepEqual(earnedUnlocks(l, done), ['level-part'])
  assert.equal(taskPassed(g, done, 'mixed', 0), false)
  const extraDone = passed(g, done, l, 0)
  assert.equal(taskPassed(g, extraDone, 'mixed', 0), true)
  assert.equal(flagsIn(g, extraDone, l, 1).has('extra-part'), true)
  assert.deepEqual(extraDone.flags, ['level-part', 'extra-part'])
  assert.deepEqual(extraDone.skippedTasks, [])
})

test('optional levels do not block the route and never count as solved', () => {
  const all = { start: { id: 'start', requires: [] }, one: { id: 'one', optional: true, requires: ['start'] }, two: { id: 'two', optional: true, requires: ['one'] }, next: { id: 'next', requires: ['two'] } }
  const required = (id) => requiredLevels(all[id], all, (level) => level.requires)
  assert.deepEqual(required('one'), ['start'])
  assert.deepEqual(required('next'), ['start'])
  assert.equal(required('next').every((id) => new Set(['start']).has(id)), true)
  assert.equal(required('next').every((id) => new Set().has(id)), false)
})
