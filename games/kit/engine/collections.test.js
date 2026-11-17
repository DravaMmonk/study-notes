import { levelLabels } from '../course.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S, find } from './schema.js'
import { mergeFields, collectionProblems } from './collections.js'
import { referenceResolver, expandReferences, orderedMembers } from './objects.js'
import { collectReferences } from './existence.js'
import { composeLayers } from './layers.js'
import { layerProblems } from './kind-policy.js'
import { CHAPTER } from './course-schema.js'
import { collectionFieldsBaseline } from './baseline-value.js'

const member = S.str({ reference: 'entry' })
const schema = S.obj({ values: S.set(member), ordered: S.list(member), edges: S.edges(member) })
const registry = { entry: { 'p/a': {}, 'p/b': {}, 'p/c': {} }, tag: { 'entry:p/pair': { kind: 'entry', values: ['p/a', 'p/b'] } } }
const expand = referenceResolver(registry)

test('set and edge patches share field-driven replacement, addition and removal', () => {
  const audit = {}
  const base = mergeFields(undefined, { values: ['p/a'], edges: [{ from: 'p/a', to: 'p/b', required: true }] }, schema, audit, 'p')
  const next = mergeFields(base, { values: { add: ['p/b'], remove: ['p/a'] }, edges: { remove: [{ from: 'p/a', to: 'p/b' }], add: [{ from: 'p/b', to: 'p/c' }] } }, schema, audit, 'q')
  assert.deepEqual(next.values, ['p/b'])
  assert.deepEqual(next.edges, [{ from: 'p/b', to: 'p/c' }])
  assert.deepEqual(audit.values, { 'p/b': ['q'] })
  assert.deepEqual(audit.edges, { '["p/b","p/c",null]': ['q'] })
  assert.deepEqual(mergeFields(next, { values: [] }, schema).values, [])
})

test('list insertion retains unrelated fields and records exact contributors', () => {
  const audit = {}
  const base = mergeFields(undefined, { ordered: ['p/a', 'p/c'], values: [] }, schema, audit, 'p')
  const next = mergeFields(base, { ordered: { insert: [{ before: 'p/c', values: ['p/b'] }] } }, schema, audit, 'q')
  assert.deepEqual(next.ordered, ['p/a', 'p/b', 'p/c'])
  assert.deepEqual(audit.ordered, { 'p/a': ['p'], 'p/b': ['q'], 'p/c': ['p'] })
  assert.deepEqual(mergeFields(next, { ordered: { insert: [{ after: 'p/c', values: ['p/d'] }] } }, schema).ordered, ['p/a', 'p/b', 'p/c', 'p/d'])
  assert.throws(() => mergeFields(base, { ordered: { insert: [{ before: 'missing', values: ['p/b'] }] } }, schema), /anchor/)
  assert.throws(() => mergeFields(base, { values: { insert: [] } }, schema), /unknown collection patch/)
  assert.throws(() => mergeFields(base, { ordered: { insert: [{ before: 'p/a', after: 'p/c', values: [] }] } }, schema), /exactly one/)
})

test('identified nested lists retain provenance through reordering and prune removed members', () => {
  const nested = S.obj({ menus: S.list(S.obj({ id: S.str(), title: S.text(), values: S.list(member) })) })
  const audit = {}
  const base = mergeFields(undefined, { menus: [{ id: 'main', title: 'Main', values: ['p/a'] }] }, nested, audit, 'p')
  const next = mergeFields(base, { menus: { add: [{ id: 'main', values: { add: ['p/b'] } }] } }, nested, audit, 'q')
  assert.deepEqual(next.menus, [{ id: 'main', title: 'Main', values: ['p/a', 'p/b'] }])
  assert.deepEqual(audit['menus[main].values'], { 'p/a': ['p'], 'p/b': ['q'] })
  mergeFields(next, { menus: [] }, nested, audit, 'r')
  assert.equal(audit['menus[main].values'], undefined)
  assert.deepEqual(audit.menus, {})
})

test('collection checks detect repeated members, expanded overlaps, cycles and concrete chapter levels', () => {
  assert.match(collectionProblems({ values: ['p/a', 'p/a'] }, schema, expand)[0].says, /duplicate/)
  assert.match(collectionProblems({ ordered: ['#p/pair', 'p/a'] }, schema, expand)[0].says, /duplicate/)
  assert.match(collectionProblems({ edges: [{ from: '#p/pair', to: 'p/a' }] }, schema, expand)[0].says, /circular/)
  assert.match(collectionProblems({ levels: ['#p/pair'] }, CHAPTER, expand)[0].says, /without tags/)
})

test('edges expand tag endpoints for arbitrary object fields', () => {
  assert.deepEqual(expandReferences([{ from: '#p/pair', to: 'p/c' }], schema.fields.edges, expand), [{ from: 'p/a', to: 'p/c' }, { from: 'p/b', to: 'p/c' }])
})

test('one collector locates added, removed and inserted references inside patches', () => {
  const refs = []
  collectReferences({ ordered: { insert: [{ after: 'p/a', values: ['p/b'] }], remove: ['p/c'] }, edges: { add: [{ from: 'p/a', to: 'p/b' }] } }, schema, {}, (kind, target, path) => refs.push({ kind, target, path }), '')
  assert.deepEqual(refs.map(ref => ref.path), ['ordered.insert[0].after', 'ordered.insert[0].values[0]', 'ordered.remove[0]', 'edges.add[0].from', 'edges.add[0].to'])
  assert.ok(refs.every(ref => ref.kind === 'entry'))
})

test('schema text traversal reaches nested collection patches', () => {
  const nested = S.obj({ menus: S.list(S.obj({ id: S.str(), title: S.text(), values: S.list(member) })) })
  const found = find(nested, { menus: { add: [{ id: 'main', title: '@title', values: [] }] } }, 'text')
  assert.deepEqual(found.map(field => field.path), [['menus', 'add', 0, 'title']])
})

test('independent typed set contributions union through patches and audit every author', () => {
  const layer = (id, uses, objects = [], overrides = []) => ({ id, config: { version: '0.0.0', kernel: '^0.0.0', uses: Object.fromEntries(uses.map(id => [id, '^0.0.0'])) }, objects, overrides })
  const base = layer('p', [], [{ kind: 'tag', name: 'all', value: { kind: 'entry', values: ['a'] } }])
  const patch = id => layer(id, ['p'], [], [{ kind: 'tag', name: 'p/all', value: { kind: 'entry', values: { add: ['p/a', 'p/b'] } } }])
  const result = composeLayers([base, patch('q'), patch('r')], { game: S.obj({}), kinds: {} })
  assert.deepEqual(result.registries.tag['entry:p/all'].values, ['p/a', 'p/b'])
  assert.deepEqual(result.sources.tag['entry:p/all'].collections.values, { 'p/a': ['p', 'q', 'r'], 'p/b': ['q', 'r'] })
})

test('declaration and override permissions apply to package-defined game types', () => {
  const vocabulary = { objectKinds: { 'p/settings': { declares: 'game', overrides: { game: ['title'] } } } }
  const shape = S.obj({ title: S.text(), size: S.int() })
  assert.equal(layerProblems('p', 'p/settings', 'p/one', {}, shape, vocabulary)[0].rule, 'layer')
  assert.deepEqual(layerProblems('@demo', 'p/settings', '@demo/one', {}, shape, vocabulary), [])
  assert.deepEqual(layerProblems('@demo', 'p/settings', '@demo/one', { title: 'New' }, shape, vocabulary, true), [])
  assert.match(layerProblems('@demo', 'p/settings', '@demo/one', { size: 2 }, shape, vocabulary, true)[0].says, /cannot override/)
  assert.equal(layerProblems('@demo', 'relation', 'p/path', { edges: [] }, {}, {}, true, { kind: 'requires' }).length, 0)
  assert.equal(layerProblems('@demo', 'relation', 'p/path', { edges: [] }, {}, {}, true, { kind: 'replaces' }).length, 1)
})

test('Studio member order follows prerequisites then object names', () => {
  assert.deepEqual(orderedMembers({ relationEdges: { requires: [{ from: 'p/c', to: 'p/a' }] } }, ['p/a', 'p/b', 'p/c']), ['p/b', 'p/c', 'p/a'])
  assert.deepEqual(orderedMembers({ relationEdges: { requires: [{ from: 'p/z', to: 'p/middle' }, { from: 'p/middle', to: 'p/a' }] } }, ['p/a', 'p/z']), ['p/z', 'p/a'])
})

test('baseline normalization retains edges, ordered items and chapter numbering changes', () => {
  const input = { structure: { relations: { order: [{ from: 'a', to: 'b' }], requires: [{ from: 'a', to: 'b' }] }, eras: [{ id: '@demo/1', number: 1 }, { id: '@demo/named', number: 3 }] }, records: [] }
  const normalized = collectionFieldsBaseline(input)
  assert.deepEqual(normalized.structure.relations, { requires: [{ from: 'a', to: 'b' }] })
  assert.deepEqual(normalized.structure.eras, [{ id: '1' }, { id: 'named', number: 3 }])
  assert.ok(input.structure.relations.order)
})

test('chapter object identities preserve explicitly authored numeric level labels', () => {
  assert.deepEqual([...levelLabels([{ id: '@demo/1', number: 1, levels: [{ id: 'p/a' }] }])], [['p/a', '1-1']])
})

test('game-layer declared objects persist through public authoring operations and source paths', async () => {
  const { proofsRoot, lockFixture } = await import('./ops/fixture.js')
  const { mkdirSync, writeFileSync, readFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  const { openGame } = await import('./ops/workspace.js')
  const { runChangeset } = await import('./ops/changeset.js')
  const { root, id } = proofsRoot()
  mkdirSync(join(root, 'packages/provider/kinds'), { recursive: true })
  writeFileSync(join(root, 'packages/provider/package.json'), JSON.stringify({ version: '0.0.0', kernel: '^0.0.0', uses: {} }))
  writeFileSync(join(root, 'packages/provider/kinds/settings.json'), JSON.stringify({ folder: 'settings', declares: 'game', overrides: { game: ['*'] }, schema: S.obj({ title: S.text() }) }))
  lockFixture(root)
  const workspace = openGame(id, root)
  const result = await runChangeset(workspace, { why: 'Exercise game kind creation after package selection', ops: [
    { op: 'game.package.add', package: 'provider', range: '^0.0.0' },
    { op: 'object.put', kind: 'provider/settings', name: `@${id}/main`, data: { title: { en: 'Settings' } } },
    { op: 'chapter.set', chapter: `@${id}/ground`, path: 'levels', value: [`${id}/given`] },
    { op: 'text.set', chapter: `@${id}/ground`, path: 'chapter.title', lang: 'en', value: 'Foundation' },
  ] }, { check: false, write: true })
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.deepEqual(result.content.sources.game[`@${id}/config`].collections.chapters[`@${id}/ground`], [`@${id}`])
  assert.ok(result.files.includes(`games/${id}/settings/main.json`))
  assert.ok(result.files.includes(`games/${id}/chapters/ground.json`))
  assert.equal(openGame(id, root).content().registries['provider/settings'][`@${id}/main`].title.en, 'Settings')
  assert.deepEqual(JSON.parse(readFileSync(join(root, `games/${id}/chapters/ground.json`))).levels, [`${id}/given`])
})

test('independent list and edge patches compose by field type across arbitrary kinds', () => {
  const vocabulary = { kinds: {}, game: S.obj({}), objectKinds: { 'p/graph': { declares: 'package', overrides: { package: ['*'] }, schema } } }
  const base = { id: 'p', config: { version: '0.0.0', kernel: '^0.0.0', uses: {} }, objects: [{ kind: 'p/graph', name: 'main', value: { values: [], ordered: ['p/a'], edges: [] } }] }
  const layer = (id, target) => ({ id, config: { version: '0.0.0', kernel: '^0.0.0', uses: { p: '^0.0.0' } }, objects: [], overrides: [{ kind: 'p/graph', name: 'p/main', value: { ordered: { add: [target] }, edges: { add: [{ from: 'p/a', to: target }] } } }] })
  const left = layer('q', 'p/b'), right = layer('r', 'p/c')
  const content = composeLayers([base, left, right], vocabulary)
  assert.deepEqual(content.registries['p/graph']['p/main'].ordered, ['p/a', 'p/b', 'p/c'])
  assert.deepEqual(Object.values(content.sources['p/graph']['p/main'].collections.edges), [['q'], ['r']])
  right.overrides[0].value.ordered = ['p/c']
  assert.throws(() => composeLayers([base, left, right], vocabulary), /conflicting overrides/)
})

test('encyclopedia section order and each section member list remain explicit', async () => {
  const { encyclopedia } = await import('./encyclopedia.js')
  const entries = ['a', 'b', 'c'].map(id => ({ id: `p/${id}`, title: id }))
  const sections = { 'p/first': { title: 'First', values: ['p/b', 'p/a'] }, 'p/second': { title: 'Second', values: ['p/c'] } }
  const result = encyclopedia(entries, sections, value => [value], ['p/second', 'p/first'])
  assert.deepEqual(result.groups.map(group => [group.id, group.values]), [['p/second', ['p/c']], ['p/first', ['p/b', 'p/a']]])
})

test('external edge sources do not suppress unrelated object reference fields', () => {
  const shape = S.obj({ edges: S.edges(member), ordinary: S.obj({ game: S.str(), from: member }) })
  const refs = []
  collectReferences({ edges: [{ game: 'other', from: 'outside/source', to: 'p/a' }], ordinary: { game: 'metadata', from: 'missing/object' } }, shape, {}, (kind, target) => refs.push([kind, target]), '')
  assert.deepEqual(refs, [['entry', 'p/a'], ['entry', 'missing/object']])
})
