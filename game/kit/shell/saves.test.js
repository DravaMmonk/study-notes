// node --test games/kit/shell — a save: what playing keeps, by level and by task key (progress.js), and the save
// operations the operation set writes (saves.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { migrations } from './saves.js'
import { fresh, firstTask, openAt, passed, saved, taskKey, taskPassed } from './progress.js'

const step = (...ops) => migrations([{ version: 2, ops }]).migrate
const board = (n) => ({ nodes: [{ id: `n${n}` }], wires: [] })

test('a level whose tasks have ids keeps their boards and passing by id: a task put in between, or moved away, keeps its own', () => {
  const level = { id: 'p', keeps: true, tasks: [{ key: 'a' }, { key: 'b' }] }
  const game = { byId: { p: level }, better: () => true }
  let p = passed(game, saved(fresh(), level, 0, 'A'), level, 0)
  assert.deepEqual([p.data, p.passed, p.built, firstTask(game, p, 'p')], [{ a: 'A' }, ['a'], { a: 'A' }, 1])
  // A task put first: the one passed stays passed and keeps its board; the new one opens first.
  game.byId.p = { ...level, tasks: [{ key: 'n' }, ...level.tasks] }
  assert.deepEqual([taskPassed(game, p, 'p', 1), p.data[taskKey(game.byId.p, 1)], firstTask(game, p, 'p')], [true, 'A', 0])
  assert.deepEqual(openAt(game, p, 'p', 2).passed, ['n', 'a'])
  // Passing the last solves the level.
  p = passed(game, p, game.byId.p, 2)
  assert.deepEqual([p.solved, taskPassed(game, p, 'p', 0)], [['p'], true])
})

test('tasks without ids are keyed by their place, a level without tasks by its id', () => {
  assert.equal(taskKey({ id: 'q', tasks: [{}, {}] }, 1), 'q#1')
  assert.equal(taskKey({ id: 'q' }), 'q')
})

test('rename moves a level’s state and the keys of its tasks written after it; null drops them', () => {
  const save = { version: 1, solved: ['a'], passed: ['a#0', 'x'], data: { a: 1, 'a#1': 2, x: 3 }, slots: { 'a#1': { at: 0, list: [] } }, built: { a: 4 }, best: { a: 5 }, introSeen: { a: true, 'a#1': true } }
  const out = step({ rename: { a: 'b' } })(save)
  assert.deepEqual([out.solved, out.passed, out.data, Object.keys(out.slots), out.built, out.best, out.introSeen], [['b'], ['b#0', 'x'], { b: 1, 'b#1': 2, x: 3 }, ['b#1'], { b: 4 }, { b: 5 }, { b: true, 'b#1': true }])
  const gone = step({ rename: { a: null } })(save)
  assert.deepEqual([gone.solved, gone.passed, gone.data, gone.best], [[], ['x'], { x: 3 }, {}])
})

test('solve, built, drop and retask', () => {
  const save = { version: 1, solved: ['q'], passed: ['t1'], data: { t1: board(1), t2: board(2), u: board(3) }, slots: { t1: { at: 0, list: [] } }, built: { u: board(9) } }
  assert.deepEqual(step({ solve: ['q', ['p']] })(save).solved, ['q', 'p'])
  // A solved level's board on its last task becomes its part's; one kept already stays; an unsolved level's does not.
  assert.deepEqual(step({ built: [['q', 't2'], ['q', 'u'], ['r', 't1']] })(save).built, { u: board(9), t2: board(2) })
  const dropped = step({ drop: ['t1'] })(save)
  assert.deepEqual([Object.keys(dropped.data), dropped.slots, dropped.passed], [['t2', 'u'], {}, ['t1']])
  const renamed = step({ retask: { t1: 'one' } })(save)
  assert.deepEqual([renamed.passed, Object.keys(renamed.data), Object.keys(renamed.slots)], [['one'], ['one', 't2', 'u'], ['one']])
})

test('a step naming an operation the shell does not know is refused when the game loads', () => {
  assert.throws(() => migrations([{ version: 2, ops: [{ merge: ['a', ['a', 'b']] }] }]), /unknown operation merge/)
})
