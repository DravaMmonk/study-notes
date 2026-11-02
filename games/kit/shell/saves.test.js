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

const step = (op) => migrations([{ version: 2, ops: [{ task: op }] }]).migrate
test('a task moved takes its board, every slot’s, its part’s and its being passed to the level it goes to', () => {
  const save = { version: 1, solved: [], data: { p: { a: 'A', b: 'B' }, q: { q: 'Q' } }, built: { p: { a: 'BA' } }, tasks: { p: ['a'] }, slots: { p: { at: 0, list: [{ no: 1 }, { no: 2, data: { a: 'A2' } }] }, q: { at: 0, list: [{ no: 1 }, { no: 2, data: {} }] } } }
  const out = step({ id: 'a', from: 'p', to: 'q' })(save)
  assert.deepEqual(out.data, { p: { b: 'B' }, q: { q: 'Q', a: 'A' } })
  assert.deepEqual(out.built, { p: {}, q: { a: 'BA' } })
  assert.deepEqual(out.tasks, { p: [], q: ['a'] })
  assert.deepEqual(out.slots.q.list[1].data, { a: 'A2' })
  // Out of a level solved, it counts passed; renamed, it goes by its new id; removed, it is gone.
  assert.deepEqual(step({ id: 'b', from: 'p', to: 'q' })({ ...save, solved: ['p'] }).tasks.q, ['b'])
  assert.deepEqual(step({ id: 'a', from: 'p', to: 'p', as: 'z' })(save).data.p, { b: 'B', z: 'A' })
  assert.deepEqual(step({ id: 'a', from: 'p' })(save).data, { p: { b: 'B' }, q: { q: 'Q' } })
})

test('a level whose tasks have ids keeps their boards and passing by id, so a task put in between finds its own', async () => {
  const { fresh, firstTask, openAt, passed, saved, taskPassed, taskRecord } = await import('./progress.js')
  const level = { id: 'p', keeps: true, tasks: [{ key: 'a' }, { key: 'b' }] }
  const game = { byId: { p: level }, better: () => true }
  let p = saved(fresh(), level, 0, 'A')
  p = passed(game, p, level, 0)
  assert.deepEqual([p.data.p, p.tasks.p, p.built.p, firstTask(game, p, 'p')], [{ a: 'A' }, ['a'], { a: 'A' }, 1])
  // A task put first: the one passed stays passed and keeps its board; the new one opens first.
  const grown = { ...level, tasks: [{ key: 'n' }, ...level.tasks] }
  game.byId.p = grown
  assert.deepEqual([taskPassed(game, p, 'p', 1), taskRecord(grown, p.data.p, 1), firstTask(game, p, 'p')], [true, 'A', 0])
  assert.deepEqual(openAt(game, p, 'p', 2).tasks.p, ['n', 'a'])
})
