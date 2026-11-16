import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canOrder, kindOrderName, memberOrderOps, orderOps, orderedTags, reordered, shifted, tagMoveOps } from './tag-order.js'
import { groupTree, treeMoves } from './groups.js'

test('moving in a list, by a drop or a key', () => {
  assert.deepEqual(reordered(['a', 'b', 'c', 'd'], ['d'], { before: 'b' }), ['a', 'd', 'b', 'c'])
  assert.deepEqual(reordered(['a', 'b', 'c', 'd'], ['a', 'b'], { after: 'c' }), ['c', 'a', 'b', 'd'])
  assert.deepEqual(reordered(['a', 'b'], ['a']), ['b', 'a'])
  assert.deepEqual(shifted(['a', 'b', 'c'], 'c', -1), ['a', 'c', 'b'])
  assert.deepEqual(shifted(['a', 'b', 'c'], 'a', -1), ['a', 'b', 'c'])
})

const tag = (values, extra = {}) => ({ kind: 'level', values, ...extra })
const content = (relations = {}, more = {}, order = []) => {
  const tags = { 'demo/one': tag(['demo/a', 'demo/b']), 'demo/two': tag(['demo/c']), 'base/far': tag(['base/x', 'base/y']), 'demo/items': { kind: 'item', values: [] }, ...more }
  return {
    tags,
    registries: { tag: tags, relation: relations, level: Object.fromEntries(['demo/a', 'demo/b', 'demo/c', 'base/x', 'base/y'].map((id) => [id, {}])) },
    levels: ['demo/a', 'demo/b', 'demo/c', 'base/x', 'base/y'].map((id) => ({ id })),
    relationEdges: { requires: [{ from: 'demo/c', to: 'demo/a' }], order },
    sources: { relation: {}, tag: {} },
  }
}

test('the tags of a kind in the kernel’s order: tag orders, then prerequisites between their levels, then names', () => {
  assert.deepEqual(orderedTags(content(), 'level'), ['base/far', 'demo/two', 'demo/one'])
  assert.deepEqual(orderedTags(content({}, {}, [{ from: '#demo/one', to: '#base/far', of: 'tag' }]), 'level'), ['demo/two', 'demo/one', 'base/far'])
  // The tree's sections follow it.
  assert.deepEqual(groupTree(content(), []).sections.map((s) => s.group), ['base/far', 'demo/two', 'demo/one', null])
})

test('an order is written as the layer’s own sequence, or as an override of another package’s, once the layer overrides', () => {
  const c = content({ 'base/far-order': { kind: 'order', of: 'level', sequence: ['base/x', 'base/y'] } })
  assert.deepEqual(orderOps(c, 'demo', 'demo/one-order', ['demo/b', 'demo/a'], 'level'),
    [{ op: 'relation.put', relation: 'one-order', data: { kind: 'order', of: 'level', sequence: ['b', 'a'] } }])
  assert.equal(canOrder(c, 'demo', 'base/far-order', 'base/far'), false)
  assert.equal(memberOrderOps(c, 'demo', 'base/far', ['base/y', 'base/x']), null)
  const overriding = { ...c, sources: { relation: {}, tag: { 'base/far': { declaration: 'base', overrides: ['demo'] } } } }
  assert.deepEqual(memberOrderOps(overriding, 'demo', 'base/far', ['base/y', 'base/x']),
    [{ op: 'override.put', layer: 'demo', kind: 'relation', name: 'base/far-order', data: { edges: [{ from: 'base/y', to: 'base/x' }], remove: [{ from: 'base/x', to: 'base/y' }] } }])
  // A tag of another package with no order relation cannot be given one here.
  assert.equal(memberOrderOps(overriding, 'demo', 'base/none', ['base/x']), null)
  // Nothing written when the sequence is already that.
  assert.deepEqual(orderOps(overriding, 'demo', 'base/far-order', ['base/x', 'base/y'], 'level', 'base/far'), [])
})

test('a tag moved among its kind writes the layer’s <kind>-tags-order, an order of the tags themselves', () => {
  assert.equal(kindOrderName('demo', 'level'), 'demo/level-tags-order')
  assert.deepEqual(tagMoveOps(content(), 'demo', 'level', 'demo/one', { before: 'base/far' }),
    [{ op: 'relation.put', relation: 'level-tags-order', data: { kind: 'order', of: 'tag', sequence: ['#one', '#base/far', '#two'] } }])
  // Only the tags the move passes over, besides those the relation already names.
  const four = content({}, { 'demo/zz': tag([]) })
  assert.deepEqual(orderedTags(four, 'level'), ['base/far', 'demo/two', 'demo/one', 'demo/zz'])
  assert.deepEqual(tagMoveOps(four, 'demo', 'level', 'demo/two', { after: 'demo/one' }),
    [{ op: 'relation.put', relation: 'level-tags-order', data: { kind: 'order', of: 'tag', sequence: ['#one', '#two'] } }])
  // Once the relation names tags, it keeps them and adds the one moved where it lands.
  const named = content({ 'demo/level-tags-order': { kind: 'order', of: 'tag', sequence: ['#demo/two', '#demo/one'] } }, {}, [{ from: '#demo/two', to: '#demo/one', of: 'tag' }])
  assert.deepEqual(orderedTags(named, 'level'), ['base/far', 'demo/two', 'demo/one'])
  assert.deepEqual(tagMoveOps(named, 'demo', 'level', 'base/far', { after: 'demo/one' }),
    [{ op: 'relation.put', relation: 'level-tags-order', data: { kind: 'order', of: 'tag', sequence: ['#two', '#one', '#base/far'] } }])
  assert.deepEqual(tagMoveOps(content(), 'demo', 'level', 'base/far', { before: 'demo/two' }), [])
})

test('a level dropped in the tree writes the members and the order of the group it lands in and leaves', () => {
  const c = content({ 'demo/one-order': { kind: 'order', of: 'level', sequence: ['demo/a', 'demo/b'] } })
  // Within a group: its order alone, the set of members the same.
  assert.deepEqual(treeMoves(['demo/b'], { group: 'demo/one', at: 0 }, c, 'demo'),
    [{ op: 'relation.put', relation: 'one-order', data: { kind: 'order', of: 'level', sequence: ['b', 'a'] } }])
  // Into another group: both tags' members, the new group's order, and the old order without it.
  assert.deepEqual(treeMoves(['demo/a'], { group: 'demo/two', after: 'demo/c' }, c, 'demo'), [
    { op: 'tag.set', tag: 'one', path: 'values', value: ['b'] },
    { op: 'tag.set', tag: 'two', path: 'values', value: ['c', 'a'] },
    { op: 'relation.put', relation: 'two-order', data: { kind: 'order', of: 'level', sequence: ['c', 'a'] } },
    { op: 'relation.put', relation: 'one-order', data: { kind: 'order', of: 'level', sequence: ['b'] } },
  ])
  // Into another layer's group a level cannot go.
  assert.deepEqual(treeMoves(['demo/c'], { group: 'base/far', at: 0 }, c, 'demo'), [{ op: 'tag.set', tag: 'two', path: 'values', value: [] }])
})

test('a tag’s own values in the order its members come in, a nested tag at its first member', async () => {
  const { valuesInOrder } = await import('./tag-order.js')
  const tags = { 'demo/t': tag(['demo/c', '#demo/inner', 'demo/a']), 'demo/inner': tag(['demo/b']) }
  const c = {
    tags,
    registries: { tag: tags, level: { 'demo/a': {}, 'demo/b': {}, 'demo/c': {} }, relation: {} },
    relationEdges: { order: [{ from: 'demo/a', to: 'demo/b', of: 'level' }, { from: 'demo/b', to: 'demo/c', of: 'level' }] },
  }
  assert.deepEqual(valuesInOrder(c, 'demo/t'), ['demo/a', '#demo/inner', 'demo/c'])
})
