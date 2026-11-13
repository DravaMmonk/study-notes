// node --test (npm test, from trace-viewer) — task stamps (stamp.js), on a schema and content written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from './schema.js'
import { solutionStamp, taskStamps } from './stamp.js'

const TASK = S.obj({ id: S.str(), brief: S.text(), tests: S.list(S.num()) })
const vocabulary = { level: S.obj({ id: S.str(), title: S.text(), size: S.num(), tasks: S.list(TASK) }) }
const text = (zh) => ({ zh, en: zh })
const content = (change = {}) => ({
  partDefs: change.parts ?? null,
  levels: [
    { id: 'one', title: text(change.title ?? 't'), size: change.size ?? 3, tasks: [{ id: 'a', brief: text('x'), tests: change.a ?? [1] }, { id: 'b', brief: text('y'), tests: [2] }] },
    { id: 'two', title: text('u'), size: 3, tasks: [{ id: 'c', brief: text('z'), tests: [3] }] },
  ],
})
const stamps = (c) => Object.fromEntries(Object.entries(taskStamps(vocabulary, c)).map(([k, v]) => [k, v.stamp]))
const changed = (c) => Object.keys(stamps(content())).filter((k) => stamps(content())[k] !== stamps(c)[k])

test('each task has a stamp and names its level', () => {
  const made = taskStamps(vocabulary, content())
  assert.deepEqual(Object.entries(made).map(([k, v]) => [k, v.level]), [['a', 'one'], ['b', 'one'], ['c', 'two']])
  assert.deepEqual(stamps(content()), stamps(content()))
})

test('a task’s puzzle changes its stamp alone; its level’s, every task of the level; a part, every task', () => {
  assert.deepEqual(changed(content({ a: [9] })), ['a'])
  assert.deepEqual(changed(content({ size: 4 })), ['a', 'b'])
  assert.deepEqual(changed(content({ parts: { parts: {} } })), ['a', 'b', 'c'])
})

test('words are no part of a stamp, and a task moved to another level like it keeps its own', () => {
  assert.deepEqual(changed(content({ title: 'another' })), [])
  const moved = content()
  moved.levels[1].tasks.push(moved.levels[0].tasks.pop())
  assert.deepEqual([stamps(moved).b, taskStamps(vocabulary, moved).b.level], [stamps(content()).b, 'two'])
})

test('a solution stamp includes the selected works throughout a shared reference closure', () => {
  const root = { key: 'root', puzzle: 'r', work: { nodes: [], wires: [] } }
  const inner = { key: 'inner', puzzle: 'i', work: 'reference' }
  const leaf = { key: 'leaf', puzzle: 'l', work: 'leaf reference' }
  const replay = (leaf) => solutionStamp(root, (entry) => {
    if (entry.key === 'root') return [inner, leaf]
    return entry.key === 'inner' ? [leaf] : []
  })
  const before = replay(leaf)
  assert.deepEqual(before.works.map(({ key }) => key), ['inner', 'leaf', 'root'])
  assert.notEqual(before.stamp, replay({ ...leaf, work: 'passing work' }).stamp)
  assert.notEqual(before.stamp, replay({ ...leaf, puzzle: 'new puzzle' }).stamp)
})

test('presentation changes leave a board solution stamp alone', () => {
  const root = { key: 'root', work: { nodes: [{ id: 'x', type: 'sum', x: 20 }], wires: [], blocks: [] } }
  const moved = { ...root, work: { ...root.work, nodes: [{ ...root.work.nodes[0], x: 120 }] } }
  assert.equal(solutionStamp(root, () => []).stamp, solutionStamp(moved, () => []).stamp)
})
