import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultTypes, leftLists, listOfType, objectTypes, ownTemplatesTag, studioLeft, templatesOf, typeOfList } from './object-types.js'
import { objectFileName, objectOp, objectSchema } from './object-file.js'
import { headingParam, listOfHeading, readHeading } from './left-lists.js'

const scene = { folder: 'scenes', schema: { type: 'obj', fields: { title: { type: 'str' } } }, studio: { name: { zh: '场景', en: 'Scenes' }, icon: 'Image' } }
const content = (tags = {}) => ({
  layerOrder: ['base', 'story'],
  objectKinds: { 'story/scene': scene, 'story/extra': { extends: 'task', fields: {} } },
  partDefs: null, glossary: { entries: [] },
  registries: {
    level: { 'story/a': {}, 'story/b': {} },
    'story/scene': { 'story/start': { title: 'Start' } },
    quote: {},
    tag: tags,
  },
})

test('the left column lists object types: the packages’ studio-left, else what has objects; tools after, search last', () => {
  const plain = content()
  assert.deepEqual(objectTypes(plain).map(({ type }) => type).slice(-1), ['story/scene'])
  assert.ok(!objectTypes(plain).some(({ type }) => type === 'story/extra'), 'a field extension is not a type of its own')
  assert.equal(studioLeft(plain), null)
  assert.deepEqual(defaultTypes(plain), ['level', 'story/scene'])
  assert.deepEqual(leftLists(plain), ['tree', 'type:story/scene', 'kernel', 'overrides', 'search'])
  const said = content({
    'base/studio-left': { kind: 'kind', values: ['story/scene'] },
    'story/studio-left': { kind: 'kind', values: ['level', 'quote'] },
  })
  assert.deepEqual(studioLeft(said), ['story/scene', 'level', 'quote'])
  assert.deepEqual(leftLists(said, ['quote']), ['type:quote', 'kernel', 'overrides', 'search'])
  assert.equal(typeOfList(listOfType('story/scene')), 'story/scene')
  assert.equal(typeOfList('tree'), 'level')
})

test('templates are the members of a type’s templates tags, a dependency’s first', () => {
  const c = content({
    'story/templates': { kind: 'level', values: ['story/b'] },
    'base/templates': { kind: 'level', values: ['story/a'] },
  })
  assert.deepEqual(templatesOf(c, 'level'), ['story/a', 'story/b'])
  assert.deepEqual(templatesOf(c, 'story/scene'), [])
  assert.equal(ownTemplatesTag(c, 'level', 'story'), 'story/templates')
  assert.equal(ownTemplatesTag(c, 'story/scene', 'story'), null)
})

test('a declared type’s object is edited through the object operations, in its own folder', () => {
  const object = { kind: 'story/scene', full: 'story/start', namespace: 'story', value: { title: 'Start' }, declared: scene }
  assert.deepEqual(objectOp(object, ['title'], { set: 'Begin' }), { op: 'object.set', kind: 'story/scene', name: 'start', path: ['title'], value: 'Begin' })
  assert.deepEqual(objectOp(object, ['title'], { unset: true }), { op: 'object.put', kind: 'story/scene', name: 'start', data: {} })
  assert.equal(objectFileName('story/scene', 'story/start', null, 'story', scene), 'scenes/start.json')
  assert.equal(objectSchema('story/scene', object), scene.schema)
  const quote = { kind: 'quote', full: 'story/q', namespace: 'story', value: { text: 'x' } }
  assert.deepEqual(objectOp(quote, ['text'], { set: 'y' }), { op: 'quote.set', quote: 'q', path: ['text'], value: 'y' })
  assert.equal(objectFileName('quote', 'story/q', null, 'story'), 'quote/q.json')
})

test('an object of any type is kept in the address', () => {
  const heading = { kind: 'story/scene', full: 'story/start' }
  const [param, value] = headingParam(heading)
  assert.deepEqual(readHeading(new URLSearchParams({ [param]: value })), heading)
  assert.deepEqual(headingParam({ kind: 'tag', full: 'story/t' }), ['tag', 'story/t'])
  assert.equal(listOfHeading('story/scene'), 'type:story/scene')
  assert.equal(listOfHeading('tray'), 'parts')
})
