import { lockFixture } from './ops/fixture.js'
import { existenceProblems } from './existence.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { S } from './schema.js'
import { defineVocabulary } from './vocabulary.js'
import { composeLayers, orderPackages, visibleOverrides } from './layers.js'
import { readContent, readPackage, assembleLayers } from './resolver.js'
import { dependencyProblemsInProject } from './project-dependencies.js'
import { contentAssets, CONTENT_FILE } from '../app/content-assets.js'
import { pageContent } from '../app/page-content.js'
import { openGame, openPackage } from './ops/workspace.js'
import { runChangeset, undo } from './ops/changeset.js'

const schemas = defineVocabulary({ module: 'toy', version: 1, kinds: {}, game: S.obj({ title: S.opt(S.text()), chapters: S.opt(S.list(S.str({ reference: 'chapter' }))) }), level: S.obj({ title: S.opt(S.text()), from: S.opt(S.level()), options: S.opt(S.map(S.any())) }) })
const layer = (id, uses = [], objects = [], overrides = []) => ({ id, config: { version: '1.0.0', kernel: '^0.0.0', uses: Object.fromEntries(uses.map(id => [id, '^1.0.0'])) }, objects, overrides, catalogs: {} })
const obj = (kind, name, value) => ({ kind, name, value })
const base = () => layer('base', [], [obj('level', 'a', { title: 'A', options: { x: 1, y: 2 } }), obj('level', 'b', { title: 'B' }), obj('tag', 'all', { kind: 'level', values: ['a'] }), obj('relation', 'path', { kind: 'requires', edges: [{ from: 'a', to: 'b' }] }), obj('section', 'map', { title: 'Map', values: [] })])
const problems = layers => existenceProblems(composeLayers(layers, schemas).qualifiedLayers, schemas).map(problem => problem.says).join('\n')
const game = (overrides = []) => ({ id: '@demo', config: { chapters: ['@demo/one'] }, objects: [obj('chapter', 'one', { levels: ['base/a', 'base/b'] })], catalogs: {}, overrides })

test('dependencies are complete, direct, acyclic and deterministically ordered', () => {
  const a = base(), b = layer('b', ['base']), c = layer('c', ['b'])
  assert.deepEqual(orderPackages([c, b, a, layer('aa')]).map((p) => p.id), ['aa', 'base', 'b', 'c'])
  assert.match(problems([b]), /missing target package base/)
  assert.throws(() => orderPackages([layer('a', ['b']), layer('b', ['a'])]), /circular/)
  assert.throws(() => orderPackages([a, a]), /duplicate/)
  b.objects = [obj('level', 'child', { from: 'base/a' })]
  assert.equal(composeLayers([a, b], schemas).registries.level['b/child'].from, 'base/a')
  c.objects = [obj('level', 'bad', { from: 'base/a' })]
  assert.match(problems([a, b, c]), /undeclared dependency/)
  c.objects = [obj('tag', 'bad', { kind: 'level', values: ['base/a'] })]
  assert.match(problems([a, b, c]), /undeclared dependency/)
})

test('whole replacements, recursive merge patches and additive collections retain provenance', () => {
  const b = layer('b', ['base'], [], [obj('level', 'base/a', { options: { x: null, z: 3 } }), obj('level', 'base/b', { title: 'Replaced' }), obj('tag', 'base/all', { kind: 'level', values: { add: ['base/b'], remove: ['base/a'] } }), obj('relation', 'base/path', { edges: { remove: [{ from: 'base/a', to: 'base/b' }], add: [{ from: 'base/b', to: 'base/a' }] } })])
  const c = layer('c', ['base', 'b'], [], [obj('tag', 'base/all', { kind: 'level', values: ['base/a'] })])
  const content = assembleLayers('demo', [base(), b, c, game()], schemas)
  assert.deepEqual(content.registries.level['base/a'].options, { x: null, y: 2, z: 3 })
  assert.equal(content.registries.level['base/b'].title, 'Replaced')
  assert.deepEqual(content.tags['level:base/all'].values, ['base/a'])
  assert.deepEqual(content.relations['base/path'].edges, [{ from: 'base/b', to: 'base/a' }])
  assert.deepEqual(content.sources.tag['level:base/all'], { declaration: 'base', overrides: ['b', 'c'], collections: { values: { 'base/a': ['c'] } } })
  const audit = visibleOverrides(content, 'b')
  assert.equal(audit.length, 4)
  assert.deepEqual(audit[0].before.options, { x: 1, y: 2 })
  assert.deepEqual(audit[0].after.options, { x: null, y: 2, z: 3 })
  audit[0].after.options.z = 900
  assert.equal(visibleOverrides(content, 'b')[0].after.options.z, 3)
  assert.equal(visibleOverrides(content, 'base').length, 0)
  assert.equal(visibleOverrides(content).length, 5)
})

test('independent overrides conflict; an explicit dependency resolves the ambiguity', () => {
  const patch = [obj('level', 'base/a', { title: 'New' })]
  const b = layer('b', ['base'], [], patch), c = layer('c', ['base'], [], patch)
  assert.throws(() => composeLayers([base(), b, c], schemas), /conflicting overrides/)
  c.config.uses['b'] = '^1.0.0'
  assert.equal(composeLayers([base(), b, c], schemas).sources.level['base/a'].overrides.length, 2)
  c.config.uses = { 'b': '^1.0.0' }
  assert.match(problems([base(), b, c]), /undeclared dependency/)
})

test('game overrides follow declared field policy', () => {
  const denied = composeLayers([base(), game([obj('level', 'base/a', { options: { x: 5 } })])], schemas)
  assert.ok(denied.policyProblems.some(problem => /game cannot override/.test(problem.says)))
  const allowed = composeLayers([base(), game([obj('relation', 'base/path', { edges: [] })])], schemas)
  assert.deepEqual(allowed.policyProblems, [])
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
  b.config.uses = {}
  assert.match(problems([a, b]), /undeclared dependency/)
})

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'layers-'))
  const put = (file, data) => { if (file.endsWith('/course.json') && data.chapters) { const chapters = data.chapters; const gameFile = file.replace('course.json', 'game.json'); const config = JSON.parse(readFileSync(resolve(root, gameFile))); put(gameFile, { ...config, chapters: chapters.map(chapter => '@' + file.split('/')[1] + '/' + chapter.id) }); for (const { id, ...chapter } of chapters) put(file.replace('course.json', 'chapters/' + id + '.json'), chapter); const { chapters: _, ...rest } = data; data = rest } const path = resolve(root, file); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`) }
  put('games/demo/game.json', { kernel: '^0.0.0', packages: { 'extra': '^1.0.0', 'base': '^1.0.0' }, title: 'Demo' }); put('games/demo/course.json', {})
  put('packages/base/package.json', { version: '1.0.0', kernel: '^0.0.0', uses: {} }); put('packages/base/levels/a.json', { title: '@title', options: { x: 1 } }); put('packages/base/i18n/en.json', { title: 'Original' })
  put('packages/extra/package.json', { version: '1.0.0', kernel: '^0.0.0', uses: { 'base': '^1.0.0' } }); put('packages/extra/levels/b.json', { from: 'base/a' })
  lockFixture(root)
  return { root, put }
}

test('disk reader and operations share layer composition, write ownership and inverses', async () => {
  const { root, put } = fixture()
  const domain = { vocabulary: schemas }
  let ws = openGame('demo', root, { vocabulary: schemas, layer: 'extra' })
  let result = await runChangeset(ws, { ops: [{ op: 'override.put', layer: 'extra', kind: 'level', name: 'base/a', data: { options: { x: 9 } } }] }, { check: false, write: true, domain })
  assert.equal(result.ok, true, result.problems.join('\n'))
  const path = resolve(root, 'packages/extra/overrides/base/levels/a.json')
  assert.deepEqual(JSON.parse(readFileSync(path)), { options: { x: 9 } })
  assert.deepEqual(JSON.parse(readFileSync(resolve(root, 'packages/base/levels/a.json'))).options, { x: 1 })
  assert.equal(readContent('demo', root, { vocabulary: schemas }).levels.find((l) => l.id === 'base/a').options.x, 9)
  result = await undo(openGame('demo', root, { vocabulary: schemas, layer: 'extra' }), { check: false, write: true, domain })
  assert.equal(result.ok, true, result.problems.join('\n'))
  ws = openGame('demo', root, { vocabulary: schemas, layer: '@demo' })
  result = await runChangeset(ws, { ops: [{ op: 'override.put', layer: '@demo', kind: 'i18n', name: 'base/en', data: { title: 'Game' } }] }, { check: false, write: true, domain })
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.equal(readContent('demo', root, { vocabulary: schemas }).levels.find((l) => l.id === 'base/a').title.en, 'Game')
  result = await runChangeset(ws, { ops: [{ op: 'override.put', layer: '@demo', kind: 'level', name: 'base/a' }] }, { check: false, domain })
  assert.equal(result.ok, false)
  assert.match(result.problems.join('\n'), /game cannot override/)
  put('games/demo/game.json', { kernel: '^0.0.0', packages: { 'extra': '^1.0.0' } })
  assert.match(readContent('demo', root, { vocabulary: schemas }).objectProblems.map(p => p.says).join('\n'), /missing target package/)
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
  put('packages/extra/package.json', { version: '1.0.0', kernel: '^0.0.0', uses: {  } })
  assert.match(readContent('demo', root, { vocabulary: schemas }).objectProblems.map(p => p.says).join('\n'), /undeclared dependency/)
})


test('multi-package sibling courses validate shared levels without rejecting their other packages', () => {
  const { root, put } = fixture()
  put('games/peer/game.json', { kernel: '^0.0.0', packages: { 'base': '^1.0.0', 'third': '^1.0.0' } })
  put('games/peer/course.json', { chapters: [{ id: 'one', levels: ['base/a', 'third/c'] }] })
  put('packages/third/package.json', { version: '1.0.0', kernel: '^0.0.0', uses: {} })
  put('packages/third/levels/c.json', {})
  put('packages/third/tags/level/all.json', { values: ['c'] })
  const content = readContent('demo', root, { vocabulary: schemas })
  assert.deepEqual(dependencyProblemsInProject(content, root), [])
  const problems = dependencyProblemsInProject({ ...content, levels: content.levels.filter((l) => l.id !== 'base/a') }, root)
  assert.ok(problems.some(problem => problem.rule === 'exists' && problem.layer === '@peer' && problem.target === 'base/a'))
})

test('the published frontend restores composed multi-package registries', async () => {
  const a = base(); a.catalogs = { en: { title: 'Original' } }; a.objects[0].value.title = '@title'
  const b = layer('extra', ['base'], [obj('level', 'c', { from: 'base/a' })], [obj('level', 'base/a', { options: { x: 9 } })])
  const content = assembleLayers('demo', [a, b, game()], schemas)
  const assets = contentAssets(content)
  const restored = await pageContent(JSON.parse(assets.get(CONTENT_FILE)), 'https://example.test/', (url) => new Response(assets.get(url.pathname.slice(1))), schemas)
  assert.deepEqual(restored.levels, content.levels)
  assert.deepEqual(restored.tags, content.tags)
  assert.deepEqual(restored.relations, content.relations)
  assert.deepEqual(restored.sections, content.sections)
})


test('author writes refuse changed dependency files while holding every selected layer lock', async () => {
  for (const file of ['packages/base/levels/a.json', 'packages/base/levels/new.json']) {
    const { root, put } = fixture()
    const ws = openGame('demo', root, { vocabulary: schemas, layer: 'extra' })
    put(file, { title: 'Changed' })
    const result = await runChangeset(ws, { ops: [{ op: 'override.put', layer: 'extra', kind: 'level', name: 'base/a', data: { options: { x: 2 } } }] }, { check: false, write: true, domain: { vocabulary: schemas } })
    assert.equal(result.ok, false)
    assert.match(result.problems.join('\n'), /dependency changed on disk/)
  }
})

test('entry files, typed tag paths, ordering and overrides round trip through authoring and publishing', async () => {
  const { root, put } = fixture()
  put('packages/base/entries/z.json', { title: '@entry-z', body: [], see: ['a'] })
  put('packages/base/entries/a.json', { title: 'A', body: [] })
  put('packages/base/entries/c.json', { title: 'C', body: [] })
  put('packages/base/tags/entry/first.json', { title: '@entry-group', values: ['z'] })
  put('packages/base/sections/first.json', { title: 'First', values: ['z', 'c'] })
  put('packages/base/sections/second.json', { title: 'Second', values: ['#second'] })
  put('packages/base/tags/entry/second.json', { title: 'Second', values: ['a'] })
  put('packages/base/i18n/en.json', { title: 'Original', 'entry-z': 'Z', 'entry-group': 'First' })
  put('packages/extra/overrides/base/tags/entry/first.json', { values: { add: ['base/c'] } })
  put('packages/extra/overrides/base/entries/z.json', { body: ['Changed'] })
  const content = readContent('demo', root, { vocabulary: schemas })
  assert.deepEqual(content.glossary.groups.map((g) => g.id), ['base/first', 'base/second'])
  assert.deepEqual(content.glossary.entries.map((e) => e.id), ['base/a', 'base/c', 'base/z'])
  assert.deepEqual(content.glossary.groups[0].values, ['base/z', 'base/c'])
  assert.deepEqual(content.registries.entry['base/z'].body, ['Changed'])
  assert.equal(content.registries.entry['base/z'].group, undefined)
  assert.deepEqual(content.sources.entry['base/z'], { declaration: 'base', overrides: ['extra'], collections: { see: { 'base/a': ['base'] } } })
  lockFixture(root)
  const assets = contentAssets(readContent('demo', root, { vocabulary: schemas }))
  const restored = await pageContent(JSON.parse(assets.get(CONTENT_FILE)), 'https://example.test/', async (url) => ({ ok: true, json: async () => JSON.parse(assets.get(url.pathname.slice(1))) }), schemas)
  assert.deepEqual(restored.glossary, content.glossary)
  const domain = { vocabulary: schemas }
  const ws = openGame('demo', root, { vocabulary: schemas, layer: 'extra' })
  const result = await runChangeset(ws, { ops: [{ op: 'override.put', layer: 'extra', kind: 'tag', member: 'entry', name: 'base/second', data: { values: ['base/a'] } }] }, { check: false, write: true, domain })
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.deepEqual(JSON.parse(readFileSync(resolve(root, 'packages/extra/overrides/base/tags/entry/second.json'))), { values: ['base/a'] })
  assert.ok(result.files.every((file) => file.startsWith('packages/extra/')))
  assert.deepEqual(openPackage('extra', root, { vocabulary: schemas }).content().glossary, readPackage('extra', root, { vocabulary: schemas }).glossary)
  assert.equal((await undo(openGame('demo', root, { vocabulary: schemas, layer: 'extra' }), { check: false, write: true, domain })).ok, true)
  const own = openGame('demo', root, { vocabulary: schemas, layer: 'base' })
  const edit = await runChangeset(own, { ops: [{ op: 'entry.put', entry: 'new', data: { title: { en: 'New' }, body: [] } }, { op: 'text.set', tag: 'first', member: 'entry', path: 'title', lang: 'en', value: 'First edited' }] }, { check: false, write: true, domain })
  assert.equal(edit.ok, true, edit.problems.join('\n'))
  assert.ok(edit.files.includes('packages/base/entries/new.json'))
  assert.ok(edit.files.every((file) => file.startsWith('packages/base/')))
  const reopened = openPackage('base', root, { vocabulary: schemas })
  assert.deepEqual(reopened.content().glossary, readPackage('base', root, { vocabulary: schemas }).glossary)
  assert.deepEqual(reopened.changes(), [])
  assert.equal(JSON.parse(readFileSync(resolve(root, 'packages/base/tags/entry/first.json'))).kind, undefined)
  assert.equal(readContent('demo', root, { vocabulary: schemas }).tags['entry:base/first'].title.en, 'First edited')
  assert.equal((await undo(openGame('demo', root, { vocabulary: schemas, layer: 'base' }), { check: false, write: true, domain })).ok, true)
})

test('source files reject retired glossary and tag formats and tag overrides cannot change kind', () => {
  const { root, put } = fixture()
  put('packages/base/tags/entry/words.json', { values: [] })
  put('packages/extra/overrides/base/tags/level/words.json', { values: [] })
  assert.match(readContent('demo', root, { vocabulary: schemas }).objectProblems.map(p => p.says).join('\n'), /missing target tag/)
  put('packages/base/tags/entry/words.json', { kind: 'entry', values: [] })
  assert.throws(() => readContent('demo', root, { vocabulary: schemas }), /kind belongs in the path/)
  put('packages/base/glossary.json', { groups: [], entries: [] })
  assert.throws(() => readContent('demo', root, { vocabulary: schemas }), /glossary.json has been replaced/)
})



test('game package selection previews, writes, reopens and undoes without writing packages', async () => {
  const { root, put } = fixture()
  put('packages/library/package.json', { version: '1.0.0', kernel: '^0.0.0', uses: {} })
  put('packages/library/levels/new.json', { title: 'New' })
  const ws = openGame('demo', root, { vocabulary: schemas })
  const before = ws.content()
  const original = readFileSync(resolve(root, 'games/demo/game.json'), 'utf8')
  const options = { check: false, domain: { vocabulary: schemas } }
  const change = { ops: [{ op: 'game.package.add', package: 'library', range: '^1.0.0' }] }
  const preview = await runChangeset(ws, change, options)
  assert.equal(preview.ok, true, preview.problems.join('\n'))
  assert.ok(preview.content.registries.level['library/new'])
  assert.deepEqual(ws.content(), before)
  assert.deepEqual(ws.packageIds, ['extra', 'base', 'circuit'])
  assert.equal(readFileSync(resolve(root, 'games/demo/game.json'), 'utf8'), original)
  const written = await runChangeset(ws, change, { ...options, write: true })
  assert.equal(written.ok, true, written.problems.join('\n'))
  assert.deepEqual(written.files, ['games/demo/game.json'])
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(resolve(root, 'games/demo/game.json'))).packages), ['extra', 'base', 'circuit', 'library'])
  assert.ok(openGame('demo', root, { vocabulary: schemas }).content().registries.level['library/new'])
  assert.equal((await undo(openGame('demo', root, { vocabulary: schemas }), { ...options, write: true })).ok, true)
  assert.equal(readFileSync(resolve(root, 'games/demo/game.json'), 'utf8'), original)

  const removed = await runChangeset(openGame('demo', root, { vocabulary: schemas }), { ops: [{ op: 'game.package.remove', package: 'extra' }] }, { ...options, write: true })
  assert.equal(removed.ok, true, removed.problems.join('\n'))
  assert.deepEqual(removed.content.layerOrder, ['base', 'circuit', '@demo'])
  const restored = await undo(openGame('demo', root, { vocabulary: schemas }), { ...options, write: true })
  assert.equal(restored.ok, true, restored.problems.join('\n'))
  assert.equal(readFileSync(resolve(root, 'games/demo/game.json'), 'utf8'), original)
})

test('package selection refuses missing dependencies, duplicate selection and removals still in use', async () => {
  const { root, put } = fixture()
  put('packages/library/package.json', { version: '1.0.0', kernel: '^0.0.0', uses: {} })
  put('packages/child/package.json', { version: '1.0.0', kernel: '^0.0.0', uses: { 'library': '^1.0.0' } })
  put('packages/base/tags/level/course.json', { values: ['a'] })
  put('games/demo/course.json', { chapters: [{ id: 'main', levels: ['base/a'] }] })
  lockFixture(root)
  const ws = openGame('demo', root, { vocabulary: schemas })
  const options = { check: false, domain: { vocabulary: schemas } }
  for (const [op, id, pattern] of [
    ['add', 'child', /missing target package library/], ['add', 'base', /already selected/],
    ['add', 'missing', /missing/], ['remove', 'missing', /not selected/],
    ['remove', 'base', /course still places base\/a.*chapter @demo\/main.*extra/],
  ]) {
    const result = await runChangeset(ws, { ops: [{ op: `game.package.${op}`, package: id, ...(op === 'add' && { range: '^1.0.0' }) }] }, options)
    assert.equal(result.ok, false)
    assert.match(result.problems.join('\n'), pattern)
    assert.deepEqual(ws.packageIds, ['extra', 'base', 'circuit'])
  }
  const result = await runChangeset(ws, { ops: [{ op: 'game.package.add', package: 'library', range: '^1.0.0' }, { op: 'game.package.add', package: 'child', range: '^1.0.0' }] }, options)
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.deepEqual(ws.packageIds, ['extra', 'base', 'circuit'])
  const failed = await runChangeset(ws, { ops: [{ op: 'game.package.add', package: 'library', range: '^1.0.0' }, { op: 'game.package.add', package: 'base', range: '^1.0.0' }] }, options)
  assert.equal(failed.ok, false)
  assert.deepEqual(ws.packageIds, ['extra', 'base', 'circuit'])
  const packaged = await runChangeset(openPackage('base', root, { vocabulary: schemas }), { ops: [{ op: 'game.package.add', package: 'library', range: '^1.0.0' }] }, options)
  assert.equal(packaged.ok, false)
  assert.match(packaged.problems.join('\n'), /game workspace/)
})

test('selection guards newly loaded package files against concurrent writes', async () => {
  const { root, put } = fixture()
  put('packages/library/package.json', { version: '1.0.0', kernel: '^0.0.0', uses: {} })
  const ws = openGame('demo', root, { vocabulary: schemas })
  ws.selectPackages({ ...ws.packageRanges, library: '^1.0.0' })
  put('packages/library/levels/late.json', { title: 'Late' })
  assert.throws(() => ws.write(), /dependency changed on disk/)
})

test('typed tags merge independent contributions and keep exact member provenance', () => {
  const a = base()
  a.objects.push(obj('entry', 'word', { title: 'Word', body: [] }), obj('tag', 'all', { kind: 'entry', values: ['word'] }))
  const b = layer('b', ['base'], [], [obj('tag', 'base/all', { kind: 'level', values: { add: ['base/a', 'base/b'] } })])
  const c = layer('c', ['base'], [], [obj('tag', 'base/all', { kind: 'level', values: { add: ['base/b'] } })])
  const content = assembleLayers('demo', [c, b, a, game()], schemas)
  assert.deepEqual(content.tags['level:base/all'].values, ['base/a', 'base/b'])
  assert.deepEqual(content.tags['entry:base/all'].values, ['base/word'])
  assert.deepEqual(content.sources.tag['level:base/all'].collections.values, { 'base/a': ['base', 'b'], 'base/b': ['b', 'c'] })
  assert.deepEqual(content.overrideHistory.filter(e => e.kind === 'tag').map(e => [e.name, e.member]), [['base/all', 'level'], ['base/all', 'level']])
  c.config.uses.b = '^1.0.0'
  c.overrides[0].value = { kind: 'level', values: ['base/b'] }
  assert.deepEqual(composeLayers([a, b, c], schemas).sources.tag['level:base/all'].collections.values, { 'base/b': ['c'] })
  c.overrides[0].value = { kind: 'level', values: { remove: ['base/a'], add: ['base/a'] } }
  assert.deepEqual(composeLayers([a, b, c], schemas).sources.tag['level:base/all'].collections.values['base/a'], ['c'])
})

test('tag contributions require the exact typed declaration or reader; kernel is reserved', () => {
  const a = base(), b = layer('b', ['base'], [], [obj('tag', 'base/all', { kind: 'entry', values: [] })])
  assert.match(problems([a, b]), /missing target tag base\/all/)
  a.tagReaders = [{ name: 'base/all', member: 'entry', reader: 'base' }]
  assert.deepEqual(composeLayers([a, b], schemas).registries.tag['entry:base/all'].values, [])
  b.overrides = [obj('tag', 'kernel/studio-left', { kind: 'kind', values: ['level'] })]
  assert.deepEqual(composeLayers([a, b], schemas).sources.tag['kind:kernel/studio-left'].collections.values, { level: ['b'] })
  b.overrides = [obj('tag', 'kernel/studio-left', { kind: 'level', values: [] })]
  assert.match(problems([a, b]), /missing target tag kernel\/studio-left/)
  assert.throws(() => orderPackages([layer('kernel')]), /reserved namespace/)
})

test('same-named tags persist, publish and undo independently by member type', async () => {
  const { root, put } = fixture()
  put('packages/base/entries/word.json', { title: 'Word', body: [] })
  const ws = openPackage('base', root, { vocabulary: schemas })
  const domain = { vocabulary: schemas }
  const result = await runChangeset(ws, { why: 'Use the same tag name in two types', ops: [
    { op: 'tag.put', tag: 'pick', member: 'level', data: { title: { en: 'Levels' }, values: ['a'] } },
    { op: 'tag.put', tag: 'pick', member: 'entry', data: { title: { en: 'Entries' }, values: ['word'] } },
  ] }, { write: true, check: false, domain })
  assert.equal(result.ok, true, result.problems.join('\n'))
  const content = readPackage('base', root, { vocabulary: schemas })
  assert.deepEqual(content.tags['level:base/pick'].values, ['base/a'])
  assert.deepEqual(content.tags['entry:base/pick'].values, ['base/word'])
  const assets = contentAssets(content)
  const restored = await pageContent(JSON.parse(assets.get(CONTENT_FILE)), 'https://example.test/', async url => ({ ok: true, json: async () => JSON.parse(assets.get(url.pathname.slice(1))) }), schemas)
  assert.deepEqual(restored.registries.tag, content.registries.tag)
  const reopened = openPackage('base', root, { vocabulary: schemas })
  assert.deepEqual(reopened.changes(), [])
  const removed = await runChangeset(reopened, { ops: [{ op: 'tag.remove', tag: 'pick', member: 'level' }] }, { write: true, check: false, domain })
  assert.equal(removed.ok, true, removed.problems.join('\n'))
  assert.ok(readPackage('base', root, { vocabulary: schemas }).tags['entry:base/pick'])
  assert.equal((await undo(openPackage('base', root, { vocabulary: schemas }), { check: false, write: true, domain })).ok, true)
  assert.deepEqual(readPackage('base', root, { vocabulary: schemas }).tags, content.tags)
})
