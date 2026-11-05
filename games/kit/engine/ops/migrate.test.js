// node --test games/kit/engine/ops — the save migration generator: which save ops each kind of change needs, and
// what they do to a save (the shell's migrations, ../../shell/saves.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { migrations } from '../../shell/saves.js'
import { S } from '../schema.js'
import { ancestors, idMoves, placedBy, saveOps, staleKeys } from './migrate.js'

/** A course of one path: each level requires the one before it; `builds`: { level: [part] }. */
const path = (ids, builds = {}) => ({ levels: ids.map((id, k) => ({ id, requires: k ? [ids[k - 1]] : [] })), builds: (id) => builds[id] ?? [] })
const migrate = (ops, save) => migrations([{ version: 2, ops }]).migrate({ version: 1, ...save })

test('ancestors and id moves', () => {
  assert.deepEqual([...ancestors(path(['a', 'b', 'c']).levels).get('c')], ['b', 'a'])
  assert.deepEqual([...idMoves(['a', 'b'], [{ rename: { a: 'x' } }, { rename: { x: 'y', b: null } }])], [['a', ['y']], ['b', []]])
})

test('a level put earlier is counted solved for whoever solved the level now after it', () => {
  const ops = saveOps({ before: path(['a', 'b', 'c', 'd']), after: path(['a', 'd', 'b', 'c']), idOps: [] })
  assert.deepEqual(ops, [{ solve: ['b', ['d']] }])
  assert.deepEqual(migrate(ops, { solved: ['a', 'b', 'c'] }).solved, ['a', 'b', 'c', 'd'])
  assert.deepEqual(migrate(ops, { solved: ['a'] }).solved, ['a'])
})

test('the levels put somewhere are read off the orders: the fewest whose moving explains the new one', () => {
  assert.deepEqual([...placedBy(['a', 'b', 'c', 'd'], ['a', 'd', 'b', 'c'])], ['d'])
  assert.deepEqual([...placedBy(['a', 'b', 'c', 'd'], ['a', 'c', 'd', 'b'])], ['b'])
  assert.deepEqual([...placedBy(['a', 'b', 'c'], ['a', 'c', 'b'])], ['c'], 'two swapped: the one now first was put there')
  assert.deepEqual([...placedBy(['a', 'b'], ['a', 'n', 'b'])], ['n'])
})

test('a level put later hands nobody the levels it passed over', () => {
  assert.deepEqual(saveOps({ before: path(['a', 'b', 'c', 'd']), after: path(['a', 'c', 'd', 'b']), idOps: [] }), [])
})

test('a new level before others is counted solved for whoever solved them', () => {
  assert.deepEqual(saveOps({ before: path(['a', 'b']), after: path(['a', 'n', 'b']), idOps: [] }), [{ solve: ['b', ['n']] }])
})

test('a renamed level keeps its state; a removed one loses it; the step speaks of the new ids after them', () => {
  const idOps = [{ rename: { b: 'bee' } }, { rename: { c: null } }]
  const ops = saveOps({ before: path(['a', 'b', 'c', 'd']), after: path(['a', 'd', 'bee']), idOps })
  assert.deepEqual(ops, [...idOps, { solve: ['bee', ['d']] }])
  const out = migrate(ops, { solved: ['a', 'b', 'c'], data: { b: 'board b', c: 'board c' } })
  assert.deepEqual(out.solved, ['a', 'bee', 'd'])
  assert.deepEqual(out.data, { bee: 'board b' })
})

test('a level that now builds a part makes the board kept on its last task the part’s', () => {
  const keys = (id) => (id === 'b' ? ['b1', 'b2'] : [id])
  const ops = saveOps({ before: path(['a', 'b']), after: path(['a', 'b'], { b: ['adder'] }), idOps: [], keys })
  assert.deepEqual(ops, [{ built: [['b', 'b2']] }])
  assert.deepEqual(migrate(ops, { solved: ['a', 'b'], data: { b2: 'board' } }).built, { b2: 'board' })
})

test('a part whose building moves to another level is built from the new builder’s kept board', () => {
  assert.deepEqual(saveOps({ before: path(['a', 'b'], { a: ['adder'] }), after: path(['a', 'b'], { b: ['adder'] }), idOps: [] }), [{ built: [['b', 'b']] }])
})

test('a level whose puzzle changed drops the boards kept on each of its tasks', () => {
  assert.deepEqual(saveOps({ before: path(['a']), after: path(['a']), idOps: [], stale: ['a_1', 'a_2'] }), [{ drop: ['a_1', 'a_2'] }])
})

test('with no course before (content that did not fit), only the ops’ own and the stale boards', () => {
  assert.deepEqual(saveOps({ before: null, after: path(['a']), idOps: [{ rename: { x: 'a' } }] }), [{ rename: { x: 'a' } }])
})

test('by default a level’s kept boards are stale when a field of its puzzle or tests changed: its own, or one task’s', () => {
  const task = S.obj({ id: S.str(), brief: S.text(), tests: S.list(S.any(), { section: 'tests' }), solution: S.opt(S.board()) })
  const level = S.obj({ title: S.text(), world: S.opt(S.str()), tests: S.opt(S.list(S.any(), { section: 'tests' })), solution: S.opt(S.board()), tasks: S.opt(S.list(task)) })
  const one = { title: 'L', world: 'w', tests: [1], solution: ['a'] }
  assert.deepEqual(staleKeys(level, one, { ...one, tests: [2] }, 'l'), ['l'])
  assert.deepEqual(staleKeys(level, one, { ...one, world: 'v' }, 'l'), ['l'])
  assert.deepEqual(staleKeys(level, one, { ...one, title: 'M', solution: ['b'] }, 'l'), [], 'words and answers are no part of the puzzle')
  const tasks = { title: 'T', tasks: [{ id: 't1', brief: 'x', tests: [1] }, { id: 't2', brief: 'y', tests: [1] }] }
  assert.deepEqual(staleKeys(level, tasks, { ...tasks, tasks: [tasks.tasks[0], { ...tasks.tasks[1], tests: [2] }] }, 'l'), ['t2'])
  assert.deepEqual(staleKeys(level, tasks, { ...tasks, world: 'v' }, 'l'), ['t1', 't2'])
  assert.deepEqual(staleKeys(level, tasks, { ...tasks, tasks: [...tasks.tasks, { id: 't3', brief: 'z', tests: [3] }] }, 'l'), [])
})
