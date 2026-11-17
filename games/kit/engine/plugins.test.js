import { lockFixture } from './ops/fixture.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createPluginKernel, registerPlugins } from './plugins.js'
import { importProblem, packageCodeProblems } from './plugin-boundaries.js'
import { withKindDeclarations } from './plugin-kinds.js'
import { vocabularyFor } from './kernel.js'
import { readPackage } from './resolver.js'
import { checkContent } from './vocabulary.js'
import { openPackage } from './ops/workspace.js'
import { runChangeset } from './ops/changeset.js'

const play = { initial: () => '', read: x => x, write: x => x, normalize: x => x, run: x => x, judge: x => ({ pass: x === 'ok' }) }

test('entry sides, names, duplicate registrations and used-play pairing are strict', async () => {
  const kernel = createPluginKernel(), core = kernel.forPackage('words', 'core'), view = kernel.forPackage('words', 'view')
  assert.equal(core.editor, undefined)
  assert.equal(view.agent, undefined)
  assert.throws(() => core.play('other:answer', play), /invalid/)
  assert.throws(() => core.play('words:answer', {}), /initial/)
  core.play('words:answer', play)
  assert.throws(() => core.play('words:answer', play), /duplicate/)
  kernel.pair([{ play: 'words:answer' }])
  assert.throws(() => kernel.pair([{ play: 'words:answer' }], true), /no view/)
  view.play('words:answer', { component() {}, preview() {} })
  kernel.pair([{ play: 'words:answer' }], true)
  await assert.rejects(registerPlugins([{ id: 'orphan', view: { register(k) { k.play('orphan:answer', { component() {}, preview() {} }) } } }], { view: true }), /no core/)
})

test('public imports enforce direct uses, exports and the core/view direction', () => {
  const root = '/project', core = '/project/packages/story/core/index.js', view = '/project/packages/story/view/index.jsx'
  for (const path of ['react', 'kernel/view', '../view/index.jsx', './screen.jsx', './style.css', '../../other/core/index.js', 'other/internal.js', 'node:fs', '/absolute/file.js']) assert.ok(importProblem(path, core, root, ['other']), path)
  assert.equal(importProblem('kernel', core, root, []), null)
  assert.equal(importProblem('./model.js', core, root, []), null)
  assert.equal(importProblem('../core/index.js', view, root, []), null)
  assert.equal(importProblem('kernel/view', view, root, []), null)
  assert.ok(importProblem(null, core, root, []))
})

test('data kinds use the normal operation, namespace, copy, tag, relation and override paths', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'package-kinds-'))
  const put = (path, value) => { const file = resolve(root, path); mkdirSync(resolve(file, '..'), { recursive: true }); writeFileSync(file, JSON.stringify(value)) }
  try {
    put('packages/story/package.json', { uses: {  }, version: '1.0.0', kernel: '^2.0.0' })
    lockFixture(root)
    let ws = openPackage('story', root)
    let result = await runChangeset(ws, { why: 'Declare a scene', ops: [{ op: 'kind.put', kind: 'scene', data: {
      folder: 'scenes', schema: { type: 'obj', fields: { title: { type: 'text' }, next: { type: 'name', kind: 'story/scene', optional: true } } },
      references: ['level', 'story/scene'], override: 'replace', studio: { name: { en: 'Scenes', zh: '场景' }, icon: 'Book' },
      relations: { 'story:follows': { from: 'story/scene', to: 'story/scene' } },
    } }] }, { write: true })
    assert.equal(result.ok, true, result.problems.join('\n'))
    ws = openPackage('story', root)
    result = await runChangeset(ws, { why: 'Add a scene and its collection', ops: [
      { op: 'object.put', kind: 'story/scene', name: 'start', data: { title: { en: 'Start', zh: '开始' } } },
      { op: 'object.put', kind: 'story/scene', name: 'end', data: { title: { en: 'End', zh: '结束' }, next: '#starts' } },
      { op: 'tag.put', tag: 'starts', member: 'story/scene', data: { values: ['start'] } },
      { op: 'relation.put', relation: 'follows', data: { kind: 'story:follows', edges: [{ from: 'start', to: 'end' }] } },
    ] }, { write: true })
    assert.equal(result.ok, true, result.problems.join('\n') + JSON.stringify(result.lines))
    lockFixture(root)
    const content = readPackage('story', root)
    assert.equal(content.registries['story/scene']['story/end'].next, 'story/start')
    assert.deepEqual(content.registries.tag['story/scene:story/starts'].values, ['story/start'])
    assert.equal(content.relationEdges['story:follows'][0].to, 'story/end')
    assert.equal(content.sources['story/scene']['story/start'].declaration, 'story')
    assert.deepEqual(checkContent({ vocabulary: ws.schemas }, content), [])
    put('packages/edit/package.json', { uses: { 'story': '^1.0.0' }, version: '1.0.0', kernel: '^2.0.0' })
    put('packages/edit/overrides/story/scenes/start.json', { title: '@start.title' })
    put('packages/edit/i18n/en.json', { 'start.title': 'Edited' })
    put('packages/edit/i18n/zh.json', { 'start.title': '编辑后' })
    const edited = readPackage('edit', root)
    assert.equal(edited.registries['story/scene']['story/start'].title.en, 'Edited')
    assert.deepEqual(edited.sources['story/scene']['story/start'].overrides, ['edit'])
    mkdirSync(resolve(root, 'packages/story/core'))
    writeFileSync(resolve(root, 'packages/story/core/index.js'), "export { something } from '../view/internal.jsx'")
    assert.ok(packageCodeProblems('story', root).length)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('kind declarations cannot change built-in structure or hide malformed schemas', () => {
  const layer = data => [{ id: 'story', objects: [{ kind: 'kind', name: 'thing', value: data }] }]
  const base = vocabularyFor('circuit')
  assert.throws(() => withKindDeclarations(base, layer({ folder: 'levels', schema: { type: 'str' } })), /reserved/)
  assert.throws(() => withKindDeclarations(base, layer({ extends: 'level', fields: { title: { type: 'str' } } })), /redefine/)
  assert.throws(() => withKindDeclarations(base, layer({ folder: 'scenes', schema: { type: 'invalid' } })), /schema/)
})


test('Node core imports and paired Vite entries compose two dependent plugins in one level', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'package-code-'))
  const put = (path, value) => { const file = resolve(root, path); mkdirSync(resolve(file, '..'), { recursive: true }); writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)) }
  try {
    put('packages/alpha/package.json', { uses: {  }, version: '1.0.0', kernel: '^2.0.0' })
    put('packages/beta/package.json', { uses: { 'alpha': '^1.0.0' }, version: '1.0.0', kernel: '^2.0.0' })
    put('packages/alpha/core/index.js', `
      export const answer = { initial: () => '', read: x => x, write: x => x, normalize: x => x, run: x => x, judge: x => ({ pass: x === 'ok' }) }
      export function register(k) { k.play('alpha:answer', answer); k.agent('alpha:answer', { observe: () => ({ brief: 'Answer' }), act: (_, x) => answer.judge(x) }) }
    `)
    put('packages/beta/core/index.js', `
      import { answer } from 'alpha'
      export function register(k) { k.play('beta:answer', answer); k.agent('beta:answer', { observe: () => ({ brief: 'Answer' }), act: (_, x) => answer.judge(x) }) }
    `)
    put('packages/alpha/view/index.jsx', `export function Component() { return <p>Answer</p> }\nexport function register(k) { k.play('alpha:answer', { component: Component, preview: Component }) }`)
    put('packages/beta/view/index.jsx', `import { Component } from 'alpha/view'\nexport function register(k) { k.play('beta:answer', { component: Component, preview: Component }) }`)
    put('packages/beta/levels/mixed.json', { title: '@title', tasks: [
      { id: 'first', play: 'alpha:answer', brief: '@brief' }, { id: 'second', play: 'beta:answer', brief: '@brief' },
    ] })
    put('packages/beta/i18n/en.json', { title: 'Mixed', brief: 'Answer' })
    put('packages/beta/i18n/zh.json', { title: '组合', brief: '作答' })
    const content = readPackage('beta', root)
    assert.deepEqual(content.layerOrder, ['alpha', 'beta'])
    put('packages/gamma/package.json', { uses: { 'beta': '^1.0.0' }, version: '1.0.0', kernel: '^2.0.0' })
    put('packages/gamma/levels/private.json', { title: 'Private', tasks: [{ id: 'private', play: 'alpha:answer', brief: 'Answer' }] })
    assert.ok(readPackage('gamma', root).objectProblems.some(problem => problem.reason === 'undeclared dependency' && problem.kind === 'play'))

    const { runtimeOf } = await import('./runtime.js')
    const runtime = await runtimeOf(content)
    const { packageLevel } = await import('./package-play.js')
    const scope = packageLevel(content, 'beta/mixed')
    const spec = runtime.spec(scope)
    assert.deepEqual(spec.levels[0].tasks.map(task => task.kind), ['alpha:answer', 'beta:answer'])
    assert.equal(runtime.play.attempt({ level: { source: content.levels[0].tasks[1] } }, 'ok').pass, true)
    const { gameOf, closeGames } = await import('./games.mjs')
    try {
      // Preserve the workspace location when constructing an ephemeral single-level shell.
      const { contentRoots } = await import('./content.js')
      contentRoots.set(scope, root)
      const game = await gameOf(scope, { view: true })
      assert.deepEqual(game.levels[0].tasks.map(task => task.kind), ['alpha:answer', 'beta:answer'])
      assert.equal(typeof game.kinds['beta:answer'].Screen, 'function')
      const { readStarter } = await import('./resolver.js')
      const { contentSchemas } = await import('./content.js')
      const starter = readStarter(resolve(import.meta.dirname, '../templates/rows'))
      const mixed = { ...content, levels: [{ ...content.levels[0], tasks: [...content.levels[0].tasks, { ...starter.levels[0].tasks[0], id: 'beta/legacy' }] }] }
      contentRoots.set(mixed, root)
      contentSchemas.set(mixed, withKindDeclarations(vocabularyFor('rows'), [], true))
      const mixedRuntime = await runtimeOf(mixed)
      const mixedScope = packageLevel(mixed, 'beta/mixed')
      const mixedSpec = mixedRuntime.spec(mixedScope)
      assert.equal(mixedSpec.levels[0].tasks.length, 3)
      assert.equal((await mixedRuntime.validate(mixedSpec)).filter(line => line.fail).length, 0)
      const mixedGame = await gameOf(mixedScope, { view: true })
      assert.equal(mixedGame.levels[0].tasks.length, 3)
      assert.equal(typeof mixedGame.kinds['beta:answer'].Screen, 'function')

    } finally { await closeGames() }
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('tag readers register only their own full names and one member type per identity', () => {
  const kernel = createPluginKernel(), api = kernel.forPackage('story', 'core')
  api.tag('story/picks', 'level')
  api.tag('story/picks', 'entry')
  assert.deepEqual(kernel.tables.tag.get('level:story/picks'), { name: 'story/picks', member: 'level', reader: 'story' })
  assert.ok(kernel.tables.tag.has('kind:kernel/studio-left'))
  assert.equal(kernel.tables.tag.size, 3)
  assert.throws(() => api.tag('story:picks', ['level']), /own full name/)
  assert.throws(() => api.tag('other/picks', 'level'), /own full name/)
  assert.throws(() => api.tag('story/picks', ['level']), /member type/)
  assert.throws(() => api.tag('story/picks', 'level'), /duplicate/)
  assert.throws(() => kernel.forPackage('story', 'view').tag('story/view', 'level'), /register in core/)
})

test('Node assembly discovers code-owned tags before composing contributions', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'tag-readers-'))
  const put = (path, value) => { const file = resolve(root, path); mkdirSync(resolve(file, '..'), { recursive: true }); writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)) }
  try {
    put('packages/reader/package.json', { uses: {  }, version: '1.0.0', kernel: '^2.0.0' })
    put('packages/reader/core/index.js', "export function register(k) { k.tag('reader/picks', 'entry') }")
    put('packages/writer/package.json', { uses: { 'reader': '^1.0.0' }, version: '1.0.0', kernel: '^2.0.0' })
    put('packages/writer/entries/example.json', { title: 'Example', body: [] })
    put('packages/writer/overrides/reader/tags/entry/picks.json', { values: ['example'] })
    const content = readPackage('writer', root)
    assert.deepEqual(content.registries.tag['entry:reader/picks'].values, ['writer/example'])
    assert.equal(content.sources.tag['entry:reader/picks'].reader, 'reader')
    assert.deepEqual(content.sources.tag['entry:reader/picks'].members, { 'writer/example': ['writer'] })
  } finally { rmSync(root, { recursive: true, force: true }) }
})
