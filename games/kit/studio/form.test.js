// node --test games/kit/studio — a task list edited as a whole becomes task operations, each task known by its id.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recast, taskListOps } from './form.js'
import { S } from '../engine/schema.js'

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

test('a task recast as another kind keeps what the two share, whatever the kind nests (a by, an either)', () => {
  const circuit = S.by('world', { a: S.obj({ world: S.oneOf(['a']), brief: S.str(), x: S.int() }), b: S.obj({ world: S.oneOf(['b']), brief: S.str() }) })
  const fill = S.either(S.obj({ mode: S.oneOf(['fill']), brief: S.str(), cells: S.int() }), S.obj({ mode: S.oneOf(['fill']), brief: S.str(), grid: S.int() }))
  const tag = { key: 'mode', cases: { circuit, fill } }
  const ctx = { vocabulary: { kinds: {} } }
  assert.deepEqual(recast(tag, { mode: 'fill', brief: 'b', cells: 2 }, 'circuit', ctx), { world: 'a', brief: 'b', x: 0, mode: 'circuit' })
  assert.deepEqual(recast(tag, { mode: 'circuit', world: 'a', brief: 'c', x: 1 }, 'fill', ctx), { mode: 'fill', brief: 'c', cells: 0 })
})
