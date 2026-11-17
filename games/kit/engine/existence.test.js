import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from './schema.js'
import { defineVocabulary } from './vocabulary.js'
import { assembleLayers } from './resolver.js'
import { existenceProblems, publicSurfaces, collectReferences } from './existence.js'

const schemas = defineVocabulary({ module: 'toy', version: 1, kinds: {},
  game: S.obj({}), level: S.obj({ nested: S.opt(S.list(S.obj({ arbitrary: S.ref('lib/scene') }))), grants: S.opt(S.list(S.str({ reference: 'grant' }))) }),
})
schemas.objectKinds = { 'lib/scene': { folder: 'scenes', schema: S.obj({ next: S.opt(S.ref('lib/scene')) }) } }
const object = (kind, name, value = {}) => ({ kind, name, value })
const layer = (id, objects = [], overrides = [], uses = []) => ({ id, config: { vocabulary: 1, uses }, objects, overrides, catalogs: {} })
const lib = () => ({ ...layer('lib', [object('kind', 'scene', schemas.objectKinds['lib/scene']), object('lib/scene', 'start')]), codeObjects: [object('lib/scene', 'lib/registered') ] })

test('one structured check covers schema references, overrides, tag contributions, endpoints, grants and dependencies', () => {
  const consumer = layer('consumer', [
    object('level', 'one', { nested: [{ arbitrary: 'lib/missing' }], grants: ['lib/no-grant'] }),
    object('tray', 'tray', { values: ['lib/no-tray-member'], menus: [{ id: 'menu', title: 'Menu', values: ['lib/no-menu-member'] }] }),
    object('relation', 'order', { kind: 'order', of: 'lib/scene', sequence: ['lib/start', 'lib/no-endpoint'] }),
  ], [object('lib/scene', 'lib/no-override', {}), object('tag', 'lib/no-tag', { kind: 'lib/scene', values: ['lib/no-member'], remove: ['lib/no-remove'] })], ['lib', 'absent'])
  const content = assembleLayers('consumer', [lib(), consumer], schemas, { packageId: 'consumer' })
  const problems = content.objectProblems.filter(problem => problem.rule === 'exists')
  for (const target of ['absent', 'lib/missing', 'lib/no-grant', 'lib/no-tray-member', 'lib/no-menu-member', 'lib/no-endpoint', 'lib/no-override', 'lib/no-tag', 'lib/no-member', 'lib/no-remove']) {
    assert.ok(problems.some(problem => problem.target === target), target)
  }
  for (const problem of problems) {
    assert.equal(problem.reason, 'missing')
    assert.equal(problem.layer, 'consumer')
    assert.ok(problem.at && problem.kind && problem.target)
    assert.match(problem.says, /^missing target /)
  }
  assert.ok(content.registries['lib/scene']['lib/no-override'])
  assert.ok(problems.some(problem => problem.target === 'lib/no-override'))
})

test('code registrations satisfy every object type, while foreign overrides do not invent owner declarations', () => {
  const consumer = layer('consumer', [object('level', 'one', { nested: [{ arbitrary: 'lib/registered' }] })], [object('lib/scene', 'lib/registered', { next: 'lib/start' })], ['lib'])
  const content = assembleLayers('consumer', [lib(), consumer], schemas, { packageId: 'consumer' })
  assert.deepEqual(content.objectProblems, [])
  assert.ok(content.registries['lib/scene']['lib/registered'])
  consumer.config.uses = []
  assert.ok(assembleLayers('consumer', [lib(), consumer], schemas).objectProblems.some(problem => problem.reason === 'undeclared dependency'))
})

test('the collector follows reference schemas through branches, maps, keys and calls, never ordinary strings', () => {
  const refs = []
  const schema = S.obj({ data: S.map(S.either(S.str(), S.ref('lib/scene')), { key: S.ref('lib/scene') }), call: S.call('op'), literal: S.str() })
  const vocabulary = { kinds: { op: { 'lib:run': { params: S.obj({ destination: S.ref('lib/scene') }) } } } }
  collectReferences({ data: { 'lib/start': 'ordinary' }, call: { 'lib:run': { destination: 'lib/end' } }, literal: 'lib/ignored' }, schema, vocabulary, (kind, target) => refs.push([kind, target]), 'root')
  assert.deepEqual(refs, [['lib/scene', 'lib/start'], ['op', 'lib:run'], ['lib/scene', 'lib/end']])
})

test('typed tags, registered readers, unknown member types and ambiguous unconstrained targets share the format', () => {
  const owner = lib()
  owner.objects.push(object('tag', 'same', { kind: 'level', values: [] }), object('tag', 'same', { kind: 'entry', values: [] }))
  owner.tagReaders = [{ name: 'lib/reader', member: 'lib/scene', reader: 'lib' }]
  const consumer = layer('consumer', [], [object('tag', 'lib/reader', { kind: 'lib/scene', values: ['lib/registered'] }), object('tag', 'lib/same', { kind: 'missing-kind', values: [] })], ['lib'])
  const content = assembleLayers('consumer', [owner, consumer], schemas)
  assert.ok(!content.objectProblems.some(problem => problem.target === 'lib/reader'))
  assert.ok(content.objectProblems.some(problem => problem.kind === 'tag' && problem.member === 'missing-kind'))
  assert.ok(content.objectProblems.some(problem => problem.kind === 'kind' && problem.target === 'missing-kind'))
  const refs = [{ id: '@game', config: { packages: ['lib'] }, objects: [object('relation', '@game/order', { kind: 'order', sequence: ['#lib/same'] })] }]
  const problems = existenceProblems(refs, schemas, publicSurfaces(contentLayers(owner), schemas))
  assert.equal(problems.find(problem => problem.target === 'lib/same')?.reason, 'ambiguous')
})

function contentLayers(owner) {
  return [{ ...owner, objects: owner.objects.map(object => ({ ...object, name: `lib/${object.name}` })) }]
}
