import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assemble } from './content.js'
import { S } from './schema.js'
import { applyOverride } from './layers.js'

test('sections order independently of tags, share entries and collect ungrouped entries under Other', () => {
  const content = assemble({ id: 'sample', schemas: { game: S.obj({}), level: S.obj({}), kinds: {} }, game: {}, levels: [],
    glossary: { groups: [], entries: ['a', 'b', 'c'].map(id => ({ id, title: id, body: [] })) },
    tags: [['words', { kind: 'entry', title: 'Studio only', values: ['a', 'b'] }]],
    sections: [['first', { title: 'First', values: ['#words'] }], ['second', { title: 'Second', values: ['b'] }]],
    relations: [['sections', { kind: 'order', of: 'section', sequence: ['second', 'first'] }], ['entries', { kind: 'order', of: 'entry', sequence: ['b', 'a'] }]],
  })
  assert.deepEqual(content.objectProblems, [])
  assert.deepEqual(content.glossary.groups.map(group => [group.id, group.values]), [
    ['sample/second', ['sample/b']], ['sample/first', ['sample/b', 'sample/a']], ['', ['sample/c']],
  ])
  assert.deepEqual(content.glossary.groups.at(-1).title, { zh: '其它', en: 'Other' })
  assert.deepEqual(applyOverride('section', { title: 'First', values: ['a'] }, { remove: ['a'], values: ['b'] }), { title: 'First', values: ['b'] })
  assert.equal(Object.hasOwn(content.registries, 'layout'), false)
  assert.equal(content.trays, undefined)
})
