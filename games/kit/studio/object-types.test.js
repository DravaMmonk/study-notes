import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultTypes, leftLists, listOfType, objectTypes, studioLeft, typeOfList } from './object-types.js'
import { objectFileName, objectOp, objectSchema } from './object-file.js'
import { headingParam, listOfHeading, readHeading } from './left-lists.js'

const scene = { declares: 'package', overrides: { package: ['*'], game: ['$text'] }, folder: 'scenes', schema: { type: 'obj', fields: { title: { type: 'str' } } }, studio: { name: { zh: '场景', en: 'Scenes' }, icon: 'Image' } }
const quoteDeclaration = { declares: 'package', overrides: { package: ['*'], game: ['$text'] }, folder: 'quote', schema: { type: 'obj', fields: { text: { type: 'str' } } } }
const content = (tags = {}) => ({
  layerOrder: ['base', 'story'],
  objectKinds: { 'circuit/quote': quoteDeclaration, 'story/scene': scene, 'story/extra': { extends: 'task', fields: {} } },
  partDefs: null, glossary: { entries: [] },
  registries: {
    level: { 'story/a': {}, 'story/b': {} },
    'story/scene': { 'story/start': { title: 'Start' } },
    'circuit/quote': {},
    tag: tags,
  },
})

test('the left column lists object types: kernel/studio-left, else what has objects; tools after, search last', () => {
  const plain = content()
  assert.deepEqual(objectTypes(plain).map(({ type }) => type).slice(-1), ['story/scene'])
  assert.ok(!objectTypes(plain).some(({ type }) => type === 'story/extra'), 'a field extension is not a type of its own')
  assert.equal(studioLeft(plain), null)
  assert.deepEqual(defaultTypes(plain), ['level', 'story/scene'])
  assert.deepEqual(leftLists(plain), ['tree', 'type:story/scene', 'kernel', 'overrides', 'search'])
  const said = content({ 'kind:kernel/studio-left': { kind: 'kind', values: ['story/scene', 'level', 'circuit/quote', 'gone'] } })
  assert.deepEqual(studioLeft(said), ['circuit/quote', 'level', 'story/scene'], 'a tag is a set: its order is its order relation’s, else by name')
  assert.deepEqual(leftLists(said, ['circuit/quote']), ['type:circuit/quote', 'kernel', 'overrides', 'search'])
  assert.equal(typeOfList(listOfType('story/scene')), 'story/scene')
  assert.equal(typeOfList('tree'), 'level')
})

test('a declared type’s object is edited through the object operations, in its own folder', () => {
  const object = { kind: 'story/scene', full: 'story/start', namespace: 'story', value: { title: 'Start' }, declared: scene }
  assert.deepEqual(objectOp(object, ['title'], { set: 'Begin' }), { op: 'object.set', kind: 'story/scene', name: 'start', path: ['title'], value: 'Begin' })
  assert.deepEqual(objectOp(object, ['title'], { unset: true }), { op: 'object.put', kind: 'story/scene', name: 'start', data: {} })
  assert.equal(objectFileName('story/scene', 'story/start', null, 'story', scene), 'scenes/start.json')
  assert.equal(objectSchema('story/scene', object), scene.schema)
  const quote = { kind: 'circuit/quote', full: 'story/q', namespace: 'story', value: { text: 'x' }, declared: quoteDeclaration }
  assert.deepEqual(objectOp(quote, ['text'], { set: 'y' }), { op: 'object.set', kind: 'circuit/quote', name: 'q', path: ['text'], value: 'y' })
  assert.equal(objectFileName('circuit/quote', 'story/q', null, 'story', quoteDeclaration), 'quote/q.json')
})

test('an object of any type is kept in the address', () => {
  const heading = { kind: 'story/scene', full: 'story/start' }
  const [param, value] = headingParam(heading)
  assert.deepEqual(readHeading(new URLSearchParams({ [param]: value })), heading)
  assert.deepEqual(headingParam({ kind: 'tag', full: 'story/t' }), ['tag', 'story/t'])
  assert.equal(listOfHeading('story/scene'), 'type:story/scene')
  assert.equal(listOfHeading('sample/collection'), 'type:sample/collection')
})

test('a structured problem points at the object and field that name the missing target', async () => {
  const { itemOf, problemPlace } = await import('./worklist.js')
  const problem = { rule: 'exists', at: 'qed/level/copy.tasks[0].solution', object: { kind: 'level', name: 'qed/copy' }, path: 'tasks[0].solution', layer: 'qed', kind: 'circuit/part', target: 'qed/gone', reason: 'missing' }
  const item = itemOf({ text: 'content: missing target part qed/gone', fail: true, problem })
  assert.equal(item.rule, 'exists')
  assert.deepEqual(problemPlace(item.problem), { override: false, kind: 'level', full: 'qed/copy', path: 'tasks[0].solution' })
  assert.deepEqual(problemPlace({ object: { kind: 'tag', name: 'qed/basics', member: 'level' }, path: 'values[0]' }).full, 'level:qed/basics')
  assert.equal(problemPlace({ object: { kind: 'package', name: 'qed' }, path: 'uses[0]' }), null)
})

test('package lists use registration and otherwise the full declared type', async () => {
  const { installStudioPlugins } = await import('./editors.js')
  const { registerPlugins } = await import('../engine/plugins.js')
  assert.equal(listOfType('sample/item'), 'type:sample/item')
  const kernel = await registerPlugins([{ id: 'sample', view: { register(k) {
    k.editor('sample:item', { type: 'sample/item', component() {}, listKey: 'items' })
  } } }], { view: true })
  installStudioPlugins(kernel)
  assert.equal(listOfType('sample/item'), 'items')
  assert.equal(typeOfList('items'), 'sample/item')
  installStudioPlugins(null)
})
