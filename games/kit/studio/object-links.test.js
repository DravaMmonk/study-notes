// Where an object is named (ObjectLinks.jsx objectPlaces): the tags holding it, the relations naming it or a tag of
// it, the trays and sections gathering it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { objectPlaces } from './objects-edit.js'

test('an object’s tags, the relations naming it directly or through a tag, and the trays or sections gathering it', () => {
  const content = { registries: {
    tag: { 'p/t': { kind: 'level', values: ['p/a', 'p/b'] }, 'p/e': { kind: 'entry', values: ['p/a'] }, 'p/g': { kind: 'circuit/part', values: ['p/and'] } },
    relation: { 'p/r': { kind: 'requires', edges: [{ from: '#p/t', to: 'p/c' }] }, 'p/o': { kind: 'order', sequence: ['p/c', 'p/d'] } },
    'circuit/tray': { 'p/main': { values: ['p/or'], menus: [{ id: 'p/m', values: ['#p/g'] }] } },
    section: { 'p/s': { values: ['#p/e'] } },
  } }
  assert.deepEqual(objectPlaces(content, 'level', 'p/a'), { tags: ['p/t'], relations: ['p/r'], trays: [], sections: [] })
  assert.deepEqual(objectPlaces(content, 'level', 'p/d'), { tags: [], relations: ['p/o'], trays: [], sections: [] })
  assert.deepEqual(objectPlaces(content, 'entry', 'p/a'), { tags: ['p/e'], relations: [], trays: [], sections: ['p/s'] })
  assert.deepEqual(objectPlaces(content, 'circuit/part', 'p/and'), { tags: ['p/g'], relations: [], trays: ['p/main'], sections: [] })
})
