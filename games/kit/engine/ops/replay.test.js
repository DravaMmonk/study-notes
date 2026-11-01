// node --test games/kit/engine/ops — real re-orderings of the prototype games done again through operations alone
// (games/DIRECTION.md decision 10: the prototypes are fixtures). Each starts from a commit's parent, read from git
// into a temp folder, applies a changeset with every check on, and must end where the commit's hand edit ended, with
// an equivalent save migration that passes a save test.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { migrations } from '../../shell/saves.js'
import { closeGames } from '../games.mjs'
import { domainOf, readContent } from '../content-node.js'
import { openGame } from './workspace.js'
import { runChangeset, undo } from './changeset.js'

const REPO = resolve(import.meta.dirname, '../../../..')
const git = (...args) => execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 1 << 28 })
/** The games folder at `rev` (just these games and the hub's list), in a temp folder. */
function gamesAt(rev, games) {
  const dir = mkdtempSync(join(tmpdir(), 'ops-replay-'))
  execFileSync('tar', ['-x', '-C', dir], { input: git('archive', rev, 'games/games.js', ...games.map((g) => `games/${g}`)), maxBuffer: 1 << 28 })
  return join(dir, 'games')
}
const show = (rev, file) => git('show', `${rev}:games/${file}`).toString()
const file = (root, name) => readFileSync(join(root, name), 'utf8')
/** A save brought up to date by a game's saves, as the shell does (its domain resolves the migration items). */
const migrated = async (content, save) => migrations((await domainOf(content)).saves(content.saves)).migrate(save)

after(closeGames)

test('c8fc67d, Q.E.D.: Every goal moves from the tactics chapter to just before Zero on the right', async () => {
  const root = gamesAt('c8fc67d^', ['qed'])
  const result = await runChangeset(openGame('qed', root), { ops: [
    { op: 'level.move', level: 's-each', to: { before: 'in-zero', on: 'path' } },
    { op: 'game.unset', path: 'open' },
  ] }, { write: true })
  assert.equal(result.ok, true, result.problems.join('\n'))
  // Moved later, it passes over levels nobody is handed; everyone past the tactics chapter had solved it: no step,
  // as the commit wrote none.
  assert.equal(result.step, null)
  assert.equal(file(root, 'qed/game.json'), show('c8fc67d', 'qed/game.json'))
})

test('c8fc67d, the trial: Suppose and Case by case get new puzzles, and their kept boards are dropped', async () => {
  const root = gamesAt('c8fc67d^', ['qed-lab'])
  const target = (id) => JSON.parse(show('c8fc67d', `qed-lab/levels/${id}.json`))
  const [box, cases] = [target('box'), target('cases')]
  const why = 'Version 2 gave Suppose and Case by case new puzzles that put ∧ and ∨ back to work: their kept boards solve the old ones, so they start afresh.'
  const result = await runChangeset(openGame('qed-lab', root), { why, ops: [
    { op: 'level.patch', level: 'box', fields: { tests: box.tests, brief: box.brief, hint: box.hint, intro: box.intro, solution: box.solution } },
    { op: 'level.patch', level: 'cases', fields: { tests: cases.tests, cases: cases.cases, brief: cases.brief, hint: cases.hint, solution: cases.solution } },
    { op: 'game.unset', path: 'open' },
  ] }, { write: true })
  assert.equal(result.ok, true, result.problems.join('\n'))
  const written = JSON.parse(show('c8fc67d', 'qed-lab/game.json')).saves[0]
  assert.deepEqual(result.step, written)
  for (const name of ['game.json', 'levels/box.json', 'levels/cases.json']) assert.equal(file(root, `qed-lab/${name}`), show('c8fc67d', `qed-lab/${name}`), name)

  // The save test: an old save keeps what still applies and loses what answers the old puzzles, as the hand-written
  // step does.
  const content = readContent('qed-lab', root)
  const board = (n) => ({ nodes: [{ id: `n${n}`, type: 'mp' }], wires: [] })
  const old = { version: 1, solved: ['copy', 'apply', 'box', 'cases'], data: { apply: board(1), box: board(2), cases: board(3) }, slots: { box: { at: 0, list: [{ name: 'a', data: board(4) }] } } }
  const now = await migrated(content, old)
  assert.deepEqual(Object.keys(now.data).filter((id) => now.data[id] !== undefined), ['apply'])
  assert.equal(now.slots.box.list[0].data, undefined)
  assert.deepEqual(now.solved, old.solved)
  const byHand = migrations((await domainOf(content)).saves([written])).migrate(old)
  assert.deepEqual(JSON.parse(JSON.stringify(now)), JSON.parse(JSON.stringify(byHand)))
})

test('78e09bf, State Graph: Not comes in at Take the stones instead of Out of reach', async () => {
  const root = gamesAt('78e09bf^', ['state-graph'])
  const result = await runChangeset(openGame('state-graph', root), { ops: [
    { op: 'level.adds', level: 'reach', remove: ['not'] },
    { op: 'level.adds', level: 'nim', add: ['not'] },
    { op: 'game.unset', path: 'open' },
  ] }, { write: true })
  assert.equal(result.ok, true, result.problems.join('\n'))
  // A circuit keeps working whatever the tray offers: no step, as the commit wrote none.
  assert.equal(result.step, null)
  for (const name of ['game.json', 'levels/reach.json', 'levels/nim.json']) assert.equal(file(root, `state-graph/${name}`), show('78e09bf', `state-graph/${name}`), name)
  // Its course is laid out by its eras: nim put before stairs is counted solved for whoever solved stairs.
  const earlier = await runChangeset(openGame('state-graph', root), { ops: [{ op: 'level.move', level: 'nim', to: { before: 'stairs' } }] }, { check: false })
  assert.deepEqual(earlier.step.ops, [{ solve: ['stairs', ['nim']] }])
})

test('a level renamed and moved into an earlier era: the migration is generated, an old save passes, and it undoes', async () => {
  const root = gamesAt('HEAD', ['syntax-graph'])
  const before = Object.fromEntries(['game.json', 'glossary.json', 'levels/2-1.json'].map((name) => [name, file(root, `syntax-graph/${name}`)]))
  const ws = openGame('syntax-graph', root)
  const result = await runChangeset(ws, { ops: [
    { op: 'level.rename', level: '2-1', to: 'adverbial' },
    { op: 'level.move', level: 'adverbial', to: { before: '1-6' } },
  ] }, { write: true })
  assert.equal(result.ok, true, result.problems.join('\n'))
  const version = Math.max(1, ...JSON.parse(before['game.json']).saves.map((s) => s.version)) + 1
  assert.deepEqual(result.step, { version, ops: [{ rename: { '2-1': 'adverbial' } }, { solve: ['1-6', ['adverbial']] }] })
  assert.ok(existsSync(join(root, 'syntax-graph/levels/adverbial.json')) && !existsSync(join(root, 'syntax-graph/levels/2-1.json')))
  // The renamed file keeps its text: only its name changed.
  assert.equal(file(root, 'syntax-graph/levels/adverbial.json'), before['levels/2-1.json'])

  const content = readContent('syntax-graph', root)
  const reading = { folds: [[3, 5]] }
  const ahead = await migrated(content, { version: version - 1, solved: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '2-1', '2-2'], data: { '2-1': reading }, introSeen: { '2-1': true } })
  assert.deepEqual(ahead.data, { adverbial: reading })
  assert.deepEqual(ahead.introSeen, { adverbial: true })
  assert.deepEqual(ahead.solved, ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', 'adverbial', '2-2'])
  // Solved past it in the old order without playing it: counted solved, so the path ahead is not sent back to it.
  const skipped = await migrated(content, { version: version - 1, solved: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6'] })
  assert.ok(skipped.solved.includes('adverbial'))
  const early = await migrated(content, { version: version - 1, solved: ['1-1', '1-2', '1-3', '1-4', '1-5'] })
  assert.ok(!early.solved.includes('adverbial'))

  const back = await undo(ws, { write: true })
  assert.equal(back.ok, true, back.problems.join('\n'))
  assert.deepEqual(back.step, { version: version + 1, ops: [{ rename: { adverbial: '2-1' } }] })
  for (const name of ['glossary.json', 'levels/2-1.json']) assert.equal(file(root, `syntax-graph/${name}`), before[name], name)
  const eras = (text) => JSON.parse(text).eras
  assert.deepEqual(eras(file(root, 'syntax-graph/game.json')), eras(before['game.json']))
})
