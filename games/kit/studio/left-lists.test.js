import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GAME_LISTS, PACKAGE_LISTS, capabilityKey, capabilityOf, currentOf, isObjectList, listOfHeading, openParams, overrideKey, readHeading, readOpen } from './left-lists.js'
import { objectFileName, objectOp, objectValue, overrideFileOf, overrideOp, ownObjectData } from './object-file.js'
import { fileForm, opFor } from './form.js'

test('search is the last list of the package workspace; the object lists are told apart', () => {
  assert.deepEqual(PACKAGE_LISTS, ['tree', 'parts', 'entries', 'kernel', 'overrides', 'search'])
  assert.deepEqual(GAME_LISTS, ['packages', 'chapters', 'overrides'])
  assert.ok(isObjectList('overrides') && isObjectList('kernel'))
  assert.ok(!isObjectList('tree') && !isObjectList('search') && !isObjectList('toString'))
})

test('the address keeps what is open: an object list’s object, or a group’s heading', () => {
  assert.deepEqual(openParams('kernel', { capability: 'operation/logic:and', override: 'x' }), [['capability', 'operation/logic:and']])
  assert.deepEqual(openParams('tree', { capability: 'x' }), [])
  assert.deepEqual(readOpen(new URLSearchParams('capability=operation/logic:and')), { list: 'kernel', open: { capability: 'operation/logic:and' } })
  // The old tabs that only switched to a list open that list.
  assert.deepEqual(readOpen(new URLSearchParams('tab=kernel')), { list: 'kernel', open: {} })
  assert.deepEqual(readOpen(new URLSearchParams('tab=page')), { list: null, open: {} })
  // A workspace without the list ignores its parameter.
  assert.deepEqual(readOpen(new URLSearchParams('capability=x&override=x'), GAME_LISTS), { list: 'overrides', open: { override: 'x' } })
  assert.deepEqual(readHeading(new URLSearchParams('tray=demo/main&level=demo/a')), { kind: 'tray', full: 'demo/main' })
  assert.equal(readHeading(new URLSearchParams('level=demo/a')), null)
  assert.deepEqual(['tag', 'relation', 'tray', 'section'].map((k) => listOfHeading(k)), ['tree', 'tree', 'parts', 'entries'])
  assert.equal(listOfHeading('tag', 'piece'), 'parts')
})

test('a capability and an override have one key each', () => {
  assert.equal(capabilityKey('operation', 'logic:and'), 'operation/logic:and')
  assert.deepEqual(capabilityOf('operation/logic:and'), { kind: 'operation', name: 'logic:and' })
  assert.equal(capabilityOf('nothing'), null)
  assert.equal(overrideKey({ layer: '@game', kind: 'section', name: 'demo/map' }), '@game section demo/map')
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
    section: { 'demo/map': { title: 'Words', values: [] } },
  },
}
const object = (full, kind = 'tag') => ({ kind, full, namespace: 'demo', value: objectValue(content, kind, full), ...(kind === 'tag' && { tagKind: 'level' }) })

test('an object’s file is the registry’s value without its id (a tag without its kind, which its folder says), written back by short names', () => {
  assert.equal(objectValue(content, 'tag', 'demo/first').id, undefined)
  assert.equal(objectValue(content, 'tag', 'demo/first').kind, undefined)
  assert.equal(objectValue(content, 'tag', 'demo/none'), null)
  assert.equal(objectFileName('tag', 'demo/first', 'level'), 'demo/tags/level/first.json')
  assert.equal(objectFileName('section', 'demo/map'), 'demo/sections/map.json')
  assert.equal(objectFileName('section', 'demo/map', null, 'demo'), 'sections/map.json')
  assert.deepEqual(ownObjectData('demo', objectValue(content, 'tag', 'demo/first')),
    { title: { en: 'First', $key: 'tags.first' }, values: ['a', 'other/b', '#inner'] })
})

test('an edit of the layer’s own object is its object operation; another layer’s makes none', () => {
  assert.deepEqual(objectOp(object('demo/first'), ['values', 1], { set: 'demo/c' }), { op: 'tag.set', tag: 'first', path: ['values', 1], value: 'c' })
  assert.deepEqual(objectOp(object('demo/first'), ['title'], { set: 'Erste', lang: 'de' }, 'text'),
    { op: 'tag.set', tag: 'first', path: ['title'], value: { en: 'First', de: 'Erste', $key: 'tags.first' } })
  assert.deepEqual(objectOp(object('demo/first'), ['title'], { unset: true }), { op: 'tag.put', tag: 'first', data: { kind: 'level', values: ['a', 'other/b', '#inner'] } })
  assert.deepEqual(objectOp(object('demo/map', 'section'), ['values'], { set: ['demo/a'] }), { op: 'section.set', section: 'map', path: ['values'], value: ['a'] })
  assert.equal(objectOp(object('demo/first'), [], { unset: true }), null)
  assert.equal(objectOp(object('other/far'), ['values'], { set: [] }), null)
  // The forms reach them through the same file operation as any other file.
  assert.deepEqual(opFor({ object: object('demo/map', 'section') }, 'values', { set: ['demo/a'] }), { op: 'section.set', section: 'map', path: ['values'], value: ['a'] })
  const shown = fileForm(content, {}, { object: { kind: 'section', full: 'demo/map' } }, [])
  assert.deepEqual(shown.value, { title: 'Words', values: [] })
  assert.equal(shown.form.kind, 'obj')
})

test('an override’s file is what the override operation writes: a patch of a tag or relation, anything else whole', () => {
  const tag = { layer: 'demo', kind: 'tag', name: 'other/far', before: { kind: 'level', values: ['other/b', 'other/c'] }, after: { kind: 'level', title: { en: 'Far' }, values: ['other/b', 'demo/a'] } }
  assert.deepEqual(overrideFileOf(tag), { title: { en: 'Far' }, values: ['demo/a'], remove: ['other/c'] })
  const relation = { layer: 'demo', kind: 'relation', name: 'other/r', before: { kind: 'requires', edges: [{ from: 'x', to: 'y' }] }, after: { kind: 'requires', edges: [{ from: 'x', to: 'y' }, { from: 'y', to: 'z' }] } }
  assert.deepEqual(overrideFileOf(relation), { edges: [{ from: 'y', to: 'z' }] })
  const layout = { layer: '@game', kind: 'section', name: 'demo/map', before: { of: '#demo/t', rows: [] }, after: { of: '#demo/t', rows: [['demo/a']] } }
  assert.deepEqual(overrideFileOf(layout), { of: '#demo/t', rows: [['demo/a']] })
  assert.deepEqual(overrideOp(layout, '@game', { rows: [] }), { op: 'override.put', layer: '@game', kind: 'section', name: 'demo/map', data: { rows: [] } })
  assert.equal(overrideOp(layout, 'demo', { rows: [] }), null)
})
