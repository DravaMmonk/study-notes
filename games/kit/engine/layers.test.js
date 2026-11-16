import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { S } from './schema.js'
import { defineVocabulary } from './vocabulary.js'
import { applyOverride, composeLayers, orderPackages, visibleOverrides } from './layers.js'
import { readContent, assembleLayers } from './content-node.js'
import { dependencyProblemsInProject } from './project-dependencies.js'
import { contentAssets, CONTENT_FILE } from '../app/content-assets.js'
import { pageContent } from '../app/page-content.js'
import { openGame } from './ops/workspace.js'
import { runChangeset, undo } from './ops/changeset.js'

const schemas = defineVocabulary({ domain: 'toy', version: 1, kinds: {}, game: S.obj({ title: S.opt(S.text()), chapters: S.opt(S.list(S.obj({ id: S.str(), levels: S.list(S.level()) }))) }), level: S.obj({ title: S.opt(S.text()), from: S.opt(S.level()), options: S.opt(S.map(S.any())) }) })
const layer = (id, uses = [], objects = [], overrides = []) => ({ id, config: { domain: 'toy', vocabulary: 1, uses }, objects, overrides, catalogs: {} })
const obj = (kind, name, value) => ({ kind, name, value })
const base = () => layer('base', [], [obj('level', 'a', { title: 'A', options: { x: 1, y: 2 } }), obj('level', 'b', { title: 'B' }), obj('tag', 'all', { kind: 'level', values: ['a'] }), obj('relation', 'path', { kind: 'requires', edges: [{ from: 'a', to: 'b' }] }), obj('layout', 'map', { of: '#all', rows: [['a']] })])
const game = (overrides = []) => ({ id: '@demo', config: { chapters: [{ id: 'one', levels: ['base/a', 'base/b'] }] }, objects: [], catalogs: {}, overrides })

test('dependencies are complete, direct, acyclic and deterministically ordered', () => {
  const a = base(), b = layer('b', ['base']), c = layer('c', ['b'])
  assert.deepEqual(orderPackages([c, b, a, layer('aa')]).map((p) => p.id), ['aa', 'base', 'b', 'c'])
  assert.throws(() => orderPackages([b]), /missing dependency base/)
  assert.throws(() => orderPackages([layer('a', ['b']), layer('b', ['a'])]), /circular/)
  assert.throws(() => orderPackages([a, a]), /duplicate/)
  b.objects = [obj('level', 'child', { from: 'base/a' })]
  assert.equal(composeLayers([a, b], schemas).registries.level['b/child'].from, 'base/a')
  c.objects = [obj('level', 'bad', { from: 'base/a' })]
  assert.throws(() => composeLayers([a, b, c], schemas), /undeclared dependency/)
  c.objects = [obj('tag', 'bad', { kind: 'level', values: ['base/a'] })]
  assert.throws(() => composeLayers([a, b, c], schemas), /undeclared dependency/)
})

test('whole replacements, recursive merge patches and additive collections retain provenance', () => {
  const b = layer('b', ['base'], [], [obj('level', 'base/a', { $merge: true, options: { x: null, z: 3 } }), obj('level', 'base/b', { title: 'Replaced' }), obj('tag', 'base/all', { values: ['base/b'], remove: ['base/a'] }), obj('relation', 'base/path', { remove: [{ from: 'base/a', to: 'base/b' }], sequence: ['base/b', 'base/a'] })])
  const c = layer('c', ['base', 'b'], [], [obj('tag', 'base/all', { replace: true, values: ['base/a'] })])
  const content = assembleLayers('demo', [base(), b, c, game()], schemas)
  assert.deepEqual(content.registries.level['base/a'].options, { y: 2, z: 3 })
  assert.equal(content.registries.level['base/b'].title, 'Replaced')
  assert.deepEqual(content.tags['base/all'].values, ['base/a'])
  assert.deepEqual(content.relations['base/path'].edges, [{ from: 'base/b', to: 'base/a' }])
  assert.deepEqual(content.sources.tag['base/all'], { declaration: 'base', overrides: ['b', 'c'] })
  const audit = visibleOverrides(content, 'b')
  assert.equal(audit.length, 4)
  assert.deepEqual(audit[0].before.options, { x: 1, y: 2 })
  assert.deepEqual(audit[0].after.options, { y: 2, z: 3 })
  audit[0].after.options.z = 900
  assert.equal(visibleOverrides(content, 'b')[0].after.options.z, 3)
  assert.equal(visibleOverrides(content, 'base').length, 0)
  assert.equal(visibleOverrides(content).length, 5)
  assert.deepEqual(applyOverride('relation', { kind: 'order', sequence: ['a', 'b'] }, { replace: true, edges: [] }), { kind: 'order', edges: [] })
})

test('independent overrides conflict; an explicit dependency resolves the ambiguity', () => {
  const patch = [obj('level', 'base/a', { title: 'New' })]
  const b = layer('b', ['base'], [], patch), c = layer('c', ['base'], [], patch)
  assert.throws(() => composeLayers([base(), b, c], schemas), /conflicting overrides/)
  c.config.uses.push('b')
  assert.equal(composeLayers([base(), b, c], schemas).sources.level['base/a'].overrides.length, 2)
  c.config.uses = ['b']
  assert.throws(() => composeLayers([base(), b, c], schemas), /undeclared dependency/)
})

test('game overrides are limited to layouts and level relations', () => {
  for (const kind of ['level', 'piece', 'setting', 'entry', 'tag']) {
    const a = base()
    if (!a.objects.some((o) => o.kind === kind)) a.objects.push(obj(kind, 'a', {}))
    assert.throws(() => composeLayers([a, game([obj(kind, kind === 'tag' ? 'base/all' : 'base/a', { $merge: true })])], schemas), /games cannot override/)
  }
  assert.doesNotThrow(() => composeLayers([base(), game([obj('layout', 'base/map', { $merge: true, rows: [['base/b', 'base/a']] }), obj('relation', 'base/path', { replace: true, edges: [] })])], schemas))
  const a = base(); a.objects.push(obj('piece', 'p', {}), obj('relation', 'items', { kind: 'order', of: 'item', edges: [{ from: 'p', to: 'p' }] }))
  assert.throws(() => composeLayers([a, game([obj('relation', 'base/items', { replace: true, edges: [] })])], schemas), /games cannot override/)
  assert.throws(() => composeLayers([base(), game([obj('layout', 'base/missing', {})])], schemas), /unknown layout/)
})

test('wording merges by key, adds translations and records before and after values', () => {
  const a = base(); a.catalogs = { en: { title: 'Original', other: 'Kept' } }; a.objects[0].value.title = '@title'
  const b = layer('b', ['base']); b.textOverrides = [{ namespace: 'base', lang: 'en', entries: { title: 'Package' } }]
  const g = game(); g.textOverrides = [{ namespace: 'base', lang: 'en', entries: { title: 'Game' } }, { namespace: 'base', lang: 'zh', entries: { title: '游戏' } }]
  const content = assembleLayers('demo', [a, b, g], schemas)
  assert.equal(content.levels[0].title.en, 'Game')
  assert.equal(content.levels[0].title.zh, '游戏')
  assert.deepEqual(visibleOverrides(content, 'b').map((e) => [e.before, e.after]), [['Original', 'Package']])
  assert.equal(composeLayers([a, b, g], schemas).catalogs.en['base/other'], 'Kept')
  b.config.uses = []
  assert.throws(() => composeLayers([a, b], schemas), /undeclared dependency/)
})

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'layers-'))
  const put = (file, data) => { const path = resolve(root, file); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`) }
  put('games/demo/game.json', { packages: ['extra', 'base'], title: 'Demo' }); put('games/demo/course.json', {})
  put('packages/base/package.json', { domain: 'toy', vocabulary: 1 }); put('packages/base/levels/a.json', { title: '@title', options: { x: 1 } }); put('packages/base/i18n/en.json', { title: 'Original' })
  put('packages/extra/package.json', { domain: 'toy', vocabulary: 1, uses: ['base'] }); put('packages/extra/levels/b.json', { from: 'base/a' })
  return { root, put }
}

test('disk reader and operations share layer composition, write ownership and inverses', async () => {
  const { root, put } = fixture()
  const domain = { vocabulary: schemas }
  let ws = openGame('demo', root, { vocabulary: schemas, layer: 'extra' })
  let result = await runChangeset(ws, { ops: [{ op: 'override.put', layer: 'extra', kind: 'level', name: 'base/a', data: { options: { x: 9 } }, merge: true }] }, { check: false, write: true, domain })
  assert.equal(result.ok, true, result.problems.join('\n'))
  const path = resolve(root, 'packages/extra/overrides/base/levels/a.json')
  assert.deepEqual(JSON.parse(readFileSync(path)), { $merge: true, options: { x: 9 } })
  assert.deepEqual(JSON.parse(readFileSync(resolve(root, 'packages/base/levels/a.json'))).options, { x: 1 })
  assert.equal(readContent('demo', root, { vocabulary: schemas }).levels.find((l) => l.id === 'base/a').options.x, 9)
  result = await undo(openGame('demo', root, { vocabulary: schemas }), { check: false, write: true, domain })
  assert.equal(result.ok, true, result.problems.join('\n'))
  ws = openGame('demo', root, { vocabulary: schemas, layer: '@demo' })
  result = await runChangeset(ws, { ops: [{ op: 'override.put', layer: '@demo', kind: 'i18n', name: 'base/en', data: { title: 'Game' } }] }, { check: false, write: true, domain })
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.equal(readContent('demo', root, { vocabulary: schemas }).levels.find((l) => l.id === 'base/a').title.en, 'Game')
  result = await runChangeset(ws, { ops: [{ op: 'override.put', layer: '@demo', kind: 'level', name: 'base/a', merge: true }] }, { check: false, domain })
  assert.equal(result.ok, false)
  assert.match(result.problems.join('\n'), /games cannot override/)
  put('games/demo/game.json', { packages: ['extra'] })
  assert.throws(() => readContent('demo', root, { vocabulary: schemas }), /missing dependency/)
})


test('cross-package wording references retain ownership and override links resolve in the author namespace', async () => {
  const { root, put } = fixture()
  put('packages/extra/levels/b.json', { title: '@base/title', from: 'base/a' })
  put('packages/extra/overrides/base/i18n/en.json', { title: 'See <level-ref to="b"></level-ref>' })
  const content = readContent('demo', root, { vocabulary: schemas })
  assert.equal(content.levels.find((l) => l.id === 'base/a').title.en, 'See <level-ref to="extra/b"></level-ref>')
  const ws = openGame('demo', root, { vocabulary: schemas, layer: 'extra' })
  assert.equal(ws.content().levels.find((l) => l.id === 'extra/b').title.en, content.levels[0].title.en)
  assert.equal(ws.changes().some((c) => c.file === 'packages/extra/i18n/en.json'), false)
  put('packages/extra/package.json', { domain: 'toy', vocabulary: 1, uses: [] })
  assert.throws(() => readContent('demo', root, { vocabulary: schemas }), /undeclared dependency/)
})


test('multi-package sibling courses validate shared levels without rejecting their other packages', () => {
  const { root, put } = fixture()
  put('games/peer/game.json', { packages: ['base', 'third'] })
  put('games/peer/course.json', { chapters: [{ id: 'one', levels: ['base/a', '#third/all'] }] })
  put('packages/third/package.json', { domain: 'toy', vocabulary: 1 })
  put('packages/third/levels/c.json', {})
  put('packages/third/tags/all.json', { kind: 'level', values: ['c'] })
  const content = readContent('demo', root, { vocabulary: schemas })
  assert.deepEqual(dependencyProblemsInProject(content, root), [])
  assert.deepEqual(dependencyProblemsInProject({ ...content, levels: content.levels.filter((l) => l.id !== 'base/a') }, root), [{ at: 'games/peer/course.json', says: 'the course places the level base/a, which is missing from its package' }])
})

test('the published frontend restores composed multi-package registries', async () => {
  const a = base(); a.catalogs = { en: { title: 'Original' } }; a.objects[0].value.title = '@title'
  const b = layer('extra', ['base'], [obj('level', 'c', { from: 'base/a' })], [obj('level', 'base/a', { $merge: true, options: { x: 9 } })])
  const content = assembleLayers('demo', [a, b, game()], schemas)
  const assets = contentAssets(content)
  const restored = await pageContent(JSON.parse(assets.get(CONTENT_FILE)), 'https://example.test/', (url) => new Response(assets.get(url.pathname.slice(1))), schemas)
  assert.deepEqual(restored.levels, content.levels)
  assert.deepEqual(restored.tags, content.tags)
  assert.deepEqual(restored.relations, content.relations)
  assert.deepEqual(restored.layouts, content.layouts)
})


test('author writes refuse changed dependency files while holding every selected layer lock', async () => {
  for (const file of ['packages/base/levels/a.json', 'packages/base/levels/new.json']) {
    const { root, put } = fixture()
    const ws = openGame('demo', root, { vocabulary: schemas, layer: 'extra' })
    put(file, { title: 'Changed' })
    const result = await runChangeset(ws, { ops: [{ op: 'override.put', layer: 'extra', kind: 'level', name: 'base/a', merge: true, data: { options: { x: 2 } } }] }, { check: false, write: true, domain: { vocabulary: schemas } })
    assert.equal(result.ok, false)
    assert.match(result.problems.join('\n'), /dependency changed on disk/)
  }
})
