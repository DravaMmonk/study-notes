// What a game writes when it rewires or re-lays out a package's objects (override-edit.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addEdgeOps, beforeLayer, relationForEdge, relationPatch, removeEdgeOps } from './override-edit.js'

const content = (history = []) => ({
  id: 'g',
  registries: {
    relation: {
      'p/route': { kind: 'requires', edges: [{ from: 'p/a', to: 'p/b' }, { from: '#p/t', to: 'p/c' }] },
      'p/steps': { kind: 'order', sequence: ['p/a', 'p/b'] },
    },
  },
  overrideHistory: history,
})

test('a relation patch names the edges added and the ones taken out', () => {
  const before = { kind: 'requires', edges: [{ from: 'p/a', to: 'p/b' }, { from: 'p/b', to: 'p/c' }] }
  assert.deepEqual(relationPatch(before, [{ from: 'p/a', to: 'p/b' }, { from: 'p/x', to: 'p/c' }]),
    { edges: [{ from: 'p/x', to: 'p/c' }], remove: [{ from: 'p/b', to: 'p/c' }] })
  assert.equal(relationPatch(before, before.edges), null)
})

test('a new prerequisite goes into the relation that already leads into its level', () => {
  assert.equal(relationForEdge(content(), 'p/b'), 'p/route')
  assert.equal(relationForEdge(content(), 'p/z'), 'p/route')
  assert.equal(relationForEdge(content(), 'q/z'), null)
  assert.deepEqual(addEdgeOps(content(), '@g', 'p/c', 'p/b'), [{ op: 'override.put', layer: '@g', kind: 'relation', name: 'p/route', data: { edges: [{ from: 'p/c', to: 'p/b' }] } }])
})

test('a prerequisite through a tag cannot be taken out from the game', () => {
  assert.equal(removeEdgeOps(content(), '@g', 'p/x', 'p/c'), null)
  assert.deepEqual(removeEdgeOps(content(), '@g', 'p/a', 'p/b'), [{ op: 'override.put', layer: '@g', kind: 'relation', name: 'p/route', data: { remove: [{ from: 'p/a', to: 'p/b' }] } }])
})

test('undoing a game’s change to a relation removes its override', () => {
  const before = { kind: 'requires', edges: [{ from: 'p/a', to: 'p/b' }] }
  const after = { kind: 'requires', edges: [{ from: 'p/a', to: 'p/b' }, { from: 'p/c', to: 'p/b' }] }
  const c = content([{ kind: 'relation', name: 'p/route', layer: '@g', before, after }])
  c.registries.relation['p/route'] = after
  assert.deepEqual(beforeLayer(c, '@g', 'relation', 'p/route'), before)
  assert.deepEqual(removeEdgeOps(c, '@g', 'p/c', 'p/b'), [{ op: 'override.remove', layer: '@g', kind: 'relation', name: 'p/route' }])
})


test('a tag override names the members added and taken out, and goes when nothing differs', async () => {
  const { tagOverrideOps, tagPatch } = await import('./override-edit.js')
  assert.deepEqual(tagPatch({ values: ['p/a', 'p/b'] }, ['p/a', 'p/c']), { values: ['p/c'], remove: ['p/b'] })
  assert.equal(tagPatch({ values: ['p/a'] }, ['p/a']), null)
  const c = { registries: { tag: { 'p/t': { kind: 'level', values: ['p/a', 'p/b'] } } }, overrideHistory: [] }
  assert.deepEqual(tagOverrideOps(c, 'q', 'p/t', ['p/a']), [{ op: 'override.put', layer: 'q', kind: 'tag', name: 'p/t', data: { remove: ['p/b'] } }])
  assert.deepEqual(tagOverrideOps(c, 'q', 'p/t', ['p/a', 'p/b']), [])
})
