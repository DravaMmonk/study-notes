// node --test games/kit/studio/list-order.test.js — moving within a list, the list patches another package's object
// gets (collection-edit.js), and the tree's groups, which only change tag membership.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reordered, shifted } from './list-order.js'
import { listPatch, objectOverride, setPatch } from './collection-edit.js'
import { groupTree, treeMoves } from './groups.js'

test('moving in a list, by a drop or a key', () => {
  assert.deepEqual(reordered(['a', 'b', 'c', 'd'], ['d'], { before: 'b' }), ['a', 'd', 'b', 'c'])
  assert.deepEqual(reordered(['a', 'b', 'c', 'd'], ['a', 'b'], { after: 'c' }), ['c', 'a', 'b', 'd'])
  assert.deepEqual(reordered(['a', 'b'], ['a']), ['b', 'a'])
  assert.deepEqual(shifted(['a', 'b', 'c'], 'c', -1), ['a', 'c', 'b'])
  assert.deepEqual(shifted(['a', 'b', 'c'], 'a', -1), ['a', 'b', 'c'])
})

test('another package’s list is patched by what moved, was added and was taken out, anchored on what stays', () => {
  assert.equal(listPatch(['a', 'b'], ['a', 'b']), null)
  assert.deepEqual(listPatch(['a', 'b', 'c', 'd'], ['a', 'c', 'b', 'd']), { remove: ['c'], insert: [{ after: 'a', values: ['c'] }] })
  assert.deepEqual(listPatch(['a', 'b', 'c'], ['c', 'a', 'b']), { remove: ['c'], insert: [{ before: 'a', values: ['c'] }] })
  assert.deepEqual(listPatch(['a', 'b'], ['x', 'a', 'b', 'y']), { insert: [{ before: 'a', values: ['x'] }, { after: 'b', values: ['y'] }] })
  assert.deepEqual(listPatch(['a', 'b'], ['b']), { remove: ['a'] })
  // Nothing stays where it was: the list is written whole.
  assert.deepEqual(listPatch(['a', 'b'], ['c']), ['c'])
  // A menu that stays but changed goes as an addition of what changed in it, its own list by a patch.
  const before = [{ id: 'm1', title: 'A', values: ['p', 'q'] }, { id: 'm2', values: [] }]
  const after = [{ id: 'm1', title: 'A', values: ['q', 'p'] }, { id: 'm2', values: [] }]
  assert.deepEqual(listPatch(before, after), { add: [{ id: 'm1', values: { remove: ['q'], insert: [{ before: 'p', values: ['q'] }] } }] })
  assert.deepEqual(setPatch(['a', 'b'], ['b', 'c']), { add: ['c'], remove: ['a'] })
  assert.deepEqual(objectOverride({ title: 'T', values: ['a', 'b'] }, { title: 'T', values: ['b', 'a'] }, { values: 'list' }),
    { values: { remove: ['b'], insert: [{ before: 'a', values: ['b'] }] } })
  assert.equal(objectOverride({ title: 'T', values: ['a'] }, { title: 'T', values: ['a'] }, { values: 'list' }), null)
})

test('a level dropped into another group changes the tags’ members, never an order', () => {
  const tags = { 'level:demo/one': { kind: 'level', values: ['demo/a', 'demo/b'] }, 'level:demo/two': { kind: 'level', values: ['demo/c'] }, 'level:base/far': { kind: 'level', values: ['base/x'] } }
  const content = {
    tags,
    registries: { tag: tags, relation: {}, level: Object.fromEntries(['demo/a', 'demo/b', 'demo/c', 'base/x'].map((id) => [id, {}])) },
    levels: ['demo/a', 'demo/b', 'demo/c', 'base/x'].map((id) => ({ id })),
    relationEdges: { requires: [] },
    sources: { relation: {}, tag: {} },
  }
  assert.deepEqual(groupTree(content, []).sections.map((s) => s.group), ['level:base/far', 'level:demo/one', 'level:demo/two', null])
  assert.deepEqual(treeMoves(['demo/b'], { group: 'level:demo/one', at: 0 }, content, 'demo'), [])
  assert.deepEqual(treeMoves(['demo/a'], { group: 'level:demo/two', after: 'demo/c' }, content, 'demo'), [
    { op: 'tag.set', tag: 'one', member: 'level', path: 'values', value: ['b'] },
    { op: 'tag.set', tag: 'two', member: 'level', path: 'values', value: ['c', 'a'] },
  ])
  assert.deepEqual(treeMoves(['demo/c'], { group: 'level:base/far', at: 0 }, content, 'demo'), [{ op: 'tag.set', tag: 'two', member: 'level', path: 'values', value: [] }])
})
