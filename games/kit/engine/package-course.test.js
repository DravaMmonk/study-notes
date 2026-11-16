// Independent package authoring uses synthetic content and the existing domain readers.
import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { contentTargets, domainOf, readContent, readPackage } from './content-node.js'
import { checkGame } from './checks.js'
import { closeGames, gameOf } from './games.mjs'
import { holds, usable } from '../course.js'
import { openGame, openPackage } from './ops/workspace.js'
import { adopt, readLog, runChangeset, undo } from './ops/changeset.js'
import { proofsRoot } from './ops/fixture.js'

const roots = []
after(async () => {
  await closeGames()
  roots.forEach((root) => rmSync(root, { recursive: true, force: true }))
})
const fixture = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'package-course-'))
  roots.push(root)
  const put = (file, value) => {
    const path = resolve(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
  }
  put('packages/library/package.json', { domain: 'logic', vocabulary: 1 })
  put('packages/library/pieces/apply.json', { name: 'Apply', desc: 'Apply an implication.', icon: 'GitFork', family: 'logic:family-rule', inputs: [{ name: 'imp', type: 'logic:judgment' }, { name: 'a', type: 'logic:judgment' }], outputType: 'logic:judgment', compute: 'logic:mp(imp, a)' })
  return { root, put }
}

test('a pieces-only package opens, generates a course, checks and writes its own log without a game', async () => {
  const { root } = fixture()
  const ws = openPackage('library', root)
  const content = ws.content()
  assert.deepEqual(ws.changes(), [])
  assert.deepEqual(content.levels, [])
  assert.deepEqual(content.eras.map((era) => era.levels), [[]])
  assert.ok(content.primitives.includes('library/apply'))
  const domain = await domainOf(content)
  assert.deepEqual((await checkGame(content, { domain, root })).filter((line) => line.fail), [])
  const game = await gameOf(content)
  assert.deepEqual(game.levels, [])
  adopt(ws, 'Start the independent library log.')
  const result = await runChangeset(ws, { ops: [{ op: 'pieces.set', path: ['parts', 'apply', 'desc'], value: 'Use the implication rule.' }] }, { write: true })
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

test('tag chapters retain titles, nesting, layouts, cross-chapter relations and all available pieces', async () => {
  const { root, id } = proofsRoot()
  roots.push(root)
  const put = (folder, name, value) => {
    mkdirSync(resolve(root, 'packages', id, folder), { recursive: true })
    writeFileSync(resolve(root, 'packages', id, folder, `${name}.json`), JSON.stringify(value))
  }
  put('tags/level', 'a', { title: 'First tag', values: ['#nested'] })
  put('tags/level', 'nested', { title: 'Nested tag', values: ['given'] })
  put('tags/level', 'b', { title: 'Second tag', values: ['apply'] })
  put('tags/entry', 'terms', { title: 'Terms', values: ['term'] })
  put('entries', 'term', { title: 'Term', body: ['A named expression used in a proof.'] })
  put('tags/item', 'tools', { values: ['impI'] })
  put('layouts', 'map', { of: '#a', rows: [['given']] })
  const content = readPackage(id, root)
  assert.deepEqual(content.eras.map((era) => era.chapter.title), ['First tag', 'Second tag', 'Nested tag', id])
  assert.deepEqual(content.eras.map((era) => era.levels.map((level) => level.id)), [[`${id}/given`], [`${id}/apply`], [], [`${id}/suppose`]])
  assert.deepEqual(content.eras[0].rows, [[`${id}/given`]])
  assert.ok(content.relationEdges.requires.some((edge) => edge.from === `${id}/given` && edge.to === `${id}/apply`))
  assert.deepEqual(openPackage(id, root).content().eras, content.eras)
  assert.ok(content.glossary.groups.some((group) => group.id === `${id}/terms`))
  const { course } = (await domainOf(content)).spec(content)
  assert.ok(usable(course, { id: `${id}/given`, task: 0 }, new Set()).includes(`${id}/impI`))
  assert.equal(holds(course, { id: `${id}/given`, task: 0 }, new Set())(`${id}/impI`, 'A'), true)
  assert.deepEqual((await checkGame(content, { domain: await domainOf(content), root })).filter((line) => line.fail), [])
})

test('package dependencies are readable while only the selected layer can be edited', async () => {
  const { root, put } = fixture()
  put('packages/extra/package.json', { domain: 'logic', vocabulary: 1, uses: ['library'] })
  const ws = openPackage('extra', root)
  assert.ok(ws.content().registries.piece['library/apply'])
  const wrongLayer = await runChangeset(ws, { ops: [{ op: 'override.put', layer: 'library', kind: 'piece', name: 'library/apply', merge: true, data: { desc: 'Wrong layer' } }] })
  assert.equal(wrongLayer.ok, false)
  assert.match(wrongLayer.problems[0], /open layer library/)
  const gameOp = await runChangeset(ws, { ops: [{ op: 'game.set', path: 'title', value: 'Game title' }] })
  assert.equal(gameOp.ok, false)
  const edited = await runChangeset(ws, { ops: [{ op: 'override.put', layer: 'extra', kind: 'piece', name: 'library/apply', merge: true, data: { desc: 'Local override' } }] }, { write: true })
  assert.equal(edited.ok, true, edited.problems.join('\n'))
  assert.deepEqual(edited.files, ['packages/extra/overrides/library/piece/apply.json'])
  assert.equal(readPackage('library', root).partDefs.parts['library/apply'].desc, 'Apply an implication.')
  assert.equal(readPackage('extra', root).partDefs.parts['library/apply'].desc, 'Local override')
  assert.deepEqual(readLog(openPackage('library', root)), [])
})

test('games can edit only their own layer and cannot undo a package log entry', async () => {
  const { root, id } = proofsRoot()
  roots.push(root)
  const ws = openGame(id, root)
  const before = readFileSync(resolve(root, 'packages', id, 'pieces/mp.json'), 'utf8')
  const refused = await runChangeset(ws, { ops: [{ op: 'pieces.set', path: ['parts', 'mp', 'desc'], value: 'Forbidden' }] })
  assert.equal(refused.ok, false)
  const result = await runChangeset(ws, { ops: [{ op: 'game.set', path: 'title', value: 'New game title' }] }, { write: true })
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.deepEqual(result.files, [`games/${id}/game.json`, `games/${id}/i18n/en.json`])
  assert.equal(readFileSync(resolve(root, 'packages', id, 'pieces/mp.json'), 'utf8'), before)
  assert.equal(readContent(id, root).title, 'New game title')
  assert.equal((await undo(openPackage(id, root))).ok, false)
})

test('default check targets include every game followed by unplayed packages; names can be disambiguated', () => {
  const { root, id } = proofsRoot()
  roots.push(root)
  mkdirSync(resolve(root, 'packages/library'), { recursive: true })
  writeFileSync(resolve(root, 'packages/library/package.json'), JSON.stringify({ domain: 'logic', vocabulary: 1 }))
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


test('generated courses still reject invalid authored package fields', async () => {
  const { root, put } = fixture()
  put('packages/library/package.json', { domain: 'logic', vocabulary: 1, unknownField: true })
  const content = readPackage('library', root)
  const failures = (await checkGame(content, { domain: await domainOf(content), root })).filter((line) => line.fail)
  assert.ok(failures.some((line) => line.text.includes('unknownField')), failures.map((line) => line.text).join('\n'))
})
