// node --test games/kit/shell — a game's progress in the browser: kept task by task for the puzzle each was made on.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createProgress, earnedUnlocks, firstTask, flagsIn, fresh, inheritedBoard, nextRequiredTask, passed, requiredLevels, taskOpen, taskPassed } from './progress.js'

const storage = new Map()
globalThis.window = { localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } }

test('a task whose puzzle changed loses its save, its level is unsolved, and every other task keeps its own', () => {
  const tasks = { a: { level: 'one', stamp: 'aaaa' }, b: { level: 'one', stamp: 'bbbb' }, c: { level: 'two', stamp: 'cccc' } }
  const made = createProgress({ id: 'g', tasks })
  made.save({ ...made.load(), solved: ['one', 'two'], passed: ['a', 'b', 'c'], data: { a: 1, b: 2, c: 3 }, built: { b: 2, c: 3 }, best: { one: 5, two: 6 } })
  assert.deepEqual(createProgress({ id: 'g', tasks }).load().solved, ['one', 'two'])
  // b's puzzle changes; a task that is gone from the content (and a new one) changes nothing else.
  const now = createProgress({ id: 'g', tasks: { a: tasks.a, b: { level: 'one', stamp: 'other' }, d: { level: 'two', stamp: 'dddd' } } }).load()
  assert.deepEqual([now.solved, now.passed, now.data, now.built, now.best], [['two'], ['a'], { a: 1 }, {}, { two: 6 }])
  assert.deepEqual(now.stamps, { a: 'aaaa', b: 'other', d: 'dddd' })
})

test('a save of another shape, or one that does not parse, reads as a fresh start', () => {
  const made = createProgress({ id: 'h', tasks: { a: { level: 'one', stamp: 'aaaa' } } })
  storage.set(made.key, JSON.stringify({ stamp: 'old', solved: ['one'] }))
  assert.deepEqual(made.load().solved, [])
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

test('passing the last task early completes an all-unlocked level without passing earlier tasks', () => {
  const last = passed(game, { ...fresh(), all: true }, level, 2, { count: 4 })
  assert.deepEqual(last.passed, ['last'])
  assert.deepEqual(last.solved, [level.id])
  assert.equal(taskPassed(game, last, level.id, 0), false)
  assert.equal(firstTask(game, last, level.id), 2)
  assert.deepEqual(last.flags, ['part'])
  assert.deepEqual(last.best[level.id], { count: 4 })
  const normal = passed(game, fresh(), level, 2)
  assert.deepEqual(normal.solved, [])
})

test('next required task prefers later tasks and revisits earlier ones only when needed', () => {
  const start = { ...fresh(), all: true }
  assert.equal(nextRequiredTask(game, start, level.id, 1), 2)
  assert.equal(nextRequiredTask(game, start, level.id, 2), -1)
  assert.equal(nextRequiredTask(game, fresh(), level.id, 2), 0)
  const earlier = passed(game, passed(game, start, level, 0), level, 1)
  assert.equal(nextRequiredTask(game, earlier, level.id, 2), -1)
})

test('all-unlocked inheritance uses the reference until the prerequisite is passed', () => {
  const reference = { nodes: [{ id: 'reference' }], wires: [] }
  const attempted = { nodes: [{ id: 'attempt' }], wires: [] }
  const passedBoard = { nodes: [{ id: 'passed' }], wires: [] }
  const task = { id: 'earlier', key: 'earlier-task', source: { solution: reference } }
  const start = { ...fresh(), all: true, data: { 'earlier-task': attempted } }
  assert.deepEqual(inheritedBoard(start, task), reference)
  const completed = { ...start, passed: ['earlier-task'], built: { 'earlier-task': passedBoard } }
  const inherited = inheritedBoard(completed, task)
  assert.deepEqual(inherited, passedBoard)
  assert.notEqual(inherited, passedBoard)
  assert.equal(inheritedBoard({ ...fresh(), data: start.data }, task), undefined)
})

test('passing a carried task retains its passing circuit when the working board changes later', () => {
  const source = { id: 'source', tasks: [{ key: 'source-task' }], unlocks: [] }
  const target = { id: 'target', tasks: [{ key: 'target-task', source: { carry: 'source' } }], unlocks: [] }
  const g = { byId: { source, target }, better: () => true }
  const board = { nodes: [{ id: 'passed' }], wires: [] }
  const done = passed(g, { ...fresh(), data: { 'source-task': board } }, source, 0)
  assert.deepEqual(done.built['source-task'], board)
  assert.deepEqual(inheritedBoard({ ...done, data: { 'source-task': { nodes: [], wires: [] } } }, { id: 'source', ...source.tasks[0] }), board)
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

test('passing only an optional task does not complete the required tasks in all-unlocked mode', () => {
  const l = { id: 'mixed', tasks: [{ key: 'required' }, { key: 'extra', optional: true }], unlocks: [] }
  const g = { byId: { mixed: l }, better: () => true }
  const p = passed(g, { ...fresh(), all: true }, l, 1)
  assert.deepEqual(p.solved, [])
  assert.deepEqual(p.passed, ['extra'])
})

test('optional levels do not block the route and never count as solved', () => {
  const all = { start: { id: 'start', requires: [] }, one: { id: 'one', optional: true, requires: ['start'] }, two: { id: 'two', optional: true, requires: ['one'] }, next: { id: 'next', requires: ['two'] } }
  const required = (id) => requiredLevels(all[id], all, (level) => level.requires)
  assert.deepEqual(required('one'), ['start'])
  assert.deepEqual(required('next'), ['start'])
  assert.equal(required('next').every((id) => new Set(['start']).has(id)), true)
  assert.equal(required('next').every((id) => new Set().has(id)), false)
})
