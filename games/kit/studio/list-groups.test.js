import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GROUPINGS, groupsOf, relationKind, stageOwners, ungrouped } from './list-groups.js'

const content = {
  partDefs: { parts: { 'p/add': { stages: [{ id: 'add-carry' }] }, 'p/mul': {}, 'p/neg': {} } },
  registries: {
    level: { 'p/a': {}, 'p/b': {}, 'p/c': {} },
    part: { 'p/add': {}, 'p/mul': {}, 'p/neg': {} },
    entry: { 'p/e1': {}, 'p/e2': {} },
    tag: {
      'level:p/basics': { kind: 'level', values: ['p/b', 'p/a'] },
      'level:p/more': { kind: 'level', values: ['p/a', 'p/c'] },
      'part:p/arith': { kind: 'part', values: ['p/add-carry', 'p/mul'] },
      'entry:p/words': { kind: 'entry', values: ['p/e1'] },
    },
    relation: {
      'p/basics-requires': { kind: 'requires', edges: [{ from: 'p/a', to: 'p/b' }] },
      'p/upgrades': { kind: 'replaces', edges: [{ from: 'p/add', to: 'p/mul' }] },
      'p/entry-order': { kind: 'order', sequence: ['p/e2', 'p/e1'] },
      'p/level-tags-order': { kind: 'order', of: 'tag', member: 'level', sequence: ['#p/more', '#p/basics'] },
      'p/sections-order': { kind: 'order', of: 'section', sequence: ['p/two', 'p/one'] },
    },
    tray: { 'p/main': { values: ['p/neg', '#p/arith'], menus: [{ id: 'p/m', values: ['p/add'] }] } },
    section: { 'p/one': { values: ['p/e1'] }, 'p/two': { values: ['p/e2', 'p/e1'] } },
  },
  relationEdges: { requires: [{ from: 'p/a', to: 'p/b' }], order: [{ from: '#p/more', to: '#p/basics', of: 'tag', member: 'level' }, { from: 'p/two', to: 'p/one', of: 'section' }] },
}

test('each list groups by the tags of its kind, or by the objects that gather it', () => {
  assert.deepEqual(GROUPINGS.part, ['tag', 'tray', 'relation'])
  assert.deepEqual(groupsOf(content, 'level', 'tag').map((g) => [g.full, g.members]), [['level:p/more', ['p/a', 'p/c']], ['level:p/basics', ['p/a', 'p/b']]])
  // A stage stands for its part; a tray's menus count as its members.
  assert.deepEqual(stageOwners(content).get('p/add-carry'), 'p/add')
  assert.deepEqual(groupsOf(content, 'part', 'tag').map((g) => g.members), [['p/add', 'p/mul']])
  assert.deepEqual(groupsOf(content, 'part', 'tray'), [{ kind: 'tray', full: 'p/main', members: ['p/neg', 'p/add', 'p/mul'] }])
  assert.deepEqual(groupsOf(content, 'entry', 'section').map((g) => g.full), ['p/two', 'p/one'])
  // Relations by the kind of their endpoints; one ordering tags or sections is no group.
  assert.deepEqual(groupsOf(content, 'level', 'relation').map((g) => [g.full, g.members]), [['p/basics-requires', ['p/a', 'p/b']]])
  assert.deepEqual(groupsOf(content, 'part', 'relation').map((g) => g.full), ['p/upgrades'])
  assert.deepEqual(groupsOf(content, 'entry', 'relation').map((g) => g.full), ['p/entry-order'])
  assert.equal(relationKind(content, content.registries.relation['p/level-tags-order']), null)
  assert.deepEqual(ungrouped(['p/a', 'p/b', 'p/c'], groupsOf(content, 'level', 'relation')), ['p/c'])
})
