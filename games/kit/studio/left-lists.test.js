import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GAME_LISTS, PACKAGE_LISTS, capabilityKey, capabilityOf, currentOf, isObjectList, listOfKind, openParams, overrideKey, readOpen } from './left-lists.js'
import { objectFileName, objectOp, objectValue, overrideFileOf, overrideOp, ownObjectData } from './object-file.js'
import { fileForm, opFor } from './form.js'

test('search is the last list of the package workspace; the object lists are told apart', () => {
  assert.equal(PACKAGE_LISTS.at(-1), 'search')
  assert.equal(PACKAGE_LISTS[0], 'tree')
  assert.deepEqual(GAME_LISTS, ['packages', 'chapters', 'overrides'])
  assert.ok(isObjectList('tags') && isObjectList('overrides') && isObjectList('kernel'))
  assert.ok(!isObjectList('tree') && !isObjectList('search') && !isObjectList('toString'))
  assert.equal(listOfKind('relation'), 'relations')
  assert.equal(listOfKind('level'), null)
})

test('the address keeps what the object list shown has open, and opens it again', () => {
  assert.deepEqual(openParams('tags', { tag: 'demo/one', layout: 'demo/map' }), [['tag', 'demo/one']])
  assert.deepEqual(openParams('tree', { tag: 'demo/one' }), [])
  assert.deepEqual(openParams('layouts', {}), [])
  assert.deepEqual(readOpen(new URLSearchParams('tag=demo/one&tab=page')), { list: 'tags', open: { tag: 'demo/one' } })
  assert.deepEqual(readOpen(new URLSearchParams('capability=operation/logic:and')), { list: 'kernel', open: { capability: 'operation/logic:and' } })
  // The old tabs that only switched to a list open that list.
  assert.deepEqual(readOpen(new URLSearchParams('tab=arrange')), { list: 'tags', open: {} })
  assert.deepEqual(readOpen(new URLSearchParams('tab=page')), { list: null, open: {} })
  // A workspace without the list ignores its parameter.
  assert.deepEqual(readOpen(new URLSearchParams('tag=demo/one&override=x'), GAME_LISTS), { list: 'overrides', open: { override: 'x' } })
})

test('a capability and an override have one key each', () => {
  assert.equal(capabilityKey('operation', 'logic:and'), 'operation/logic:and')
  assert.deepEqual(capabilityOf('operation/logic:and'), { kind: 'operation', name: 'logic:and' })
  assert.equal(capabilityOf('nothing'), null)
  assert.equal(overrideKey({ layer: '@game', kind: 'layout', name: 'demo/map' }), '@game layout demo/map')
  assert.deepEqual(currentOf([['a', 1], ['b', 2]], 'b'), ['b', 2])
  assert.deepEqual(currentOf([['a', 1], ['b', 2]], 'z'), ['a', 1])
  assert.equal(currentOf([], 'z'), null)
})

const content = {
  registries: {
    tag: {
      'demo/first': { id: 'demo/first', kind: 'level', title: { en: 'First', $key: 'demo/tags.first' }, values: ['demo/a', 'other/b', '#demo/inner'] },
      'other/far': { kind: 'level', values: ['other/b'] },
    },
    layout: { 'demo/map': { of: '#demo/first', rows: [['demo/a', null]] } },
  },
}
const object = (full, kind = 'tag') => ({ kind, full, namespace: 'demo', value: objectValue(content, kind, full) })

test('an object’s file is the registry’s value without its id, written back by short names', () => {
  assert.equal(objectValue(content, 'tag', 'demo/first').id, undefined)
  assert.equal(objectValue(content, 'tag', 'demo/none'), null)
  assert.equal(objectFileName('tag', 'demo/first', { kind: 'level' }), 'demo/tags/level/first.json')
  assert.equal(objectFileName('layout', 'demo/map', {}), 'demo/layouts/map.json')
  assert.equal(objectFileName('layout', 'demo/map', {}, 'demo'), 'layouts/map.json')
  assert.deepEqual(ownObjectData('demo', objectValue(content, 'tag', 'demo/first')),
    { kind: 'level', title: { en: 'First', $key: 'tags.first' }, values: ['a', 'other/b', '#inner'] })
})

test('an edit of the layer’s own object is its object operation; another layer’s makes none', () => {
  assert.deepEqual(objectOp(object('demo/first'), ['values', 1], { set: 'demo/c' }), { op: 'tag.set', tag: 'first', path: ['values', 1], value: 'c' })
  assert.deepEqual(objectOp(object('demo/first'), ['title'], { set: 'Erste', lang: 'de' }, 'text'),
    { op: 'tag.set', tag: 'first', path: ['title'], value: { en: 'First', de: 'Erste', $key: 'tags.first' } })
  assert.deepEqual(objectOp(object('demo/first'), ['title'], { unset: true }), { op: 'tag.put', tag: 'first', data: { kind: 'level', values: ['a', 'other/b', '#inner'] } })
  assert.deepEqual(objectOp(object('demo/map', 'layout'), ['rows'], { set: [['demo/a']] }), { op: 'layout.set', layout: 'map', path: ['rows'], value: [['a']] })
  assert.equal(objectOp(object('demo/first'), [], { unset: true }), null)
  assert.equal(objectOp(object('other/far'), ['values'], { set: [] }), null)
  // The forms reach them through the same file operation as any other file.
  assert.deepEqual(opFor({ object: object('demo/map', 'layout') }, 'of', { set: '#demo/first' }), { op: 'layout.set', layout: 'map', path: ['of'], value: '#first' })
  const shown = fileForm(content, {}, { object: { kind: 'layout', full: 'demo/map' } }, [])
  assert.deepEqual(shown.value, { of: '#demo/first', rows: [['demo/a', null]] })
  assert.equal(shown.form.kind, 'obj')
})

test('an override’s file is what the override operation writes: a patch of a tag or relation, anything else whole', () => {
  const tag = { layer: 'demo', kind: 'tag', name: 'other/far', before: { kind: 'level', values: ['other/b', 'other/c'] }, after: { kind: 'level', title: { en: 'Far' }, values: ['other/b', 'demo/a'] } }
  assert.deepEqual(overrideFileOf(tag), { title: { en: 'Far' }, values: ['demo/a'], remove: ['other/c'] })
  const relation = { layer: 'demo', kind: 'relation', name: 'other/r', before: { kind: 'requires', edges: [{ from: 'x', to: 'y' }] }, after: { kind: 'requires', edges: [{ from: 'x', to: 'y' }, { from: 'y', to: 'z' }] } }
  assert.deepEqual(overrideFileOf(relation), { edges: [{ from: 'y', to: 'z' }] })
  const layout = { layer: '@game', kind: 'layout', name: 'demo/map', before: { of: '#demo/t', rows: [] }, after: { of: '#demo/t', rows: [['demo/a']] } }
  assert.deepEqual(overrideFileOf(layout), { of: '#demo/t', rows: [['demo/a']] })
  assert.deepEqual(overrideOp(layout, '@game', { rows: [] }), { op: 'override.put', layer: '@game', kind: 'layout', name: 'demo/map', data: { rows: [] } })
  assert.equal(overrideOp(layout, 'demo', { rows: [] }), null)
})
