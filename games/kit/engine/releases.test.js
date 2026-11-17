import { openGame, openPackage } from './ops/workspace.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, renameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { satisfies, parseVersion, compatibility, nextVersion, hash } from './release-data.js'
import { resolveLayers, readPackage } from './resolver.js'
import { lockTarget, publishPackage, checkTarget, upgradeTarget, platformManifest } from './releases.js'
import { releaseIndex, releaseSource } from './release-store.js'
import { S } from './schema.js'

const put = (root, name, data) => {
  const file = resolve(root, name)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n')
}
const project = () => mkdtempSync(resolve(tmpdir(), 'versions-contract-'))
const config = (uses = {}) => ({ version: '1.0.0', kernel: '^0.0.0', uses })
const entry = value => ({ hash: hash(JSON.stringify(value)), value })

test('ranges use exact, tilde and caret semantics including zero-major boundaries', () => {
  for (const [range, yes, no] of [['1.2.3', '1.2.3', '1.2.4'], ['~1.2.3', '1.2.9', '1.3.0'], ['^1.2.3', '1.9.0', '2.0.0'], ['^0.2.3', '0.2.9', '0.3.0'], ['^0.0.3', '0.0.3', '0.0.4']]) {
    assert.equal(satisfies(yes, range), true)
    assert.equal(satisfies(no, range), false)
    assert.equal(satisfies('0.0.0', range), false)
  }
  for (const range of ['*', 'latest', '^1.0', '>=1.0.0', '1.0.0-beta', '01.0.0']) assert.throws(() => satisfies('1.0.0', range), /invalid range/)
  assert.throws(() => parseVersion('1.0'), /invalid version/)
})

test('structural additions, schema breaks and behavioral changes drive automatic versions', () => {
  const before = { surface: { schema: entry(S.obj({ value: S.int() })) } }
  const optional = { surface: { schema: entry(S.obj({ value: S.int(), tip: S.opt(S.str()) })) } }
  const required = { surface: { schema: entry(S.obj({ value: S.int(), tip: S.str() })) } }
  assert.equal(compatibility(before, optional).type, 'additive')
  assert.equal(compatibility(before, required).type, 'breaking')
  assert.equal(compatibility(before, { surface: {} }).type, 'breaking')
  assert.equal(compatibility(before, before, [{ kind: 'game', id: 'course' }]).type, 'behavior')
  assert.equal(nextVersion(null, compatibility(null, before)), '1.0.0')
  assert.equal(nextVersion('1.2.3', compatibility(before, optional)), '1.3.0')
  assert.equal(nextVersion('1.2.3', compatibility(before, required)), '2.0.0')
  assert.equal(nextVersion('1.2.3', { type: 'behavior' }), '2.0.0')
  assert.equal(nextVersion('1.2.3', compatibility(before, before)), '1.2.4')
  const platform = platformManifest()
  assert.ok(platform.surface.operations)
  assert.ok(platform.surface.exports.value.core.includes('createPluginKernel'))
})

test('locks report missing pins, range drift, extra dependencies and content hash drift as structured problems', () => {
  const root = project()
  try {
    put(root, 'packages/library/package.json', config())
    put(root, 'packages/course/package.json', config({ library: '^1.0.0' }))
    const target = { id: 'course', kind: 'package' }
    assert.equal(resolveLayers({ package: 'course', closure: true, root }).lockStatus.problems[0].reason, 'missing lock')
    lockTarget(target, root)
    assert.equal(resolveLayers({ package: 'course', closure: true, root }).lockStatus.valid, true)
    put(root, 'packages/library/entries/one.json', { title: 'One', body: ['An explanatory test entry.'] })
    assert.equal(readPackage('course', root).objectProblems.some(problem => problem.rule === 'dependency'), false)
    assert.equal(openPackage('course', root).content().objectProblems.some(problem => problem.rule === 'dependency'), false)
    lockTarget(target, root)
    put(root, 'packages/course/package.json', config({ library: '~2.0.0' }))
    assert.ok(resolveLayers({ package: 'course', closure: true, root }).lockStatus.problems.some(problem => problem.reason.includes('outside ~2.0.0')))
    assert.throws(() => lockTarget(target, root), /outside/)
    put(root, 'packages/course/package.json', config())
    assert.ok(resolveLayers({ package: 'course', closure: true, root }).lockStatus.problems.some(problem => problem.target === 'library'))
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('checked archives and workspace sources use the same reader, manifests and public layers', () => {
  const root = project()
  try {
    put(root, 'packages/library/package.json', config())
    put(root, 'packages/library/core/index.js', "export const answerValue = 42; export function register(kernel) { kernel.tag('library/read', 'entry') }")
    put(root, 'packages/library/view/index.jsx', "export function Widget() { return <span /> } export function register(kernel) { kernel.display('library:widget', Widget) }")
    put(root, 'packages/library/test/contract.test.js', "import test from 'node:test'; import assert from 'node:assert/strict'; import { answerValue } from '../core/index.js'; test('public value', () => assert.equal(answerValue, 42))")
    put(root, 'packages/library/entries/one.json', { title: 'One', body: ['An explanatory test entry.'] })
    const target = { id: 'library', kind: 'package' }
    lockTarget(target, root)
    const first = publishPackage('library', root, { launch: true })
    assert.equal(first.version, '1.0.0')
    const source = resolveLayers({ package: 'library', closure: true, root }).layers[0]
    assert.ok(source.manifest.surface['display:library:widget'])
    assert.ok(source.manifest.surface['tag:entry:library/read'])
    assert.deepEqual(source.manifest.exports.core, ['answerValue', 'register'])
    renameSync(resolve(root, 'packages/library'), resolve(root, 'held'))
    const archive = resolveLayers({ package: 'library', closure: true, root }).layers[0]
    for (const field of ['config', 'objects', 'overrides', 'catalogs', 'manifest']) assert.deepEqual(archive[field], source[field], field)
    assert.equal(archive.source, 'archive')
    put(root, 'games/demo/game.json', { kernel: '^0.0.0', packages: { library: '^1.0.0' } })
    put(root, 'games/demo/course.json', {})
    lockTarget({ id: 'demo', kind: 'game' }, root)
    const workspace = openGame('demo', root)
    workspace.game = { ...workspace.game, chapters: [] }
    assert.ok(workspace.write().includes('games/demo/course.json'))
    assert.throws(() => workspace.selectPackages({ library: '^2.0.0' }), /outside/)
    rmSync(resolve(root, 'games'), { recursive: true })
    // An archived package is also a standalone check target.
    assert.equal(checkTarget({ id: 'library', kind: 'package' }, root).status, 0)
    rmSync(resolve(root, 'packages/library'), { recursive: true, force: true })
    renameSync(resolve(root, 'held'), resolve(root, 'packages/library'))
    put(root, 'packages/library/entries/two.json', { title: 'Two', body: ['An explanatory test entry.'] })
    assert.equal(publishPackage('library', root, { launch: true }).version, '1.1.0')
    assert.equal(publishPackage('library', root, { launch: true }).version, '1.1.1')
    rmSync(resolve(root, 'packages/library/entries/one.json'))
    assert.equal(publishPackage('library', root, { launch: true }).version, '2.0.0')
    renameSync(resolve(root, 'packages/library'), resolve(root, 'held-again'))
    put(root, 'packages/other/package.json', config({ library: '~1.0.0' }))
    lockTarget({ id: 'other', kind: 'package' }, root)
    put(root, 'packages/course/package.json', config({ library: '^1.0.0', other: '^1.0.0' }))
    const locked = lockTarget({ id: 'course', kind: 'package' }, root)
    assert.equal(locked.dependencies.library.version, '1.0.0')
    assert.equal(upgradeTarget({ id: 'course', kind: 'package' }, 'library', root).dependencies.library.version, '1.0.0')
    put(root, 'packages/other/README.md', 'A changed retained source dependency.')
    assert.equal(upgradeTarget({ id: 'course', kind: 'package' }, 'library', root).dependencies.other.version, '1.0.0')
    const index = releaseIndex(root).packages.library
    assert.deepEqual(Object.keys(index), ['1.0.0', '1.1.0', '1.1.1', '2.0.0'])
    const release = { ...index['1.0.0'], version: '1.0.0' }
    assert.ok(releaseSource('library', release, root))
    const file = resolve(root, 'releases', release.file)
    writeFileSync(file, Buffer.concat([readFileSync(file), Buffer.from('tampered')]))
    assert.throws(() => releaseSource('library', release, root), /archive hash mismatch/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('publication compares real dependent checks and reports a major behavioral change', () => {
  const root = project()
  try {
    put(root, 'packages/library/package.json', config())
    const code = value => `export const answerValue = ${value}; export function register() {}`
    put(root, 'packages/library/core/index.js', code(42))
    put(root, 'packages/library/test/contract.test.js', "import test from 'node:test'; import assert from 'node:assert/strict'; import { answerValue } from '../core/index.js'; test('public value', () => assert.equal(typeof answerValue, 'number'))")
    lockTarget({ id: 'library', kind: 'package' }, root)
    assert.equal(publishPackage('library', root, { launch: true }).version, '1.0.0')
    put(root, 'packages/course/package.json', config({ library: '^1.0.0' }))
    put(root, 'packages/course/core/index.js', "import { answerValue } from 'library'; export function register(kernel) { kernel.check('course:probe', () => [{ text: `probe ${answerValue}` }]) }")
    put(root, 'packages/course/levels/sum.json', { title: 'Sum', tasks: [{ id: 'sum', kind: 'rows:equation', brief: 'Add two numbers.', rows: [{ total: 5, chips: [2, 3], reference: '2 + 3', naive: '2' }] }] })
    lockTarget({ id: 'course', kind: 'package' }, root)
    checkTarget({ id: 'course', kind: 'package' }, root)
    put(root, 'packages/library/core/index.js', code(43))
    const release = publishPackage('library', root, { launch: true })
    assert.equal(release.version, '2.0.0')
    assert.equal(release.compatibility.type, 'behavior')
    assert.deepEqual(release.affected, [{ id: 'course', kind: 'package' }])
    assert.match(release.compatibility.behavior[0].before.stdout, /probe 42/)
    assert.match(release.compatibility.behavior[0].after.stdout, /probe 43/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('publication requires an explicit launch switch', () => {
  assert.throws(() => publishPackage('unused'), /disabled before launch/)
})
