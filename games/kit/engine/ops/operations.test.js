// node --test games/kit/engine/ops — every operation on a toy game in a temp folder: what it changes, what it
// refuses, the save ops it says it needs, and that its inverse puts the content back exactly.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { S } from '../schema.js'
import { defineVocabulary } from '../vocabulary.js'
import { OPERATIONS } from './operations.js'
import { openGame } from './workspace.js'
import { runChangeset, readLog, undo } from './changeset.js'

const levels = S.list(S.level())
const ERA = S.obj({
  id: S.str(),
  foundation: S.list(S.either(S.level(), S.obj({ parallel: S.list(S.obj({ id: S.str(), levels })) }))),
  practice: S.opt(S.list(S.level())),
  topics: S.opt(S.list(S.obj({ id: S.str(), levels, after: S.opt(S.level()) }))),
  challenges: S.opt(S.list(S.obj({ level: S.level(), after: S.opt(S.level()) }))),
})
const VOCAB = defineVocabulary({
  domain: 'toy',
  version: 1,
  kinds: { part: { a: { about: 'a' }, b: { about: 'b' }, c: { about: 'c' } } },
  game: S.obj({ title: S.text(), eras: S.list(ERA), carry: S.opt(S.map(S.level())), saves: S.list(S.any()) }),
  level: S.obj({ title: S.text(), brief: S.opt(S.text()), tests: S.opt(S.list(S.any())), adds: S.opt(S.list(S.ref('part'))), solution: S.opt(S.board()), from: S.opt(S.level()), tasks: S.opt(S.list(S.map(S.any()))) }),
})
// The toy's course: the main path in order, every level requiring the one before; a level's tests are its puzzle.
const DOMAIN = {
  vocabulary: VOCAB,
  spec: (content) => {
    const order = content.eras.flatMap((e) => e.foundation.flatMap((i) => (typeof i === 'string' ? [i] : i.parallel.flatMap((b) => b.levels))))
    const course = { index: new Map(order.map((id, k) => [id, k])), levels: order.map((id) => ({ id })), builds: () => [] }
    return { levels: order.map((id, k) => ({ id, requires: k ? [order[k - 1]] : [] })), course }
  },
  changes: { stale: (a, b) => JSON.stringify(a.tests) !== JSON.stringify(b.tests), drop: (ids) => [{ data: { drop: ids } }] },
  tasks: {
    merge: (levels, title) => ({ title, tasks: levels.map(({ title: step, ...rest }) => ({ step, ...rest })) }),
    split: (level) => level.tasks.map(({ step, ...rest }) => ({ title: step, ...rest })),
  },
}

function toy() {
  const root = mkdtempSync(join(tmpdir(), 'ops-toy-'))
  mkdirSync(join(root, 'toy', 'levels'), { recursive: true })
  const put = (file, value) => writeFileSync(join(root, 'toy', file), `${JSON.stringify(value, null, 2)}\n`)
  put('game.json', {
    domain: 'toy', vocabulary: 1, title: 'Toy',
    eras: [{ id: 'one', foundation: ['a1', { parallel: [{ id: 'side', levels: ['a2', 'a3'] }] }] }, { id: 'two', foundation: ['b1', 'b2'], challenges: [{ level: 'c1', after: 'b1' }] }],
    carry: { x: 'a2' },
    saves: [],
  })
  put('glossary.json', { groups: [], entries: [{ id: 'e', group: 'g', title: 'E', body: ['see <level-ref to="a2"></level-ref>'], at: 'a2' }] })
  for (const id of ['a1', 'a2', 'a3', 'b1', 'b2', 'c1']) put(`levels/${id}.json`, { title: { zh: id, en: id }, tests: [1], ...(id === 'b1' && { from: 'a2', brief: { zh: '接着 <level-ref to="a2"></level-ref>', en: 'after <level-ref to="a2"></level-ref>' } }) })
  writeFileSync(join(root, 'games.js'), "export const GAMES = [{ id: 'toy', levels: 6 }]\n")
  return { root, ws: openGame('toy', root) }
}
const run = (ws, op, args) => OPERATIONS[op].apply(ws, args, { vocabulary: VOCAB, domain: DOMAIN })
const undone = (ws, inverse) => { for (const { op, ...args } of inverse) run(ws, op, args) }
/** Runs op, checks its inverse restores the content exactly, and returns what it did (with the content after it). */
function roundTrip(ws, op, args) {
  const before = JSON.stringify(ws.content())
  const done = run(ws, op, args)
  const after = ws.content()
  undone(ws, done.inverse)
  assert.equal(JSON.stringify(ws.content()), before, `${op}: its inverse puts the content back`)
  run(ws, op, args)
  return { ...done, after }
}
const level = (ws, id) => ws.levels.get(id)

test('level.set, level.unset, level.patch and level.replace edit one level', () => {
  const { ws } = toy()
  roundTrip(ws, 'level.set', { level: 'a1', path: 'tests[1]', value: 2 })
  assert.deepEqual(level(ws, 'a1').tests, [1, 2])
  roundTrip(ws, 'level.set', { level: 'a1', path: 'brief', value: { zh: '甲', en: 'A' } })
  // A new field goes where the schema lists it: brief after title, before tests.
  assert.deepEqual(Object.keys(level(ws, 'a1')), ['title', 'brief', 'tests'])
  roundTrip(ws, 'level.unset', { level: 'a1', path: 'tests[0]' })
  assert.deepEqual(level(ws, 'a1').tests, [2])
  roundTrip(ws, 'level.patch', { level: 'a1', fields: { brief: null, adds: ['a'] } })
  assert.deepEqual(level(ws, 'a1'), { title: { zh: 'a1', en: 'a1' }, tests: [2], adds: ['a'] })
  roundTrip(ws, 'level.replace', { level: 'a1', data: { title: 'A' } })
  assert.deepEqual(level(ws, 'a1'), { title: 'A' })
  assert.throws(() => run(ws, 'level.set', { level: 'a1', path: 'x.y', value: 1 }), /no such field/)
  assert.throws(() => run(ws, 'level.unset', { level: 'a1', path: 'brief' }), /nothing there/)
})

test('level.adds adds and takes parts, and drops an empty list', () => {
  const { ws } = toy()
  roundTrip(ws, 'level.adds', { level: 'a2', add: ['a', 'b'] })
  roundTrip(ws, 'level.adds', { level: 'a2', remove: ['a'], add: ['c'] })
  assert.deepEqual(level(ws, 'a2').adds, ['b', 'c'])
  roundTrip(ws, 'level.adds', { level: 'a2', remove: ['b', 'c'] })
  assert.equal(level(ws, 'a2').adds, undefined)
  assert.throws(() => run(ws, 'level.adds', { level: 'a2', remove: ['a'] }), /does not bring in a/)
})

test('level.blueprint writes a board as blueprint text, and only a board', () => {
  const { ws } = toy()
  roundTrip(ws, 'level.blueprint', { level: 'a1', text: '# blueprint 1 toy a1\nm = mp(p, q)\ngoal <- m\n' })
  assert.deepEqual(level(ws, 'a1').solution, ['m = mp(p, q)', 'goal <- m'])
  assert.throws(() => run(ws, 'level.blueprint', { level: 'a1', text: 'm = mp(p' }), /line 1/)
  assert.throws(() => run(ws, 'level.blueprint', { level: 'a1', path: 'brief', text: 'goal <- p' }), /not a board/)
})

test('level.move takes a level out of a branch and puts it anywhere', () => {
  const { ws } = toy()
  const done = roundTrip(ws, 'level.move', { level: 'a3', to: { before: 'b2' } })
  assert.deepEqual(done.placed, ['a3'])
  assert.deepEqual(ws.game.eras[1].foundation, ['b1', 'a3', 'b2'])
  assert.match(done.says, /era one, branch side #2 → era two, foundation path #2/)
  roundTrip(ws, 'level.move', { level: 'a2', to: { era: 'two', path: 'foundation', at: 0 } })
  // The branch it emptied goes with it.
  assert.deepEqual(ws.game.eras[0].foundation, ['a1'])
  roundTrip(ws, 'level.move', { level: 'a1', to: { after: 'b2', on: 'path' } })
  roundTrip(ws, 'level.move', { level: 'b2', to: { era: 'two', challenge: true, hang: 'b1' } })
  assert.deepEqual(ws.game.eras[1].challenges.map((c) => c.level), ['c1', 'b2'])
  assert.throws(() => run(ws, 'level.move', { level: 'b1', to: { branch: 'nowhere' } }), /no branch nowhere/)
})

test('level.rename renames the file and every reference, and asks for a rename in the saves', () => {
  const { ws } = toy()
  const done = roundTrip(ws, 'level.rename', { level: 'a2', to: 'two' })
  assert.deepEqual(done.saves, [{ rename: { a2: 'two' } }])
  assert.ok(ws.levels.has('two') && !ws.levels.has('a2'))
  assert.deepEqual(ws.game.eras[0].foundation[1].parallel[0].levels, ['two', 'a3'])
  assert.deepEqual(ws.game.carry, { x: 'two' })
  assert.equal(level(ws, 'b1').from, 'two')
  assert.equal(level(ws, 'b1').brief.en, 'after <level-ref to="two"></level-ref>')
  assert.equal(ws.glossary.entries[0].at, 'two')
  assert.equal(ws.glossary.entries[0].body[0], 'see <level-ref to="two"></level-ref>')
  assert.throws(() => run(ws, 'level.rename', { level: 'two', to: 'b1' }), /already/)
})

test('level.add puts a new level in; level.remove refuses while anything names the level', () => {
  const { ws } = toy()
  const added = roundTrip(ws, 'level.add', { level: 'n1', data: { title: 'N' }, to: { after: 'a1' } })
  assert.deepEqual(added.placed, ['n1'])
  assert.deepEqual(ws.game.eras[0].foundation, ['a1', 'n1', { parallel: [{ id: 'side', levels: ['a2', 'a3'] }] }])
  const removed = roundTrip(ws, 'level.remove', { level: 'n1' })
  assert.deepEqual(removed.saves, [{ rename: { n1: null } }])
  assert.throws(() => run(ws, 'level.remove', { level: 'a2' }), /still named at game.json carry.x, glossary.json entries\[0\].at, glossary.json entries\[0\].body\[0\], levels\/b1.json from, levels\/b1.json brief.zh/)
  roundTrip(ws, 'level.remove', { level: 'c1' })
  assert.equal(ws.game.eras[1].challenges, undefined)
})

test('level.merge makes levels the tasks of one, level.split gives them back, each with its save op', () => {
  const { ws } = toy()
  const merged = run(ws, 'level.merge', { levels: ['b1', 'b2'], into: 'b2' })
  assert.deepEqual(merged.saves, [{ merge: ['b2', ['b1', 'b2']] }])
  assert.deepEqual(merged.own, ['b2', 'b1', 'b2'])
  assert.deepEqual(level(ws, 'b2').tasks.map((t) => t.step.en), ['b1', 'b2'])
  assert.ok(!ws.levels.has('b1'))
  assert.deepEqual(ws.game.eras[1].foundation, ['b2'])
  // What named b1 names the level it is a task of now.
  assert.equal(ws.game.eras[1].challenges[0].after, 'b2')
  const split = run(ws, 'level.split', { level: 'b2', into: ['b1', 'b2'] })
  assert.deepEqual(split.saves, [{ split: ['b2', ['b1', 'b2']] }])
  assert.deepEqual(ws.game.eras[1].foundation, ['b1', 'b2'])
  assert.deepEqual(level(ws, 'b1'), toy().ws.levels.get('b1'))
  assert.deepEqual(split.inverse, [{ op: 'level.merge', levels: ['b1', 'b2'], into: 'b2' }])
  assert.throws(() => run(ws, 'level.split', { level: 'b1', into: ['x', 'y'] }), /b1 is no level of tasks/)
  assert.throws(() => OPERATIONS['level.merge'].apply(ws, { levels: ['a1', 'a3'], into: 'a1' }, { vocabulary: VOCAB }), /gives no way to merge/)
})

test('game.set and game.unset edit game.json, but never its saves', () => {
  const { ws } = toy()
  roundTrip(ws, 'game.set', { path: 'title', value: { zh: '玩具', en: 'Toy' } })
  roundTrip(ws, 'game.unset', { path: 'carry' })
  assert.equal(ws.game.carry, undefined)
  assert.throws(() => run(ws, 'game.set', { path: 'saves', value: [] }), /migration generator/)
})

test('text.set changes one side of a text, wherever it is', () => {
  const { ws } = toy()
  roundTrip(ws, 'text.set', { level: 'b1', path: 'brief', en: 'then' })
  assert.deepEqual(level(ws, 'b1').brief, { zh: '接着 <level-ref to="a2"></level-ref>', en: 'then' })
  roundTrip(ws, 'text.set', { in: 'game', path: 'title', zh: '玩具' })
  assert.deepEqual(ws.game.title, { zh: '玩具', en: 'Toy' })
  run(ws, 'text.set', { in: 'glossary', path: 'entries[0].title', en: 'Entry' })
  assert.deepEqual(ws.glossary.entries[0].title, { zh: 'E', en: 'Entry' })
  assert.throws(() => run(ws, 'text.set', { level: 'b1', path: 'from', en: 'x' }), /not a text/)
})

test('glossary.put, glossary.set and glossary.remove edit the encyclopedia', () => {
  const { ws } = toy()
  roundTrip(ws, 'glossary.put', { entry: 'f', data: { group: 'g', title: 'F', body: [] } })
  assert.deepEqual(ws.glossary.entries.map((e) => e.id), ['e', 'f'])
  roundTrip(ws, 'glossary.set', { entry: 'e', fields: { title: 'E2', at: null } })
  assert.deepEqual(ws.glossary.entries[0], { id: 'e', group: 'g', title: 'E2', body: ['see <level-ref to="a2"></level-ref>'] })
  roundTrip(ws, 'glossary.remove', { entry: 'e' })
  assert.deepEqual(ws.glossary.entries.map((e) => e.id), ['f'])
})

test('a changeset is checked as a whole, writes only when it passes, logs, and undoes', async () => {
  const { root, ws } = toy()
  const refused = await runChangeset(ws, { ops: [{ op: 'level.move', level: 'b2', to: { before: 'a1' } }, { op: 'level.set', level: 'a1', path: 'from', value: 'gone' }] }, { write: true, check: false, domain: DOMAIN })
  assert.equal(refused.ok, false)
  assert.match(refused.problems[0], /levels\/a1.json.from: "gone" is no level of this game/)
  assert.deepEqual(readLog(ws), [])
  const bad = await runChangeset(ws, { ops: [{ op: 'level.move', level: 'nope', to: { before: 'a1' } }] }, { domain: DOMAIN, check: false })
  assert.match(bad.problems[0], /^op 1 \(level.move\): level: "nope" is no level of this game/)

  const why = 'b2 first, a rewritten puzzle, a new name'
  const done = await runChangeset(ws, { why, ops: [
    { op: 'level.move', level: 'b2', to: { before: 'a1' } },
    { op: 'level.set', level: 'a3', path: 'tests', value: [2] },
    { op: 'level.rename', level: 'b2', to: 'first' },
    { op: 'level.add', level: 'n1', data: { title: 'N' }, to: { after: 'first' } },
  ] }, { write: true, check: false, domain: DOMAIN })
  assert.equal(done.ok, true, done.problems.join('\n'))
  assert.deepEqual(done.step, { version: 2, ops: [{ rename: { b2: 'first' } }, { data: { drop: ['a3'] } }, { solve: ['a1', ['first', 'n1']] }] })
  assert.ok(existsSync(join(root, 'toy', 'levels', 'first.json')) && !existsSync(join(root, 'toy', 'levels', 'b2.json')))
  assert.match(readFileSync(join(root, 'games.js'), 'utf8'), /levels: 7/)
  assert.deepEqual(readLog(ws).map((e) => [e.seq, e.why, e.files.length]), [[1, why, 6]])

  const back = await undo(ws, { write: true, check: false, domain: DOMAIN })
  assert.equal(back.ok, true, back.problems.join('\n'))
  assert.deepEqual(ws.game.eras, toy().ws.game.eras)
  assert.deepEqual(back.step.ops[0], { rename: { n1: null } })
  assert.deepEqual(readLog(ws).map((e) => e.undoes), [undefined, 1])
  assert.match((await undo(ws, { domain: DOMAIN, check: false })).problems[0], /nothing to undo/)
})
