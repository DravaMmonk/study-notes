import { logicVocabulary } from './ops/fixture.js'
import { logicVocabulary as circuitVocabulary } from './ops/fixture.js'
import { existenceProblems } from './existence.js'
import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { readPackage, runtimeOf, resolveLayers, layerVocabulary } from './resolver.js'
import { checkGame } from './checks.js'
import { closeGames } from './games.mjs'
import { composeLayers } from './layers.js'
import { vocabulary } from './kernel.js'
import { defineParts } from '../../../packages/circuit/core/index.js'
import { openPackage } from './ops/workspace.js'
import { runChangeset, undo } from './ops/changeset.js'
import { contentAssets, CONTENT_FILE } from '../app/content-assets.js'
import { pageContent } from '../app/page-content.js'
import { lockFixture, writeContentFixture, installTableFixture } from './ops/fixture.js'

after(closeGames)
const text = en => ({ en })
const arithmetic = Object.fromEntries([
  ['add', 'plus'], ['subtract', 'minus'], ['multiply', 'times'], ['divide', 'over'],
].map(([name, operation]) => [name, {
  icon: 'Plus', name: text(name), desc: text(name), family: 'circuit:family-value',
  inputs: ['a', 'b'].map(name => ({ name, type: 'circuit:number' })),
  outputType: 'circuit:number', op: `circuit:${operation}`,
}]))
const layer = (id, objects = [], uses = [], overrides = []) => ({ id, config: { version: '1.0.0', kernel: '^0.0.0', uses: Object.fromEntries(uses.map(id => [id, '^1.0.0'])) }, objects, overrides, catalogs: {} })

test('content prototypes qualify, merge, replace, reject undeclared dependencies and retain provenance', () => {
  const base = layer('base', [{ kind: 'qed/wordset', name: 'words', value: { A: 'alpha', B: 'beta' } }])
  const extra = layer('extra', [], ['base'], [{ kind: 'qed/wordset', name: 'base/words', value: { B: 'bravo' } }])
  const composed = composeLayers([extra, base], logicVocabulary)
  assert.deepEqual(composed.registries['qed/wordset']['base/words'], { A: 'alpha', B: 'bravo' })
  assert.deepEqual(composed.sources['qed/wordset']['base/words'], { declaration: 'base', overrides: ['extra'], collections: {} })
  extra.overrides[0].value = { A: 'alpha', B: 'beta', C: 'charlie' }
  assert.deepEqual(composeLayers([base, extra], logicVocabulary).registries['qed/wordset']['base/words'], { A: 'alpha', B: 'beta', C: 'charlie' })
  extra.config.uses = {}
  assert.ok(existenceProblems(composeLayers([base, extra], logicVocabulary).qualifiedLayers, logicVocabulary).some(p => p.reason === 'undeclared dependency'))
  const badReference = layer('extra', [{ kind: 'level', name: 'one', value: { words: ['base/words'] } }])
  assert.ok(existenceProblems(composeLayers([base, badReference], logicVocabulary).qualifiedLayers, logicVocabulary).some(p => p.reason === 'undeclared dependency'))
})

test('packages reject the retired vocabulary field and invalid ranges', () => {
  const base = layer('base')
  base.config.vocabulary = 1
  assert.throws(() => composeLayers([base], vocabulary), /unknown field vocabulary/)
  delete base.config.vocabulary
  base.config.kernel = 'latest'
  assert.throws(() => composeLayers([base], vocabulary), /invalid range/)
})

test('a numeric library works in packages using image and table boards, with no library levels', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'package-prototypes-'))
  const put = (path, value) => { const file = resolve(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(value)) }
  try {
    installTableFixture(root)
    const imageVocabulary = layerVocabulary(resolveLayers({ package: 'image', closure: true, root, unlocked: true }).layers)
    writeContentFixture(root, 'arithmetic', { game: { vocabulary: 1 }, glossary: { groups: [], entries: [] }, partDefs: { parts: arithmetic }, levels: {} }, circuitVocabulary)
    const common = { title: text('Sample'), vocabulary: 1, primitives: ['arithmetic/add'] }
    writeContentFixture(root, 'picture', {
      game: common, glossary: { groups: [], entries: [] }, levels: { copy: {
        title: text('Copy'), after: text('Same image.'), intro: [], tasks: [{ id: 'copy', play: 'image:graph',
          brief: text('Copy the image.'), hint: text('Connect the image.'), scene: 'image:scene-filter',
          setup: { target: 'image:target-same' }, tests: [{ label: text('Square'), in: 'image:picture-square' }], hidden: [{ label: text('Disk'), in: 'image:picture-disk' }], solution: ['out <- in'],
        }],
      } },
    }, imageVocabulary)
    writeContentFixture(root, 'cells', {
      game: common, glossary: { groups: [], entries: [] }, levels: { copy: {
        title: text('Copy'), short: text('Copy'), intro: [], mission: { goal: text('Copy cells.'), how: text('Read the previous cell.') },
        robot: 'state-graph:robot-scout', debrief: { title: text('Copied'), body: [] }, tasks: [{ id: 'copy', play: 'state-graph:circuit',
          hints: [text('Read the previous cell.')], world: 'state-graph:world-grid', tests: [{ R: 1, C: 2, given: { '0,0': 7 } }], expected: [14], solution: ['sum = arithmetic/add(view.left, view.left)', 'cell <- sum'],
        }],
      } },
    }, layerVocabulary(resolveLayers({ package: 'state-graph', closure: true, root, unlocked: true }).layers))
    for (const id of ['picture', 'cells']) put(`packages/${id}/package.json`, { uses: { 'arithmetic': '^0.0.0', ...(id === 'picture' ? { image: '^0.0.0' } : { 'state-graph': '^0.0.0', table: '^0.0.0' }) }, version: '1.0.0', kernel: '^0.0.0' })
    for (const id of ['arithmetic', 'picture', 'cells']) rmSync(resolve(root, 'games', id), { recursive: true })
    lockFixture(root)
    for (const id of ['arithmetic', 'picture', 'cells']) {
      const content = readPackage(id, root)
      assert.equal(Object.keys(content.registries['circuit/part']).filter(name => name.startsWith('arithmetic/')).length, 4)
      assert.deepEqual((await checkGame(content, { domain: await runtimeOf(content), root })).filter(line => line.fail), [], id)
      const { PARTS } = defineParts(content.partDefs, {})
      assert.equal(PARTS['arithmetic/add'].eval({ a: 6, b: 3 }, {}), 9)
      assert.equal(PARTS['arithmetic/subtract'].eval({ a: 6, b: 3 }, {}), 3)
      assert.equal(PARTS['arithmetic/multiply'].eval({ a: 6, b: 3 }, {}), 18)
      assert.equal(PARTS['arithmetic/divide'].eval({ a: 6, b: 3 }, {}), 2)
      assert.throws(() => PARTS['arithmetic/divide'].eval({ a: 6, b: 0 }, {}))
    }
    put('packages/arithmetic/kinds/wordset.json', { folder: 'wordset', declares: 'package', overrides: { package: ['*'], game: ['$text'] }, schema: { type: 'map', of: { type: 'text' } } })
    put('packages/arithmetic/wordset/numbers.json', { A: 'one' })
    const ws = openPackage('arithmetic', root)
    const result = await runChangeset(ws, { ops: [{ op: 'object.set', kind: 'arithmetic/wordset', name: 'arithmetic/numbers', path: 'A', value: text('two') }] }, { write: true })
    assert.equal(result.ok, true, result.problems.join('\n'))
    assert.equal(readPackage('arithmetic', root).registries['arithmetic/wordset']['arithmetic/numbers'].A.en, 'two')
    const content = readPackage('arithmetic', root)
    const assets = contentAssets(content)
    const restored = await pageContent(JSON.parse(assets.get(CONTENT_FILE)), 'https://example.test/', url => new Response(assets.get(url.pathname.slice(1))), circuitVocabulary)
    assert.deepEqual(restored.registries['arithmetic/wordset'], content.registries['arithmetic/wordset'])
    assert.equal((await undo(openPackage('arithmetic', root), { write: true })).ok, true)
    assert.equal(JSON.parse(readFileSync(resolve(root, 'packages/arithmetic/wordset/numbers.json'), 'utf8')).A, 'one')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
