import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canOrder, kindOrderName, memberOrderOps, orderOps, orderedTags, reordered, resequence, shifted, subsetOrderOps, tagMoveOps } from './tag-order.js'
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
  const tags = { 'level:demo/one': tag(['demo/a', 'demo/b']), 'level:demo/two': tag(['demo/c']), 'level:base/far': tag(['base/x', 'base/y']), 'circuit/part:demo/items': { kind: 'circuit/part', values: [] }, ...more }
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
  assert.deepEqual(orderedTags(content({}, {}, [{ from: '#demo/one', to: '#base/far', of: 'tag', member: 'level' }]), 'level'), ['demo/two', 'demo/one', 'base/far'])
  // The tree's sections follow it.
  assert.deepEqual(groupTree(content(), []).sections.map((s) => s.group), ['level:base/far', 'level:demo/two', 'level:demo/one', null])
})

test('an order is written as the layer’s own sequence, or as an override of another package’s, once the layer overrides', () => {
  const c = content({ 'base/far-order': { kind: 'order', of: 'level', sequence: ['base/x', 'base/y'] } })
  assert.deepEqual(orderOps(c, 'demo', 'demo/one-order', ['demo/b', 'demo/a'], 'level'),
    [{ op: 'relation.put', relation: 'one-order', data: { kind: 'order', of: 'level', sequence: ['b', 'a'] } }])
  assert.equal(canOrder(c, 'demo', 'base/far-order', 'base/far'), false)
  assert.equal(memberOrderOps(c, 'demo', 'level:base/far', ['base/y', 'base/x']), null)
  const overriding = { ...c, sources: { relation: {}, tag: { 'level:base/far': { declaration: 'base', overrides: ['demo'] } } } }
  assert.deepEqual(memberOrderOps(overriding, 'demo', 'level:base/far', ['base/y', 'base/x']),
    [{ op: 'override.put', layer: 'demo', kind: 'relation', name: 'base/far-order', data: { edges: [{ from: 'base/y', to: 'base/x' }], remove: [{ from: 'base/x', to: 'base/y' }] } }])
  // A tag of another package with no order relation cannot be given one here.
  assert.equal(memberOrderOps(overriding, 'demo', 'level:base/none', ['base/x']), null)
  // Nothing written when the sequence is already that.
  assert.deepEqual(orderOps(overriding, 'demo', 'base/far-order', ['base/x', 'base/y'], 'level', 'level:base/far'), [])
})

test('a tag moved among its kind writes the layer’s <kind>-tags-order, an order of the tags themselves', () => {
  assert.equal(kindOrderName('demo', 'level'), 'demo/level-tags-order')
  assert.deepEqual(tagMoveOps(content(), 'demo', 'level', 'demo/one', { before: 'base/far' }),
    [{ op: 'relation.put', relation: 'level-tags-order', data: { kind: 'order', of: 'tag', member: 'level', sequence: ['#one', '#base/far', '#two'] } }])
  // Only the tags the move passes over, besides those the relation already names.
  const four = content({}, { 'level:demo/zz': tag([]) })
  assert.deepEqual(orderedTags(four, 'level'), ['base/far', 'demo/two', 'demo/one', 'demo/zz'])
  assert.deepEqual(tagMoveOps(four, 'demo', 'level', 'demo/two', { after: 'demo/one' }),
    [{ op: 'relation.put', relation: 'level-tags-order', data: { kind: 'order', of: 'tag', member: 'level', sequence: ['#one', '#two'] } }])
  // Once the relation names tags, it keeps them and adds the one moved where it lands.
  const named = content({ 'demo/level-tags-order': { kind: 'order', of: 'tag', member: 'level', sequence: ['#demo/two', '#demo/one'] } }, {}, [{ from: '#demo/two', to: '#demo/one', of: 'tag', member: 'level' }])
  assert.deepEqual(orderedTags(named, 'level'), ['base/far', 'demo/two', 'demo/one'])
  assert.deepEqual(tagMoveOps(named, 'demo', 'level', 'base/far', { after: 'demo/one' }),
    [{ op: 'relation.put', relation: 'level-tags-order', data: { kind: 'order', of: 'tag', member: 'level', sequence: ['#two', '#one', '#base/far'] } }])
  assert.deepEqual(tagMoveOps(content(), 'demo', 'level', 'base/far', { before: 'demo/two' }), [])
})

test('a level dropped in the tree writes the members and the order of the group it lands in and leaves', () => {
  const c = content({ 'demo/one-order': { kind: 'order', of: 'level', sequence: ['demo/a', 'demo/b'] } })
  // Within a group: its order alone, the set of members the same.
  assert.deepEqual(treeMoves(['demo/b'], { group: 'level:demo/one', at: 0 }, c, 'demo'),
    [{ op: 'relation.put', relation: 'one-order', data: { kind: 'order', of: 'level', sequence: ['b', 'a'] } }])
  // Into another group: both tags' members, the new group's order, and the old order without it.
  assert.deepEqual(treeMoves(['demo/a'], { group: 'level:demo/two', after: 'demo/c' }, c, 'demo'), [
    { op: 'tag.set', tag: 'one', member: 'level', path: 'values', value: ['b'] },
    { op: 'tag.set', tag: 'two', member: 'level', path: 'values', value: ['c', 'a'] },
    { op: 'relation.put', relation: 'two-order', data: { kind: 'order', of: 'level', sequence: ['c', 'a'] } },
    { op: 'relation.put', relation: 'one-order', data: { kind: 'order', of: 'level', sequence: ['b'] } },
  ])
  // Into another layer's group a level cannot go.
  assert.deepEqual(treeMoves(['demo/c'], { group: 'level:base/far', at: 0 }, c, 'demo'), [{ op: 'tag.set', tag: 'two', member: 'level', path: 'values', value: [] }])
})

test('a tag’s own values in the order its members come in, a nested tag at its first member', async () => {
  const { valuesInOrder } = await import('./tag-order.js')
  const tags = { 'level:demo/t': tag(['demo/c', '#demo/inner', 'demo/a']), 'level:demo/inner': tag(['demo/b']) }
  const c = {
    tags,
    registries: { tag: tags, level: { 'demo/a': {}, 'demo/b': {}, 'demo/c': {} }, relation: {} },
    relationEdges: { order: [{ from: 'demo/a', to: 'demo/b', of: 'level' }, { from: 'demo/b', to: 'demo/c', of: 'level' }] },
  }
  assert.deepEqual(valuesInOrder(c, 'level:demo/t'), ['demo/a', '#demo/inner', 'demo/c'])
})

test('a group’s members reordered inside an order relation that already lists them, or in the group’s own', () => {
  assert.deepEqual(resequence(['a', 'x', 'b', 'c'], ['a', 'b', 'c'], ['c', 'a', 'b']), ['c', 'x', 'a', 'b'])
  const c = { registries: { relation: { 'demo/entries': { kind: 'order', of: 'entry', sequence: ['demo/a', 'demo/x', 'demo/b'] } } }, sources: { relation: {} } }
  assert.deepEqual(subsetOrderOps(c, 'demo', 'demo/sec-order', ['demo/a', 'demo/b'], ['demo/b', 'demo/a'], 'entry'),
    [{ op: 'relation.put', relation: 'entries', data: { kind: 'order', of: 'entry', sequence: ['b', 'x', 'a'] } }])
  assert.deepEqual(subsetOrderOps(c, 'demo', 'demo/sec-order', ['demo/a', 'demo/y'], ['demo/y', 'demo/a'], 'entry'),
    [{ op: 'relation.put', relation: 'sec-order', data: { kind: 'order', of: 'entry', sequence: ['y', 'a'] } }])
  // A relation of edges between them gives way to a chain in the new order.
  const e = { registries: { relation: { 'demo/more': { kind: 'order', of: 'circuit/part', edges: [{ from: 'demo/a', to: 'demo/b' }, { from: 'demo/b', to: 'demo/z' }] } } }, sources: { relation: {} } }
  assert.deepEqual(subsetOrderOps(e, 'demo', 'demo/tray-order', ['demo/a', 'demo/b'], ['demo/b', 'demo/a'], 'circuit/part'),
    [{ op: 'relation.put', relation: 'more', data: { kind: 'order', of: 'circuit/part', edges: [{ from: 'b', to: 'z' }, { from: 'b', to: 'a' }] } }])
  // A relation listing some of them is brought into line too, so the two do not contradict each other.
  assert.deepEqual(subsetOrderOps(c, 'demo', 'demo/sec-order', ['demo/a', 'demo/b', 'demo/y'], ['demo/b', 'demo/y', 'demo/a'], 'entry'), [
    { op: 'relation.put', relation: 'entries', data: { kind: 'order', of: 'entry', sequence: ['b', 'x', 'a'] } },
    { op: 'relation.put', relation: 'sec-order', data: { kind: 'order', of: 'entry', sequence: ['b', 'y', 'a'] } },
  ])
})
