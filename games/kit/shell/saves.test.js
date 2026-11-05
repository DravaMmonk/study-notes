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

test('a task is keyed by its id, a level without tasks by its own', () => {
  assert.equal(taskKey({ id: 'q', tasks: [{ key: 'q_1' }, { key: 'q_2' }] }, 1), 'q_2')
  assert.equal(taskKey({ id: 'q' }), 'q')
})

test('rename moves a level’s state, kept under its id; null drops it', () => {
  const save = { version: 1, solved: ['a'], passed: ['a', 'x'], data: { a: 1, t: 2, x: 3 }, slots: { a: { at: 0, list: [] } }, built: { a: 4 }, best: { a: 5 }, introSeen: { a: true, t: true } }
  const out = step({ rename: { a: 'b' } })(save)
  assert.deepEqual([out.solved, out.passed, out.data, Object.keys(out.slots), out.built, out.best, out.introSeen], [['b'], ['b', 'x'], { b: 1, t: 2, x: 3 }, ['b'], { b: 4 }, { b: 5 }, { b: true, t: true }])
  const gone = step({ rename: { a: null } })(save)
  assert.deepEqual([gone.solved, gone.passed, gone.data, gone.best], [[], ['x'], { t: 2, x: 3 }, {}])
})

test('dropWith drops every kept board placing a part of those types', () => {
  const uses = (type) => ({ nodes: [{ id: 'n', type }], wires: [] })
  const save = { version: 1, solved: ['q'], data: { t1: uses('sum'), t2: { stage: 0, boards: [uses('twice')] }, t3: uses('sum') }, slots: { t1: { at: 0, list: [uses('twice')] } }, built: { t2: uses('twice') } }
  const out = step({ dropWith: ['twice'] })(save)
  assert.deepEqual([Object.keys(out.data), Object.keys(out.slots), Object.keys(out.built), out.solved], [['t1', 't3'], [], [], ['q']])
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

test('split: a record of a level’s boards in order becomes each task’s, the tasks before its stage passed', () => {
  const save = { version: 1, solved: [], passed: [], data: { s: { stage: 1, boards: [board(1), board(2)] }, t: board(5) }, slots: { s: { at: 0, list: [{ no: 1, name: '' }, { no: 2, name: 'B', data: { stage: 0, boards: [board(3)] } }] } } }
  const out = step({ split: { s: ['s', 's_2'], q: ['q', 'q_2'] } })(save)
  assert.deepEqual(out.data, { t: board(5), s: board(1), s_2: board(2) })
  assert.deepEqual(out.passed, ['s'])
  assert.deepEqual(out.slots.s.list[1].data, board(3))
  assert.equal(out.slots.s_2.list[1].data, undefined)
})

test('a step naming an operation the shell does not know is refused when the game loads', () => {
  assert.throws(() => migrations([{ version: 2, ops: [{ merge: ['a', ['a', 'b']] }] }]), /unknown operation merge/)
})

test('node merges preserve circuits, nested slot boards and their settings without changing unrelated typed data',()=>{
  const board={nodes:[{id:'m',type:'sub',x:14,y:29,params:{outside:'wrap'}}],wires:[{from:'a',to:'m',port:'a'}]}
  const original={version:1,solved:['one'],passed:['task'],data:{task:board},built:{task:board},slots:{task:{at:0,list:[{no:1,data:board}]}},other:{type:'sub'}}
  const migrate=step({retype:{sub:{type:'arithmetic',params:{op:'sub'}}}})
  const result=migrate(original)
  for(const value of [result.data.task,result.built.task,result.slots.task.list[0].data]){
    assert.equal(value.nodes[0].type,'arithmetic');assert.equal(value.nodes[0].params.op,'sub')
    assert.equal(value.nodes[0].params.outside,'wrap');assert.equal(value.nodes[0].x,14)
    assert.deepEqual(value.wires,board.wires)
  }
  assert.deepEqual(result.other,{type:'sub'})
  assert.equal(original.data.task.nodes[0].type,'sub')
  assert.deepEqual(migrate(result),result)
})
