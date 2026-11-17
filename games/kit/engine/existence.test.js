import { circuitFixtureKinds } from './ops/fixture.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from './schema.js'
import { defineVocabulary } from './vocabulary.js'
import { assembleLayers as assembleContentLayers } from './resolver.js'
import { existenceProblems, contentExistenceProblems, publicSurfaces, collectReferences } from './existence.js'

const schemas = defineVocabulary({ module: 'toy', version: 1, kinds: {},
  game: S.obj({}), level: S.obj({ nested: S.opt(S.list(S.obj({ arbitrary: S.ref('lib/scene') }))), grants: S.opt(S.list(S.str({ reference: 'grant' }))) }),
})
schemas.objectKinds = { ...circuitFixtureKinds, 'lib/scene': { folder: 'scenes', schema: S.obj({ next: S.opt(S.ref('lib/scene')) }) } }
const object = (kind, name, value = {}) => ({ kind, name, value })
const layer = (id, objects = [], overrides = [], uses = []) => ({ id, config: { version: '1.0.0', kernel: '^0.0.0', uses: Object.fromEntries(uses.map(id => [id, '^1.0.0'])) }, objects, overrides, catalogs: {} })
const lib = () => ({ ...layer('lib', [object('kind', 'scene', schemas.objectKinds['lib/scene']), object('lib/scene', 'start')]), codeObjects: [object('lib/scene', 'lib/registered') ] })

const assembleLayers = (id, layers, schemas, options) => {
  const circuit = layer('circuit', Object.entries(circuitFixtureKinds).map(([name, value]) => object('kind', name.split('/')[1], value)))
  return assembleContentLayers(id, [circuit, ...layers.map(item => ({ ...item, config: { ...item.config, uses: { ...item.config.uses, circuit: '^0.0.0' } } }))], schemas, options)
}

test('one structured check covers schema references, overrides, tag contributions, endpoints, grants and dependencies', () => {
  const consumer = layer('consumer', [
    object('level', 'one', { nested: [{ arbitrary: 'lib/missing' }], grants: ['lib/no-grant'] }),
    object('circuit/tray', 'tray', { values: ['lib/no-tray-member'], menus: [{ id: 'menu', title: 'Menu', values: ['lib/no-menu-member'] }] }),
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
  consumer.config.uses = {}
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
  const refs = [{ id: '@game', config: { kernel: '^0.0.0', packages: { 'lib': '^1.0.0' } }, objects: [object('relation', '@game/order', { kind: 'order', sequence: ['#lib/same'] })] }]
  const problems = existenceProblems(refs, schemas, publicSurfaces(contentLayers(owner), schemas))
  assert.equal(problems.find(problem => problem.target === 'lib/same')?.reason, 'ambiguous')
})

function contentLayers(owner) {
  return [{ ...owner, objects: owner.objects.map(object => ({ ...object, name: `lib/${object.name}` })) }]
}


test('assembled typed tags report each authored missing member once, preserving member identity', () => {
  const content = assembleLayers('consumer', [layer('consumer', [
    object('tag', 'gone-test', { kind: 'level', values: ['consumer/nowhere'] }),
    object('tag', 'gone-test', { kind: 'entry', values: ['consumer/nowhere'] }),
  ])], schemas, { packageId: 'consumer' })
  const problems = contentExistenceProblems(content, schemas)
  assert.equal(problems.length, 2)
  for (const [i, member] of ['level', 'entry'].entries()) {
    assert.deepEqual(problems[i].object, { kind: 'tag', name: 'consumer/gone-test', member })
    assert.equal(problems[i].path, 'values[0]')
    assert.equal(problems[i].at, 'consumer/tag/consumer/gone-test.values[0]')
  }
})

test('locations identify nested level fields, override targets and dependency selections', () => {
  const vocabulary = { ...schemas, level: S.obj({ tasks: S.list(S.obj({ id: S.str(), solution: S.ref('lib/scene') })) }) }
  const content = assembleLayers('consumer', [lib(), layer('consumer', [
    object('level', 'one', { tasks: [{ id: 'task', solution: 'lib/gone' }] }),
  ], [object('lib/scene', 'lib/no-override', { next: 'lib/missing' })], ['lib', 'absent'])], vocabulary, { packageId: 'consumer' })
  const problems = contentExistenceProblems(content, vocabulary)
  const location = target => problems.filter(problem => problem.target === target).map(({ object, path }) => ({ object, path }))
  assert.deepEqual(location('lib/gone'), [{ object: { kind: 'level', name: 'consumer/one' }, path: 'tasks[0].solution' }])
  assert.deepEqual(location('lib/no-override'), [{ object: { kind: 'lib/scene', name: 'lib/no-override', override: true }, path: '' }])
  assert.deepEqual(location('lib/missing'), [{ object: { kind: 'lib/scene', name: 'lib/no-override', override: true }, path: 'next' }])
  assert.deepEqual(location('absent'), [{ object: { kind: 'package', name: 'consumer' }, path: 'uses.absent' }])
  const [selection] = existenceProblems([layer('@game', [], [], [])].map(l => ({ ...l, config: { kernel: '^0.0.0', packages: { 'absent': '^1.0.0' } } })), schemas)
  assert.deepEqual(selection.object, { kind: 'package', name: '@game' })
  assert.equal(selection.path, 'packages.absent')
})

test('collection overrides retain authored locations after assembly shifts indices and expands sequences', () => {
  const owner = layer('lib', [object('level', 'one'), object('tag', 'levels', { kind: 'level', values: ['lib/one'] }), object('relation', 'route', { kind: 'order', of: 'level', edges: [] })])
  const consumer = layer('consumer', [], [
    object('tag', 'lib/levels', { kind: 'level', values: ['lib/gone'] }),
    object('relation', 'lib/route', { kind: 'order', of: 'level', sequence: ['lib/one', 'lib/absent'], remove: [{ from: 'lib/one', to: 'lib/removed' }] }),
  ], ['lib'])
  const problems = contentExistenceProblems(assembleLayers('consumer', [owner, consumer], schemas), schemas)
  for (const [target, kind, name, path] of [
    ['lib/gone', 'tag', 'lib/levels', 'values[0]'],
    ['lib/absent', 'relation', 'lib/route', 'sequence[1]'],
    ['lib/removed', 'relation', 'lib/route', 'remove[0].to'],
  ]) {
    const found = problems.filter(problem => problem.target === target)
    assert.equal(found.length, 1, target)
    assert.deepEqual(found[0].object, { kind, name, ...(kind === 'tag' && { member: 'level' }), override: true })
    assert.equal(found[0].path, path)
  }
})

test('distinct authored fields and pending assembled references remain checkable', () => {
  const content = assembleLayers('consumer', [layer('consumer', [object('level', 'one', {
    nested: [{ arbitrary: 'lib/gone' }, { arbitrary: 'lib/gone' }],
  })])], schemas)
  content.levels[0].nested.push({ arbitrary: 'lib/pending' })
  const problems = contentExistenceProblems(content, schemas)
  assert.deepEqual(problems.map(problem => problem.path), ['nested[0].arbitrary', 'nested[1].arbitrary', 'nested[2].arbitrary'])
  assert.ok(problems.every(problem => problem.object.kind === 'level' && problem.object.name === 'consumer/one'))
})


test('text overrides name the overridden public copy identity and custom kind failures locate the object itself', () => {
  const consumer = { ...layer('consumer', [object('absent/scene', 'consumer/one')], [], ['lib']),
    textOverrides: [{ namespace: 'lib', lang: 'en', entries: { missing: 'Missing' } }],
  }
  const problems = existenceProblems([consumer], schemas)
  const copy = problems.find(problem => problem.kind === 'i18n')
  assert.deepEqual(copy.object, { kind: 'i18n', name: 'lib/missing', override: true })
  assert.equal(copy.path, '')
  assert.equal(copy.at, 'consumer/overrides/lib/i18n/en.json.missing')
  const kind = problems.find(problem => problem.kind === 'kind')
  assert.deepEqual(kind.object, { kind: 'absent/scene', name: 'consumer/one' })
  assert.equal(kind.path, '')
})
