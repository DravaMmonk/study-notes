// node --test games/kit/studio/object-editors.test.js — the tag and layout editors' pure parts (tag-edit.js,
// layout-edit.js) on a small hand-written content: members added and refused, nested tags without rings, texts kept
// with their keys, levels placed, swapped and taken off a layout, and moves refused that put a prerequisite below.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { memberKnown, memberTitle, newTag, ownTagData, withConcept, tagCycle, tagValuesOp, textWith, withMember, withoutMember, writtenName } from './tag-edit.js'
import { addPlace, addRow, clearLevel, layoutRefusal, layoutRowsOp, newLayout, placeLevel, placeOf, removePlace, removeRow, rowConflicts, unplacedOf } from './layout-edit.js'

const CONTENT = {
  registries: {
    level: { 'p/a': { title: { en: 'A' } }, 'p/b': { title: { en: 'B' } }, 'p/c': {}, 'o/d': { title: { en: 'D' } } },
    piece: { 'p/and': { name: { en: 'And' } }, not: {} },
    entry: { 'p/e': { title: { en: 'E' } } },
    tag: {
      'p/first': { kind: 'level', values: ['p/a', '#p/second'] },
      'p/second': { kind: 'level', values: ['p/b', '#p/third'] },
      'p/third': { kind: 'level', values: ['p/c'] },
      'p/gates': { kind: 'piece', values: ['p/and'] },
      'o/more': { kind: 'level', values: ['o/d', '#p/first'] },
    },
    layout: {
      'p/map': { of: '#p/first', rows: [['p/a', null], ['p/b']] },
    },
  },
  relationEdges: { order: [], requires: [{ from: 'p/a', to: 'p/b' }, { from: 'p/b', to: 'p/c' }] },
}

test('a member is written short for the layer’s own, full for another namespace', () => {
  assert.equal(writtenName('p', 'p/a'), 'a')
  assert.equal(writtenName('p', '#p/first'), '#first')
  assert.equal(writtenName('p', '#o/more'), '#o/more')
  assert.equal(writtenName('p', 'not'), 'not')
  assert.deepEqual(tagValuesOp('p', 'p/first', ['p/a', 'o/d', '#p/third']), { op: 'tag.set', tag: 'first', path: 'values', value: ['a', 'o/d', '#third'] })
})

test('members show their object’s title, a piece its name', () => {
  assert.deepEqual(memberTitle(CONTENT, 'level', 'p/a'), { en: 'A' })
  assert.equal(memberTitle(CONTENT, 'level', 'p/c'), null)
  assert.deepEqual(memberTitle(CONTENT, 'piece', 'p/and'), { en: 'And' })
  assert.deepEqual(memberTitle(CONTENT, 'entry', 'p/e'), { en: 'E' })
})

test('a member is added, and refused when it is there, the tag itself, another kind or a ring', () => {
  assert.deepEqual(withMember(CONTENT, 'p/third', 'o/d'), { values: ['p/c', 'o/d'] })
  assert.deepEqual(withMember(CONTENT, 'p/first', 'p/a'), { refusal: 'duplicate' })
  assert.deepEqual(withMember(CONTENT, 'p/first', '#p/first'), { refusal: 'self' })
  assert.deepEqual(withMember(CONTENT, 'p/first', '#p/gates'), { refusal: 'kind' })
  assert.deepEqual(withMember(CONTENT, 'p/third', '#p/first'), { refusal: 'cycle' })
  assert.equal(tagCycle(CONTENT, 'p/third', '#o/more'), true)
  assert.equal(tagCycle(CONTENT, 'o/more', '#p/third'), false)
  assert.deepEqual(withoutMember(CONTENT, 'p/first', '#p/second'), ['p/a'])
})

test('a text keeps its other languages and its message key, the layer’s own key short', () => {
  assert.deepEqual(textWith('p', { en: 'Old', zh: '旧', $key: 'p/tag.first.title' }, 'en', 'New'), { en: 'New', zh: '旧', $key: 'tag.first.title' })
  assert.deepEqual(textWith('p', undefined, 'zh', '新'), { zh: '新' })
})

test('a tag is written back whole in the layer’s own short names, concept set or taken out', () => {
  const tag = { kind: 'piece', title: { en: 'Gates', $key: 'p/tag.gates.title' }, concept: true, values: ['p/and', 'not', '#o/x'] }
  assert.deepEqual(ownTagData('p', tag), { kind: 'piece', title: { en: 'Gates', $key: 'tag.gates.title' }, concept: true, values: ['and', 'not', '#o/x'] })
  assert.equal('concept' in withConcept('p', tag, false), false)
  assert.equal(withConcept('p', { kind: 'piece', values: [] }, true).concept, true)
  assert.equal(memberKnown(CONTENT, 'piece', 'p/and'), true)
  assert.equal(memberKnown(CONTENT, 'level', 'p/zz'), false)
  assert.equal(memberKnown(CONTENT, 'level', '#p/third'), true)
})

test('a new tag takes a name the layer does not use', () => {
  const content = { registries: { tag: { 'p/new-level': { kind: 'level', values: [] }, 'o/new-level-2': { kind: 'level', values: [] } } } }
  assert.deepEqual(newTag(content, 'p', 'level'), { name: 'new-level-2', full: 'p/new-level-2', op: { op: 'tag.put', tag: 'new-level-2', data: { kind: 'level', values: [] } } })
})

test('a layout’s unplaced levels are its tag’s members no row places', () => {
  assert.deepEqual(unplacedOf(CONTENT, CONTENT.registries.layout['p/map']), ['p/c'])
  assert.deepEqual(newLayout(CONTENT, 'p', 'p/first'), { name: 'first', full: 'p/first', op: { op: 'layout.put', layout: 'first', data: { of: '#first', rows: [] } } })
  assert.equal(newLayout(CONTENT, 'p', 'p/map').name, 'map-2')
  assert.equal(newLayout(CONTENT, 'p', 'o/more').op.data.of, '#o/more')
})

test('a level is placed, swapped, given a row of its own and taken off', () => {
  const rows = [['p/a', null], ['p/b']]
  assert.deepEqual(placeLevel(rows, 'p/c', { row: 1, slot: 1 }), [['p/a', null], ['p/b', 'p/c']])
  assert.deepEqual(placeLevel(rows, 'p/a', { row: 0, slot: 1 }), [[null, 'p/a'], ['p/b']])
  assert.deepEqual(placeLevel(rows, 'p/a', { row: 1, slot: 0 }), [['p/b', null], ['p/a']])
  assert.deepEqual(placeLevel(rows, 'p/c', { row: 1, slot: 0 }), [['p/a', null], ['p/c']])
  assert.deepEqual(placeLevel(rows, 'p/c', { row: 2, new: true }), [['p/a', null], ['p/b'], ['p/c']])
  assert.deepEqual(placeLevel(rows, 'p/b', { row: 0, new: true }), [['p/b'], ['p/a', null], [null]])
  const full = [['p/a', 'p/b', 'o/d']]
  assert.equal(placeLevel(full, 'p/c', { row: 0, slot: 3 }), full)
  assert.deepEqual(placeOf(rows, 'p/b'), { row: 1, slot: 0 })
  assert.equal(placeOf(rows, 'p/c'), null)
  assert.deepEqual(clearLevel(rows, 'p/a'), [[null, null], ['p/b']])
})

test('places and rows are added and taken out', () => {
  const rows = [['p/a', null], ['p/b']]
  assert.deepEqual(addPlace(rows, 1), [['p/a', null], ['p/b', null]])
  assert.deepEqual(addPlace([['p/a', null, null]], 0), [['p/a', null, null]])
  assert.deepEqual(removePlace(rows, 0, 1), [['p/a'], ['p/b']])
  assert.equal(removePlace(rows, 0, 0), rows)
  assert.deepEqual(removePlace([[null], ['p/b']], 0, 0), [['p/b']])
  assert.deepEqual(addRow(rows), [['p/a', null], ['p/b'], [null]])
  assert.deepEqual(addRow(rows, 0), [[null], ['p/a', null], ['p/b']])
  assert.deepEqual(removeRow(rows, 0), [['p/b']])
})

test('a move that puts a prerequisite in a row not above its level is refused, an old one is not', () => {
  const edges = CONTENT.relationEdges.requires
  const rows = [['p/a'], ['p/b'], []]
  assert.deepEqual(rowConflicts([['p/a', 'p/b']], edges), [{ from: 'p/a', to: 'p/b' }])
  assert.deepEqual(rowConflicts([['p/c'], ['p/a']], edges), [{ from: 'p/a', to: 'p/c' }])
  assert.deepEqual(layoutRefusal(rows, placeLevel(rows, 'p/b', { row: 0, slot: 1 }), edges), { from: 'p/a', to: 'p/b' })
  assert.equal(layoutRefusal(rows, placeLevel(rows, 'p/c', { row: 2, new: true }), edges), null)
  const wrong = [['p/b'], ['p/a']]
  assert.equal(layoutRefusal(wrong, placeLevel(wrong, 'p/c', { row: 2, new: true }), edges), null)
})

test('rows are written with the layer’s own levels short', () => {
  assert.deepEqual(layoutRowsOp('p', 'p/map', [['p/a', null], ['o/d']]), { op: 'layout.set', layout: 'map', path: 'rows', value: [['a', null], ['o/d']] })
})
