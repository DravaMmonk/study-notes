// The relation board's pure edits (relation-edit.js) and the object names it writes (objects-edit.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { linkKey } from './arrangement.js'
import { declaredEdges, endpointKind, endpointsOf, withEdge, withRequired, withoutEdge, withoutEndpoint, writeEdges } from './relation-edit.js'
import { freeObjectName, localName, objectsOf, shownName } from './objects-edit.js'

test('a sequence reads as one edge between each neighbouring pair, after the edges', () => {
  assert.deepEqual(declaredEdges({ kind: 'order', edges: [{ from: 'p/x', to: 'p/y' }], sequence: ['p/a', 'p/b', 'p/c'] }),
    [{ from: 'p/x', to: 'p/y' }, { from: 'p/a', to: 'p/b' }, { from: 'p/b', to: 'p/c' }])
  assert.deepEqual(declaredEdges({ kind: 'order' }), [])
})

test('endpoints come from the edges, then the cards placed by hand', () => {
  assert.deepEqual(endpointsOf([{ from: 'p/a', to: 'p/b' }, { from: 'p/b', to: 'p/c' }], ['p/d', 'p/a']), ['p/a', 'p/b', 'p/c', 'p/d'])
})

test('edges are added once, removed by key, required toggled, and dropped with an endpoint', () => {
  const edges = [{ from: 'p/a', to: 'p/b' }]
  assert.equal(withEdge(edges, 'p/a', 'p/b'), null)
  const two = withEdge(edges, 'p/b', 'p/c')
  assert.deepEqual(two, [{ from: 'p/a', to: 'p/b' }, { from: 'p/b', to: 'p/c' }])
  assert.deepEqual(withoutEdge(two, linkKey({ from: 'p/a', to: 'p/b' })), [{ from: 'p/b', to: 'p/c' }])
  const required = withRequired(two, linkKey({ from: 'p/b', to: 'p/c' }), true)
  assert.deepEqual(required[1], { from: 'p/b', to: 'p/c', required: true })
  assert.deepEqual(withRequired(required, linkKey({ from: 'p/b', to: 'p/c' }), false)[1], { from: 'p/b', to: 'p/c' })
  assert.deepEqual(withoutEndpoint(two, 'p/b'), [])
})

test('the endpoint kind follows the relation kind', () => {
  assert.equal(endpointKind({ kind: 'requires' }), 'level')
  assert.equal(endpointKind({ kind: 'replaces' }), 'piece')
  assert.equal(endpointKind({ kind: 'order', of: 'entry' }), 'entry')
  assert.equal(endpointKind({ kind: 'order' }), 'level')
})

test('edges are written back with the layer’s own names short, and a sequence becomes edges', () => {
  const edges = [{ from: 'p/a', to: 'p/b' }, { from: 'lib/x', to: '#p/t' }, { from: 'q/z', game: 'q', to: 'p/c' }]
  assert.deepEqual(writeEdges('p', 'route', { kind: 'requires', edges: [] }, edges), [{ op: 'relation.set', relation: 'route', path: 'edges',
    value: [{ from: 'a', to: 'b' }, { from: 'lib/x', to: '#t' }, { from: 'q/z', game: 'q', to: 'c' }] }])
  const [put] = writeEdges('p', 'steps', { kind: 'order', sequence: ['p/a', 'p/b'] }, [{ from: 'p/a', to: 'p/b' }])
  assert.equal(put.op, 'relation.put')
  assert.deepEqual(put.data, { kind: 'order', edges: [{ from: 'a', to: 'b' }] })
})

test('names: short for the layer’s own, full for others; free names count up', () => {
  assert.equal(localName('p', 'p/a'), 'a')
  assert.equal(localName('p', '#p/t'), '#t')
  assert.equal(localName('p', 'pp/a'), null)
  assert.equal(shownName('p', 'q/a'), 'q/a')
  assert.equal(freeObjectName(['order', 'order-2'], 'order'), 'order-3')
  const content = { registries: { relation: { 'q/b': {}, 'p/z': {}, 'p/a': {} } } }
  assert.deepEqual(objectsOf(content, 'relation', 'p').map(([full, , own]) => [full, own]), [['p/a', true], ['p/z', true], ['q/b', false]])
})
