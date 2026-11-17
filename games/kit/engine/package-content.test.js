// Independent package authoring uses synthetic content and the existing domain readers.
import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { contentTargets, runtimeOf, readContent, readPackage } from './resolver.js'
import { checkGame } from './checks.js'
import { closeGames, gameOf } from './games.mjs'
import { packageLevel, packageLevelOrder } from './package-play.js'
import { holds, usable } from '../course.js'
import { openGame, openPackage } from './ops/workspace.js'
import { adopt, readLog, runChangeset, undo } from './ops/changeset.js'
import { proofsRoot, lockFixture } from './ops/fixture.js'

const roots = []
after(async () => {
  await closeGames()
  roots.forEach((root) => rmSync(root, { recursive: true, force: true }))
})
const fixture = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'package-content-'))
  roots.push(root)
  const put = (file, value) => {
    const path = resolve(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
  }
  put('packages/library/package.json', { version: '1.0.0', kernel: '^1.0.0', uses: {} })
  put('packages/library/parts/apply.json', { name: 'Apply', desc: 'Apply an implication.', icon: 'GitFork', family: 'logic:family-rule', inputs: [{ name: 'imp', type: 'logic:judgment' }, { name: 'a', type: 'logic:judgment' }], outputType: 'logic:judgment', op: 'logic:mp' })
  lockFixture(root)
  return { root, put }
}

test('a parts-only package opens without a course, checks and writes its own log without a game', async () => {
  const { root } = fixture()
  const ws = openPackage('library', root)
  const content = ws.content()
  assert.deepEqual(ws.changes(), [])
  assert.deepEqual(content.levels, [])
  assert.equal('eras' in content, false)
  assert.equal('chapters' in content, false)
  const domain = await runtimeOf(content)
  assert.deepEqual((await checkGame(content, { domain, root })).filter((line) => line.fail), [])
  adopt(ws, 'Start the independent library log.')
  const result = await runChangeset(ws, { ops: [{ op: 'parts.set', path: ['parts', 'apply', 'desc'], value: 'Use the implication rule.' }] }, { write: true })
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.ok(result.files.every((file) => file.startsWith('packages/library/')))
  assert.equal(readLog(ws).length, 2)
  assert.equal(existsSync(resolve(root, 'games')), false)
  assert.equal(existsSync(resolve(ws.dir, 'course.json')), false)
  const back = await undo(openPackage('library', root), { write: true })
  assert.equal(back.ok, true, back.problems.join('\n'))
  assert.equal(readPackage('library', root).partDefs.parts['library/apply'].desc, 'Apply an implication.')
  const cli = execFileSync(process.execPath, [resolve(import.meta.dirname, 'ops/cli.js'), '--package', 'library', 'log'], { env: { ...process.env, GAMES_ROOT: root }, encoding: 'utf8' })
  assert.match(cli, /Start the independent library log/)
  const checked = execFileSync(process.execPath, [resolve(import.meta.dirname, 'check.js'), '--package', 'library'], { env: { ...process.env, GAMES_ROOT: root }, encoding: 'utf8' })
  assert.match(checked, /all games ok/)
})

test('single-level play uses task trays, ignores prerequisites and opens settings without progress', async () => {
  const { root, id } = proofsRoot()
  roots.push(root)
  const dir = resolve(root, 'packages', id, 'trays')
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'tools.json'), JSON.stringify({ values: ['impI'] }))
  const content = readPackage(id, root)
  assert.equal('eras' in content, false)
  assert.equal('chapters' in content, false)
  const source = content.levels.find(l => l.id === `${id}/given`)
  source.tasks[0].tray = `${id}/tools`
  const shell = packageLevel(content, source.id)
  assert.equal(shell.levels.length, 1)
  assert.deepEqual(shell.eras, [])
  const { course, levels } = (await runtimeOf(shell)).spec(shell)
  assert.deepEqual(levels.map(l => l.id), [source.id])
  assert.deepEqual(course.plan.requires.get(source.id), [])
  assert.deepEqual(usable(course, { id: source.id, task: 0 }, new Set()), [`${id}/impI`])
  assert.equal(holds(course, { id: source.id, task: 0 }, new Set())(`${id}/impI`, 'A'), true)
  assert.equal(holds(course, { id: source.id, task: 0 }, new Set())(`${id}/mp`), false)
  delete source.tasks[0].tray
  const all = (await runtimeOf(shell)).spec(shell).course
  assert.ok(usable(all, { id: source.id, task: 0 }, new Set()).includes(`${id}/mp`))
  const game = await gameOf(shell)
  assert.deepEqual(game.levels.map(l => l.id), [source.id])
  assert.throws(() => packageLevel(content, 'missing'), /no level/)
})

test('a levels-only package plays dependency parts and checks references and naive answers independently', async () => {
  const { root, put } = fixture()
  put('packages/problems/package.json', { version: '1.0.0', kernel: '^1.0.0', uses: { 'library': '^1.0.0' } })
  put('packages/problems/levels/implication.json', {
    title: 'Implication', after: 'Use the implication.', tasks: [{ id: 'solve', kind: 'logic:proof',
      tests: [{ premises: { p: 'A → B', q: 'A' }, goal: 'B' }], cases: [{ A: 'A', B: 'B' }],
      solution: ['m = library/apply(p, q)', 'goal <- m'], naive: ['goal <- q'],
      brief: 'Prove B.', hint: ['Apply the implication.'],
    }],
  })
  lockFixture(root)
  const content = readPackage('problems', root)
  const lines = await checkGame(content, { domain: await runtimeOf(content), root })
  assert.deepEqual(lines.filter(l => l.fail), [])
  assert.ok(lines.some(l => /naive fails/.test(l.text)))
  content.levels[0].tasks[0].naive = content.levels[0].tasks[0].solution
  assert.ok((await checkGame(content, { domain: await runtimeOf(content), root })).some(l => l.fail && /naive/.test(l.text)))
  content.levels[0].gives = ['library/missing']
  assert.ok((await checkGame(content, { domain: await runtimeOf(content), root })).some(l => l.fail && /missing/.test(l.text)))
})

test('package dependencies are readable while only the selected layer can be edited', async () => {
  const { root, put } = fixture()
  put('packages/extra/package.json', { version: '1.0.0', kernel: '^1.0.0', uses: { 'library': '^1.0.0' } })
  lockFixture(root)
  const ws = openPackage('extra', root)
  assert.ok(ws.content().registries.part['library/apply'])
  const wrongLayer = await runChangeset(ws, { ops: [{ op: 'override.put', layer: 'library', kind: 'part', name: 'library/apply', merge: true, data: { desc: 'Wrong layer' } }] })
  assert.equal(wrongLayer.ok, false)
  assert.match(wrongLayer.problems[0], /open layer library/)
  const gameOp = await runChangeset(ws, { ops: [{ op: 'game.set', path: 'title', value: 'Game title' }] })
  assert.equal(gameOp.ok, false)
  const edited = await runChangeset(ws, { ops: [{ op: 'override.put', layer: 'extra', kind: 'part', name: 'library/apply', merge: true, data: { desc: 'Local override' } }] }, { write: true })
  assert.equal(edited.ok, true, edited.problems.join('\n'))
  assert.deepEqual(edited.files, ['packages/extra/overrides/library/parts/apply.json'])
  assert.equal(readPackage('library', root).partDefs.parts['library/apply'].desc, 'Apply an implication.')
  assert.equal(readPackage('extra', root).partDefs.parts['library/apply'].desc, 'Local override')
  assert.deepEqual(readLog(openPackage('library', root)), [])
})

test('games can edit only their own layer and cannot undo a package log entry', async () => {
  const { root, id } = proofsRoot()
  roots.push(root)
  const ws = openGame(id, root)
  const before = readFileSync(resolve(root, 'packages', id, 'parts/mp.json'), 'utf8')
  const refused = await runChangeset(ws, { ops: [{ op: 'parts.set', path: ['parts', 'mp', 'desc'], value: 'Forbidden' }] })
  assert.equal(refused.ok, false)
  const result = await runChangeset(ws, { ops: [{ op: 'game.set', path: 'title', value: 'New game title' }] }, { write: true })
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.deepEqual(result.files, [`games/${id}/game.json`, `games/${id}/i18n/en.json`])
  assert.equal(readFileSync(resolve(root, 'packages', id, 'parts/mp.json'), 'utf8'), before)
  assert.equal(readContent(id, root).title, 'New game title')
  assert.equal((await undo(openPackage(id, root))).ok, false)
})

test('default check targets include every game followed by unplayed packages; names can be disambiguated', () => {
  const { root, id } = proofsRoot()
  roots.push(root)
  mkdirSync(resolve(root, 'packages/library'), { recursive: true })
  writeFileSync(resolve(root, 'packages/library/package.json'), JSON.stringify({ version: '1.0.0', kernel: '^1.0.0', uses: {} }))
  assert.deepEqual(contentTargets([], root), [{ id, kind: 'game' }, { id: 'library', kind: 'package' }])
  assert.deepEqual(contentTargets([id], root), [{ id, kind: 'game' }])
  assert.deepEqual(contentTargets([id], root, { package: true }), [{ id, kind: 'package' }])
  assert.throws(() => contentTargets(['missing'], root), /no game or package missing/)
})


test('game course writes maintain the derived hub count without writing package files', async () => {
  const { root, id } = proofsRoot()
  roots.push(root)
  const ws = openGame(id, root)
  const result = await runChangeset(ws, { ops: [{ op: 'game.set', path: 'chapters[0].levels', value: [`${id}/given`, `${id}/apply`] }] }, { write: true, check: false })
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.ok(result.files.includes('games/games.js'))
  assert.ok(result.files.every((file) => file === 'games/games.js' || file.startsWith(`games/${id}/`)))
  assert.match(readFileSync(resolve(root, 'games/games.js'), 'utf8'), /levels: 2/)
})


test('packages reject invalid authored package fields', async () => {
  const { root, put } = fixture()
  put('packages/library/package.json', { version: '1.0.0', kernel: '^1.0.0', uses: {}, unknownField: true })
  assert.throws(() => readPackage('library', root), /unknownField/)
})


test('package lists use order relations, then prerequisites, without constructing chapters', () => {
  const content = { levels: ['p/a', 'p/b', 'p/c'].map(id => ({ id })),
    relationEdges: { order: [{ from: 'p/c', to: 'p/b', of: 'level' }], requires: [{ from: 'p/b', to: 'p/a' }] } }
  assert.deepEqual(packageLevelOrder(content), ['p/c', 'p/b', 'p/a'])
  assert.equal('eras' in content, false)
})

test('symbol files, wording, typed tags and overrides use symbols throughout authoring', async () => {
  const { root, put } = fixture()
  put('packages/library/symbols/and.json', { mark: 'logic:mark-formulaAnd', name: '∧', desc: '@symbol.and.desc', icon: 'Rows3', stages: [{ id: 'wide', name: 'AND' }] })
  put('packages/library/i18n/en.json', { 'symbol.and.desc': 'Conjunction' })
  put('packages/library/tags/symbol/formulas.json', { values: ['and'] })
  put('packages/library/trays/mixed.json', { values: ['apply', '#formulas'] })
  put('packages/extra/package.json', { version: '1.0.0', kernel: '^1.0.0', uses: { 'library': '^1.0.0' } })
  put('packages/extra/overrides/library/symbols/and.json', { $merge: true, icon: 'Box' })
  lockFixture(root)
  const content = readPackage('extra', root)
  assert.equal(content.registries.symbol['library/and'].icon, 'Box')
  assert.equal(content.registries.symbol['library/and'].desc.en, 'Conjunction')
  assert.deepEqual(content.objectProblems, [])
  assert.deepEqual(content.trays['library/mixed'].items, ['library/and', 'library/apply'])
  const ws = openPackage('library', root)
  const result = await runChangeset(ws, { why: 'Edit a symbol.', ops: [{ op: 'symbol.set', symbol: 'and', path: 'icon', value: 'Box' }, { op: 'text.set', symbol: 'and', path: 'desc', lang: 'en', value: 'Both sentences' }] }, { write: true, check: false })
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.ok(existsSync(resolve(root, 'packages/library/symbols/and.json')))
  assert.equal(existsSync(resolve(root, 'packages/library/symbol/and.json')), false)
  assert.equal(readPackage('library', root).registries.symbol['library/and'].desc.en, 'Both sentences')
})
