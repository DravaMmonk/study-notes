// node --test games/kit/engine/ops — every operation on a toy game in a temp folder: what it changes, what it
// refuses, and that its inverse puts the content back exactly.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { S } from '../schema.js'
import { defineVocabulary } from '../vocabulary.js'
import { OPERATIONS } from './operations.js'
import { openGame } from './workspace.js'
import { adopt, runChangeset, readLog, undo } from './changeset.js'
import { driftOf } from './log.js'
import { withParts } from '../parts/define.js'
import { taskLevel } from '../tasks.js'

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
  game: S.obj({ title: S.text(), eras: S.list(ERA), carry: S.opt(S.map(S.level())) }),
  // What a toy level says once is its whole puzzle; its one task is only its id.
  level: taskLevel({ title: S.text(), brief: S.opt(S.text()), tests: S.opt(S.list(S.any())), adds: S.opt(S.list(S.ref('part'))), solution: S.opt(S.board()), from: S.opt(S.level()) }, {}),
})
// The toy's course: the main path in order, every level requiring the one before.
const DOMAIN = {
  vocabulary: VOCAB,
  spec: (content) => {
    const order = content.eras.flatMap((e) => e.foundation.flatMap((i) => (typeof i === 'string' ? [i] : i.parallel.flatMap((b) => b.levels))))
    const course = { index: new Map(order.map((id, k) => [id, k])), levels: order.map((id) => ({ id })), builds: () => [] }
    return { levels: order.map((id, k) => ({ id, requires: k ? [order[k - 1]] : [] })), course }
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
  })
  put('glossary.json', { groups: [{ id: 'g', title: 'G' }], entries: [{ id: 'e', group: 'g', title: 'E', body: ['see <level-ref to="a2"></level-ref>'], at: 'a2' }] })
  for (const id of ['a1', 'a2', 'a3', 'b1', 'b2', 'c1']) put(`levels/${id}.json`, { title: { zh: id, en: id }, tests: [1], ...(id === 'b1' && { from: 'a2', brief: { zh: '接着 <level-ref to="a2"></level-ref>', en: 'after <level-ref to="a2"></level-ref>' } }), tasks: [{ id }] })
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
  assert.deepEqual(Object.keys(level(ws, 'a1')), ['title', 'brief', 'tests', 'tasks'])
  roundTrip(ws, 'level.unset', { level: 'a1', path: 'tests[0]' })
  assert.deepEqual(level(ws, 'a1').tests, [2])
  roundTrip(ws, 'level.patch', { level: 'a1', fields: { brief: null, adds: ['a'] } })
  assert.deepEqual(level(ws, 'a1'), { title: { zh: 'a1', en: 'a1' }, tests: [2], adds: ['a'], tasks: [{ id: 'a1' }] })
  roundTrip(ws, 'level.replace', { level: 'a1', data: { title: 'A', tasks: [{ id: 'a1' }] } })
  assert.deepEqual(level(ws, 'a1'), { title: 'A', tasks: [{ id: 'a1' }] })
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
  roundTrip(ws, 'level.blueprint', { level: 'a1', path: 'solution', text: '# blueprint 1 toy a1\nm = mp(p, q)\ngoal <- m\n' })
  assert.deepEqual(level(ws, 'a1').solution, ['m = mp(p, q)', 'goal <- m'])
  assert.throws(() => run(ws, 'level.blueprint', { level: 'a1', path: 'solution', text: 'm = mp(p' }), /line 1/)
  assert.throws(() => run(ws, 'level.blueprint', { level: 'a1', path: 'brief', text: 'goal <- p' }), /not a board/)
})

test('level.move takes a level out of a branch and puts it anywhere', () => {
  const { ws } = toy()
  const done = roundTrip(ws, 'level.move', { level: 'a3', to: { before: 'b2' } })
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

test('level.rename renames the file and every reference', () => {
  const { ws } = toy()
  roundTrip(ws, 'level.rename', { level: 'a2', to: 'two' })
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
  assert.deepEqual(ws.game.eras[0].foundation, ['a1', 'n1', { parallel: [{ id: 'side', levels: ['a2', 'a3'] }] }])
  roundTrip(ws, 'level.remove', { level: 'n1' })
  assert.throws(() => run(ws, 'level.remove', { level: 'a2' }), /still named at game.json carry.x, glossary.json entries\[0\].at, glossary.json entries\[0\].body\[0\], levels\/b1.json from, levels\/b1.json brief.zh/)
  roundTrip(ws, 'level.remove', { level: 'c1' })
  assert.equal(ws.game.eras[1].challenges, undefined)
})

test('game.set and game.unset edit game.json', () => {
  const { ws } = toy()
  roundTrip(ws, 'game.set', { path: 'title', value: { zh: '玩具', en: 'Toy' } })
  roundTrip(ws, 'game.unset', { path: 'carry' })
  assert.equal(ws.game.carry, undefined)
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

test('the log keeps each file’s hashes; a write lands only on the files and the log it was made on', async () => {
  const { root, ws } = toy()
  const one = { ops: [{ op: 'level.set', level: 'a1', path: 'brief', value: 'one' }] }
  const done = await runChangeset(ws, one, { write: true, check: false, domain: DOMAIN })
  assert.equal(done.ok, true, done.problems.join('\n'))
  const [entry] = readLog(ws)
  assert.deepEqual(entry.files.map((f) => [f.file, typeof f.before, typeof f.after]), [['toy/levels/a1.json', 'string', 'string']])
  // Two writers that opened the game at once: the second is refused, the first's change stands.
  const a = openGame('toy', root)
  const b = openGame('toy', root)
  assert.equal((await runChangeset(a, { ops: [{ op: 'level.set', level: 'a2', path: 'brief', value: 'a' }] }, { write: true, check: false, domain: DOMAIN })).ok, true)
  const late = await runChangeset(b, { ops: [{ op: 'level.set', level: 'a2', path: 'brief', value: 'b' }] }, { write: true, check: false, domain: DOMAIN })
  assert.match(late.problems[0], /changed on disk since the game was opened: toy\/levels\/a2.json/)
  assert.equal(JSON.parse(readFileSync(join(root, 'toy', 'levels', 'a2.json'), 'utf8')).brief, 'a')
  // A base that is not the log's last entry is refused.
  const stale = await runChangeset(openGame('toy', root), one, { write: true, check: false, base: 1, domain: DOMAIN })
  assert.match(stale.problems[0], /changed since you saw it \(its log is at #2, not #1\)/)
  assert.deepEqual(readLog(ws).map((e) => e.seq), [1, 2])
  // A file changed by hand: drift, and the change before it cannot be undone over it; adopting takes it.
  writeFileSync(join(root, 'toy', 'levels', 'a2.json'), `${JSON.stringify({ title: { zh: 'a2', en: 'a2' }, tests: [1], brief: 'hand' }, null, 2)}\n`)
  const now = openGame('toy', root)
  assert.deepEqual(driftOf(now, now.onDisk()), ['toy/levels/a2.json'])
  assert.match((await undo(now, { write: true, check: false, domain: DOMAIN })).problems[0], /#2 cannot be undone: changed since it was made: toy\/levels\/a2.json/)
  adopt(now, 'edited by hand')
  assert.deepEqual(driftOf(now, now.onDisk()), [])
})

test('a changeset whose domain throws while it is settled is refused and leaves the workspace as it was', async () => {
  const op = { ops: [{ op: 'level.set', level: 'a1', path: 'tests', value: [9] }] }
  // The domain's spec throws, or its checks do, while the whole game is checked.
  for (const broken of [{ ...DOMAIN, spec: () => { throw new Error('the domain broke') } }, { ...DOMAIN, validate: () => { throw new Error('the checks broke') } }]) {
    const { root, ws } = toy()
    const before = JSON.stringify(ws.content())
    const files = () => ['game.json', 'levels/a1.json'].map((f) => readFileSync(join(root, 'toy', f), 'utf8')).join()
    const disk = files()
    const r = await runChangeset(ws, op, { write: true, check: true, domain: broken })
    assert.equal(r.ok, false)
    assert.match(r.problems[0], /^the changeset could not be settled: /)
    assert.equal(JSON.stringify(ws.content()), before)
    assert.equal(files(), disk, 'nothing on disk changed')
    assert.deepEqual(readLog(ws), [])
  }
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
    { op: 'level.add', level: 'n1', data: { title: 'N', tasks: [{ id: 'n1' }] }, to: { after: 'first' } },
  ] }, { write: true, check: false, domain: DOMAIN })
  assert.equal(done.ok, true, done.problems.join('\n'))
  assert.ok(existsSync(join(root, 'toy', 'levels', 'first.json')) && !existsSync(join(root, 'toy', 'levels', 'b2.json')))
  assert.match(readFileSync(join(root, 'games.js'), 'utf8'), /levels: 7/)
  assert.deepEqual(readLog(ws).map((e) => [e.seq, e.why, e.files.length]), [[1, why, 6]])

  const back = await undo(ws, { write: true, check: false, domain: DOMAIN })
  assert.equal(back.ok, true, back.problems.join('\n'))
  assert.deepEqual(ws.game.eras, toy().ws.game.eras)
  assert.deepEqual(readLog(ws).map((e) => e.undoes), [undefined, 1])
  assert.match((await undo(ws, { domain: DOMAIN, check: false })).problems[0], /nothing to undo/)
})

test('tasks by id: task.add, task.move in a level and across levels, task.rename, task.remove, each undone', async () => {
  const T = defineVocabulary({ domain: 'tasked', version: 1, kinds: {}, game: VOCAB.game, level: taskLevel({ title: S.text() }, { brief: S.text() }) })
  const tx = (s) => ({ zh: s, en: s })
  const levels = new Map([['p', { title: tx('p'), tasks: [{ id: 'p', brief: tx('p1') }, { id: 'p2', brief: tx('p2') }] }], ['q', { title: tx('q'), tasks: [{ id: 'q', brief: tx('q1') }] }], ['r', { title: tx('r'), tasks: [{ id: 'r1', brief: tx('r1') }] }]])
  const ws = { levels: new Map(levels), game: { eras: [] } }
  const go = (op, args) => OPERATIONS[op].apply(ws, args, { vocabulary: T, domain: null })
  const ids = (id) => ws.levels.get(id).tasks.map((x) => x.id)
  const before = JSON.stringify([...ws.levels])
  // A level's only task moved out leaves it empty, for the same changeset to remove (the check refuses it otherwise).
  const merged = go('task.move', { task: 'r1', to: { level: 'q' } })
  assert.deepEqual([ws.levels.get('r').tasks, ids('q')], [[], ['q', 'r1']])
  for (const { op, ...args } of merged.inverse) go(op, args)
  const added = go('task.add', { level: 'p', data: { brief: tx('new') }, first: true })
  assert.deepEqual(ids('p'), ['p_2', 'p', 'p2'])
  assert.throws(() => go('task.add', { level: 'q', data: { id: 'p', brief: tx('x') } }), /there is a task p already/)
  assert.throws(() => go('task.add', { level: 'p', data: { id: 'r', brief: tx('x') } }), /r is a level’s id/)
  const inLevel = go('task.move', { task: 'p2', to: { level: 'p', first: true } })
  assert.deepEqual(ids('p'), ['p2', 'p_2', 'p'])
  const across = go('task.move', { task: 'p', to: { level: 'q', after: 'q' } })
  assert.deepEqual([ids('p'), ids('q')], [['p2', 'p_2'], ['q', 'p']])
  const renamed = go('task.rename', { task: 'p_2', to: 'two' })
  assert.deepEqual(ids('p'), ['p2', 'two'])
  assert.throws(() => go('task.remove', { task: 'r1' }), /only task: remove the level/)
  const removed = go('task.remove', { task: 'two' })
  assert.deepEqual(ids('p'), ['p2'])
  for (const done of [removed, renamed, across, inLevel, added]) for (const { op, ...args } of done.inverse) go(op, args)
  assert.equal(JSON.stringify([...ws.levels]), before)
})

// A toy whose parts are data (games/DESIGN.md 6.8): engine resources in its vocabulary, its parts in parts.json.
const PVOCAB = defineVocabulary({
  domain: 'ptoy',
  version: 1,
  kinds: { op: { add: { about: 'a + b', args: [{ name: 'a' }, { name: 'b' }] } }, family: { value: { about: 'numbers' } } },
  game: S.obj({ title: S.text(), primitives: S.list(S.ref('part')), eras: S.list(ERA) }),
  level: S.obj({ title: S.text(), brief: S.opt(S.text()), adds: S.opt(S.list(S.ref('part'))), solution: S.opt(S.board()) }),
})
const sum = { name: { zh: '和', en: 'Sum' }, desc: { zh: 'a + b', en: 'a + b' }, icon: 'Plus', family: 'value', inputs: [{ name: 'a' }, { name: 'b' }], compute: 'add(a, b)' }
function partsToy() {
  const root = mkdtempSync(join(tmpdir(), 'ops-ptoy-'))
  mkdirSync(join(root, 'ptoy', 'levels'), { recursive: true })
  const put = (file, value) => writeFileSync(join(root, 'ptoy', file), `${JSON.stringify(value, null, 2)}\n`)
  put('game.json', { domain: 'ptoy', vocabulary: 1, title: 'Toy', primitives: ['sum'], eras: [{ id: 'one', foundation: ['a1'] }] })
  put('glossary.json', { groups: [], entries: [] })
  put('parts.json', { parts: { sum } })
  put('levels/a1.json', { title: 'A', brief: { zh: '用 <part-ref to="sum"></part-ref>', en: 'use <part-ref to="sum"></part-ref>' }, adds: ['sum'], solution: ['s = sum(a, b)', 'out <- s'] })
  return openGame('ptoy', root)
}
const prun = (ws, op, args) => OPERATIONS[op].apply(ws, args, { vocabulary: withParts(PVOCAB, ws.partDefs), domain: { vocabulary: PVOCAB } })

test('the part operations edit parts.json, refuse to remove a part still used, and rename it everywhere', () => {
  const ws = partsToy()
  const before = JSON.stringify(ws.content())
  const added = prun(ws, 'part.add', { part: 'twice', data: { ...sum, inputs: [{ name: 'a' }], compute: 'add(a, a)' }, after: 'sum' })
  assert.deepEqual(Object.keys(ws.partDefs.parts), ['sum', 'twice'])
  const set = prun(ws, 'parts.set', { path: 'parts.twice.settings', value: [{ key: 'k', control: 'slider', min: 0, max: 4 }] })
  assert.deepEqual(ws.partDefs.parts.twice.settings.map((x) => x.key), ['k'])
  const said = prun(ws, 'text.set', { in: 'parts', path: 'parts.twice.name', en: 'Twice' })
  assert.deepEqual(ws.partDefs.parts.twice.name, { zh: '和', en: 'Twice' })
  const removed = prun(ws, 'part.remove', { part: 'twice' })
  assert.deepEqual(Object.keys(ws.partDefs.parts), ['sum'])
  for (const { op, ...args } of removed.inverse) prun(ws, op, args)
  for (const done of [said, set, added]) for (const { op, ...args } of done.inverse) prun(ws, op, args)
  assert.equal(JSON.stringify(ws.content()), before, 'the inverses put parts.json back')
  assert.throws(() => prun(ws, 'part.remove', { part: 'sum' }), /still named at game.json primitives\[0\], levels\/a1.json adds\[0\], levels\/a1.json brief.zh, levels\/a1.json brief.en, levels\/a1.json solution\[0\]/)
  assert.throws(() => prun(ws, 'parts.set', { path: 'parts.sum', value: {} }), /part.add/)
  const renamed = prun(ws, 'part.rename', { part: 'sum', to: 'plus' })
  assert.deepEqual(ws.game.primitives, ['plus'])
  assert.deepEqual(ws.levels.get('a1').adds, ['plus'])
  assert.deepEqual(ws.levels.get('a1').solution, ['s = plus(a, b)', 'out <- s'])
  assert.match(ws.levels.get('a1').brief.en, /<part-ref to="plus">/)
  for (const { op, ...args } of renamed.inverse) prun(ws, op, args)
  assert.equal(JSON.stringify(ws.content()), before)
})
