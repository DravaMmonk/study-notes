// Where an object is named (ObjectLinks.jsx objectPlaces): the tags holding it, the relations naming it or a tag of
// it, the layouts placing it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { objectPlaces } from './objects-edit.js'

test('an object’s tags, the relations naming it directly or through a tag, and the layouts placing it', () => {
  const content = { registries: {
    tag: { 'p/t': { kind: 'level', values: ['p/a', 'p/b'] }, 'p/e': { kind: 'entry', values: ['p/a'] } },
    relation: { 'p/r': { kind: 'requires', edges: [{ from: '#p/t', to: 'p/c' }] }, 'p/o': { kind: 'order', sequence: ['p/c', 'p/d'] } },
    layout: { 'p/m': { of: '#p/t', rows: [['p/a', null]] } },
  } }
  assert.deepEqual(objectPlaces(content, 'level', 'p/a'), { tags: ['p/t'], relations: ['p/r'], layouts: ['p/m'] })
  assert.deepEqual(objectPlaces(content, 'level', 'p/d'), { tags: [], relations: ['p/o'], layouts: [] })
  assert.deepEqual(objectPlaces(content, 'entry', 'p/a'), { tags: ['p/e'], relations: [], layouts: [] })
})
