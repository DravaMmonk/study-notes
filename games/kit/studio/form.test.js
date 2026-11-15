// node --test games/kit/studio — a task list edited as a whole becomes task operations, each task known by its id.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { creationChoices, taskListOps } from './form.js'
import { sourceOps } from './source.js'
import { S } from '../engine/schema.js'
import { taskLevel } from '../engine/tasks.js'

const levels = [{ id: 'l', tasks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }, { id: 'l_2' }]
const before = levels[0].tasks.map((x) => ({ ...x, n: 1 }))

test('a reordered list moves tasks; nothing else changes', () => {
  assert.deepEqual(taskListOps('l', before, [before[2], before[0], before[1]], levels), [{ op: 'task.move', task: 'c', to: { level: 'l', first: true } }])
  assert.deepEqual(taskListOps('l', before, before, levels), [])
})

test('a new task is added where it stands, a task gone is removed, a changed one is set where it ends up', () => {
  const ops = taskListOps('l', before, [before[0], { n: 2 }, { ...before[2], n: 3 }], levels)
  assert.deepEqual(ops, [
    { op: 'task.remove', task: 'b' },
    { op: 'task.add', level: 'l', data: { n: 2, id: 'l_3' }, after: 'a' },
    { op: 'level.set', level: 'l', path: ['tasks', 2], value: { id: 'c', n: 3 } },
  ])
})

test('a list of only new tasks adds them before the old ones go', () => {
  const ops = taskListOps('l', before.slice(0, 1), [{ n: 5 }], levels)
  assert.deepEqual(ops.map((o) => o.op), ['task.add', 'task.remove'])
})

test('creation offers every nested task type and writes its discriminators into the new draft', () => {
  const circuit = S.by('world', { a: S.obj({ world: S.oneOf(['a']), brief: S.str(), x: S.int() }), b: S.obj({ world: S.oneOf(['b']), brief: S.str() }) })
  const fill = S.either(S.obj({ mode: S.oneOf(['fill']), brief: S.str(), cells: S.int() }), S.obj({ mode: S.oneOf(['fill']), brief: S.str(), grid: S.int() }))
  const schema = S.by('mode', { circuit, fill })
  const ctx = { vocabulary: { kinds: {} } }
  assert.deepEqual(creationChoices(schema, ctx).map(({ label, make }) => [label, make()]), [
    ['circuit · a', { world: 'a', brief: '', x: 0, mode: 'circuit' }],
    ['circuit · b', { world: 'b', brief: '', mode: 'circuit' }],
    ['fill · cells', { mode: 'fill', brief: '', cells: 0 }],
    ['fill · grid', { mode: 'fill', brief: '', grid: 0 }],
  ])
})

test('JSON editing preserves existing types and uses task operations for identity changes', () => {
  const config = (kind) => S.obj({ kind: S.oneOf([kind]), value: S.int() })
  const vocabulary = { kinds: {}, level: taskLevel({ title: S.str() }, S.by('kind', { a: config('a'), b: config('b') })) }
  const value = { title: 'Level', tasks: [{ id: 'first', kind: 'a', value: 1 }] }
  const file = { level: 'l' }
  const edit = (path, next) => sourceOps(file, value, path, next, vocabulary, [{ id: 'l', ...value }])
  assert.deepEqual(edit([], { ...value, title: 'New title', tasks: [{ ...value.tasks[0], value: 2 }] }), [
    { op: 'level.set', level: 'l', path: ['title'], value: 'New title' },
    { op: 'level.set', level: 'l', path: ['tasks', 0], value: { id: 'first', kind: 'a', value: 2 } },
  ])
  assert.deepEqual(edit(['tasks', 0, 'id'], 'renamed'), [{ op: 'task.rename', task: 'first', to: 'renamed' }])
  assert.throws(() => edit(['tasks', 0, 'kind'], 'b'), /change its type|类型/)
  assert.throws(() => edit(['tasks', 0, 'value'], 'text'), /whole number/)
})
