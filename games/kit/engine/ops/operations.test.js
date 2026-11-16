// node --test games/kit/engine/ops — every operation on a toy game in a temp folder: what it changes, what it
// refuses, and that its inverse puts the content back exactly.
import { after, test } from 'node:test'
import { closeGames } from '../games.mjs'
after(closeGames)
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { COURSE_FIELDS, COURSE_OPTIONS } from '../course-schema.js'
import { eraLevels } from '../../course.js'
import { S } from '../schema.js'
import { defineVocabulary } from '../vocabulary.js'
import { OPERATIONS } from './operations.js'
import { openGame as openWorkspace, openPackage } from './workspace.js'
import { adopt, runChangeset, readLog, undo } from './changeset.js'
import { driftOf } from './log.js'
import { withParts } from '../parts/define.js'
import { taskLevel } from '../tasks.js'
import { textKey } from '../i18n.js'
import { writeContentFixture } from './fixture.js'

const openGame = (id, root, options = {}) => (options.scope === 'game' ? openWorkspace : openPackage)(id, root, { vocabulary: id === 'ptoy' ? PVOCAB : VOCAB, ...options })

const ERA = S.obj({ id: S.str(), title: S.opt(S.text()), ...COURSE_FIELDS, COURSE_OPTIONS })
const VOCAB = defineVocabulary({
  module: 'toy',
  version: 1,
  kinds: { part: { a: { about: 'a' }, b: { about: 'b' }, c: { about: 'c' } } },
  game: S.obj({ title: S.text(), chapters: S.list(ERA), ...COURSE_OPTIONS, views: S.opt(S.map(S.level())) }),
  // What a toy level says once is its whole puzzle; its one task is only its id.
  level: taskLevel({ title: S.text(), brief: S.opt(S.text()), tests: S.opt(S.list(S.any())), adds: S.opt(S.list(S.ref('part'))), solution: S.opt(S.board()), from: S.opt(S.level()) }, {}, { parts: true }),
})
// The toy's course: the main path in order, every level requiring the one before.
const DOMAIN = {
  vocabulary: VOCAB,
  spec: (content) => {
    const order = content.eras.flatMap(eraLevels)
    const course = { index: new Map(order.map((id, k) => [id, k])), levels: order.map((id) => ({ id })), builds: () => [] }
    return { levels: order.map((id, k) => ({ id, requires: k ? [order[k - 1]] : [] })), course }
  },
}

function toy() {
  const root = mkdtempSync(join(tmpdir(), 'ops-toy-'))
  const game = {
    vocabulary: 1, title: { en: 'Toy' },
    chapters: [{ id: 'one', levels: ['toy/a1', 'toy/a2', 'toy/a3'] }, { id: 'two', levels: ['b1', 'b2', 'c1'] }], optional: ['a3'],
    views: { x: 'a2' },
  }
  const glossary = { groups: [{ id: 'g', title: 'G' }], entries: [{ id: 'e', group: 'g', title: { en: 'E' }, body: ['see <level-ref to="a2"></level-ref>'], at: 'a2' }] }
  const levels = Object.fromEntries(['a1', 'a2', 'a3', 'b1', 'b2', 'c1'].map((id) => [id, {
    title: { en: id }, tests: [1], ...(id === 'b1' && { from: 'a2', brief: { en: 'after <level-ref to="a2"></level-ref>', zh: '接着 <level-ref to="a2"></level-ref>' } }), tasks: [{ id }],
  }]))
  writeContentFixture(root, 'toy', { game, glossary, levels }, VOCAB)
  writeFileSync(join(root, 'games', 'games.js'), "export const GAMES = [{ id: 'toy', levels: 6 }]\n")
  return { root, ws: openWorkspace('toy', root, { vocabulary: VOCAB }) }
}
const run = (ws, op, args) => OPERATIONS[op].apply(ws, args, { vocabulary: VOCAB, domain: DOMAIN })
const undone = (ws, inverse) => { for (const { op, ...args } of inverse) run(ws, op, args) }
/** Runs op, checks its inverse restores the content exactly, and returns what it did (with the content after it). */
function roundTrip(ws, op, args) {
  const before = ws.content()
  const done = run(ws, op, args)
  const after = ws.content()
  undone(ws, done.inverse)
  assert.deepEqual(ws.content(), before, `${op}: its inverse puts the content back`)
  run(ws, op, args)
  return { ...done, after }
}
const level = (ws, id) => ws.levels.get(id)

test('the operation registry exposes no identity-changing operations', () => {
  assert.deepEqual(Object.keys(OPERATIONS).filter((name) => name.endsWith('.rename')), [])
})

test('field edits, patches and replacements reject id changes before mutation', () => {
  const { ws } = toy()
  const base = level(ws, 'a1')
  const changed = { ...base, tasks: [{ id: 'new' }] }
  const before = ws.snapshot()
  for (const [op, args] of [
    ['level.set', { level: 'a1', path: 'id', value: 'new' }],
    ['level.set', { level: 'a1', path: 'tasks[0].id', value: 'new' }],
    ['level.unset', { level: 'a1', path: 'tasks[0].id' }],
    ['level.set', { level: 'a1', path: 'tasks[0]', value: { id: 'new' } }],
    ['level.set', { level: 'a1', path: 'tasks', value: changed.tasks }],
    ['level.patch', { level: 'a1', fields: { tasks: changed.tasks } }],
    ['level.patch', { level: 'a1', fields: { id: 'new' } }],
    ['level.replace', { level: 'a1', data: changed }],
    ['game.set', { path: 'chapters[0].id', value: 'new' }],
    ['game.unset', { path: 'chapters[0].id' }],
    ['game.set', { path: 'chapters[0]', value: { ...ws.game.chapters[0], id: 'new' } }],
    ['game.set', { path: 'chapters', value: [{ ...ws.game.chapters[0], id: 'new' }, ws.game.chapters[1]] }],
    ['entry.set', { entry: 'e', path: 'id', value: 'new' }],
    ['entry.patch', { entry: 'e', fields: { id: 'new' } }],
    ['entry.put', { entry: 'e', data: { ...ws.entries.get('e'), id: 'new' } }],
  ]) {
    assert.throws(() => run(ws, op, args), /id cannot change; create a new object, then delete the old one/, op)
    assert.deepEqual(ws.snapshot(), before, `${op} leaves the workspace intact`)
  }
  for (const kind of ['tag', 'relation', 'layout']) {
    const plural = { tag: 'tags', relation: 'relations', layout: 'layouts' }[kind]
    ws[plural].set('object', {})
    assert.throws(() => run(ws, `${kind}.set`, { [kind]: 'object', path: 'id', value: 'new' }), /id cannot change/)
  }
})

test('stable ids allow list reordering, insertion, deletion and undo', () => {
  const { ws } = toy()
  const chapters = ws.game.chapters
  roundTrip(ws, 'game.set', { path: 'chapters', value: [...chapters].reverse() })
  roundTrip(ws, 'game.set', { path: 'chapters', value: [...ws.game.chapters, { id: 'new', levels: [] }] })
  roundTrip(ws, 'game.unset', { path: 'chapters[0]' })
  roundTrip(ws, 'level.set', { level: 'a1', path: 'tasks[0].id', value: 'a1' })
})

test('piece variants, setting definitions, blueprints and overrides preserve ids', () => {
  const { root } = toy()
  const ws = openPackage('toy', root, { vocabulary: VOCAB })
  run(ws, 'piece.add', { piece: 'made', data: { inside: [{ id: 'base', reference: {} }] } })
  for (const args of [
    { path: 'parts.made.id', value: 'new' },
    { path: 'parts.made.inside[0].id', value: 'new' },
    { path: 'parts.made.inside', value: [{ id: 'new', reference: {} }] },
  ]) assert.throws(() => run(ws, 'pieces.set', args), /id cannot change/)
  run(ws, 'blueprint.put', { data: { eras: [{ id: 'chapter' }] } })
  assert.throws(() => run(ws, 'blueprint.set', { path: 'eras[0].id', value: 'new' }), /id cannot change/)
  assert.throws(() => run(ws, 'blueprint.put', { data: { eras: [{ id: 'new' }] } }), /id cannot change/)
  assert.throws(() => run(ws, 'pieces.set', { path: [], value: { parts: {} } }), /manage objects/)
  assert.throws(() => run(ws, 'pieces.set', { path: 'settings', value: {} }), /settings belong to a piece/)
  for (const merge of [false, true]) {
    for (const id of ['a1', 'toy/a1']) {
      const data = { ...level(ws, 'a1'), tasks: [{ id }] }
      roundTrip(ws, 'override.put', { layer: ws.layer, kind: 'level', name: 'toy/a1', data, merge })
    }
    assert.throws(() => run(ws, 'override.put', { layer: ws.layer, kind: 'level', name: 'toy/a1', data: { tasks: [{ id: 'new' }] }, merge }), /id cannot change/)
  }
})

test('a refused id edit restores all earlier operations in its changeset', async () => {
  const { root } = toy()
  const ws = openPackage('toy', root, { vocabulary: VOCAB })
  const before = ws.content()
  for (const op of [
    { op: 'level.set', level: 'a1', path: 'tasks[0].id', value: 'new' },
    { op: 'entry.put', entry: 'e', data: { ...ws.entries.get('e'), id: 'new' } },
  ]) {
    const result = await runChangeset(ws, { ops: [{ op: 'level.set', level: 'a1', path: 'tests', value: [2] }, op] }, { check: false, domain: DOMAIN })
    assert.equal(result.ok, false)
    assert.equal(result.failed, 1, result.problems.join('\n'))
    assert.match(result.problems.join('\n'), /id cannot change/)
    assert.deepEqual(ws.content(), before)
  }
})

test('level.set, level.unset, level.patch and level.replace edit one level', () => {
  const { ws } = toy()
  const title = level(ws, 'a1').title
  roundTrip(ws, 'level.set', { level: 'a1', path: 'tests[1]', value: 2 })
  assert.deepEqual(level(ws, 'a1').tests, [1, 2])
  roundTrip(ws, 'level.set', { level: 'a1', path: 'brief', value: { en: '甲' } })
  // A new field goes where the schema lists it: brief after title, before tests.
  assert.deepEqual(Object.keys(level(ws, 'a1')), ['title', 'brief', 'tests', 'tasks'])
  roundTrip(ws, 'level.unset', { level: 'a1', path: 'tests[0]' })
  assert.deepEqual(level(ws, 'a1').tests, [2])
  roundTrip(ws, 'level.patch', { level: 'a1', fields: { brief: null, adds: ['a'] } })
  assert.deepEqual(level(ws, 'a1'), { title, tests: [2], adds: ['a'], tasks: [{ id: 'a1' }] })
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

test('level.add and level.remove update placement while preserving content references', () => {
  const { ws } = toy()
  roundTrip(ws, 'level.add', { level: 'n1', data: { title: 'N' } })
  assert.deepEqual(ws.game.chapters[0].levels, ['toy/a1', 'toy/a2', 'toy/a3'])
  roundTrip(ws, 'level.remove', { level: 'n1' })
  assert.throws(() => run(ws, 'level.remove', { level: 'a2' }), /still named/)
  roundTrip(ws, 'level.remove', { level: 'c1' })
  assert.ok(!ws.game.chapters[1].levels.includes('toy/c1'))

})

test('game.set and game.unset edit the assembled configuration', () => {
  const { ws } = toy()
  roundTrip(ws, 'game.set', { path: 'title', value: { en: '玩具' } })
  roundTrip(ws, 'game.unset', { path: 'views' })
  assert.equal(ws.game.views, undefined)
})

test('named-object operations persist typed tags, relations and layouts and preserve translations', async () => {
  const { root } = toy()
  const ws = openGame('toy', root)
  const result = await runChangeset(ws, { ops: [
    { op: 'tag.put', tag: 'basics', data: { kind: 'level', title: { en: 'Basics' }, values: ['a1', 'a2'] } },
    { op: 'relation.put', relation: 'path', data: { kind: 'requires', edges: [{ from: 'a1', to: 'a2' }] } },
    { op: 'layout.put', layout: 'map', data: { of: '#basics', rows: [['a1'], ['a2']] } },
  ] }, { write: true, check: false, domain: DOMAIN })
  assert.equal(result.ok, true, result.problems.join('\n'))
  const reopened = openGame('toy', root)
  assert.equal(reopened.content().tags['toy/basics'].title.en, 'Basics')
  assert.deepEqual(reopened.content().layouts['toy/map'].rows, [['toy/a1'], ['toy/a2']])
  for (const kind of ['tag', 'relation', 'layout']) {
    const key = { tag: 'basics', relation: 'path', layout: 'map' }[kind]
    roundTrip(reopened, `${kind}.set`, { [kind]: key, path: kind === 'tag' ? 'values' : kind === 'relation' ? 'edges' : 'rows', value: [] })
  }
})

test('a game puts its own wording over a package text, which the package keeps; the package workspace reads its own', async () => {
  const { root, ws } = toy()
  const original = level(ws, 'b1').title
  roundTrip(ws, 'text.override', { level: 'b1', path: 'title', lang: 'en', value: 'Ours' })
  assert.equal(ws.content().levels.find(({ id }) => id === 'toy/b1').title.en, 'Ours')
  assert.deepEqual(level(ws, 'b1').title, original)
  assert.deepEqual(ws.content().overridden, { [`toy/${textKey(original)}`]: { en: 'b1' } })
  assert.throws(() => run(ws, 'text.override', { in: 'game', path: 'title', lang: 'en', value: 'x' }), /the game's own text/)
  const written = await runChangeset(openGame('toy', root, { scope: 'game' }), { ops: [{ op: 'text.override', level: 'b1', path: 'title', lang: 'en', value: 'Ours' }] }, { write: true, check: false, domain: DOMAIN })
  assert.equal(written.ok, true, written.problems.join('\n'))
  assert.deepEqual(written.files, ['games/toy/overrides/toy/i18n/en.json'])
  assert.equal(openWorkspace('toy', root, { vocabulary: VOCAB }).content().levels.find(({ id }) => id === 'toy/b1').title.en, 'Ours')
  assert.equal(openGame('toy', root, { scope: 'package' }).content().levels.find(({ id }) => id === 'toy/b1').title.en, 'b1')
  const refused = await runChangeset(openGame('toy', root, { scope: 'game' }), { ops: [{ op: 'level.set', level: 'b1', path: 'tests', value: [] }] }, { check: false, domain: DOMAIN })
  assert.match(refused.problems[0], /the package workspace's to change/)
})

test('text.set edits one language at a field path and round trips', () => {
  const { ws } = toy()
  const before = level(ws, 'b1').brief
  const gameTitle = ws.game.title
  const entryTitle = ws.entries.get('e').title
  roundTrip(ws, 'text.set', { level: 'b1', path: 'brief', lang: 'en', value: 'then' })
  assert.deepEqual(level(ws, 'b1').brief, { ...before, en: 'then' })
  roundTrip(ws, 'text.set', { level: 'b1', path: 'brief', lang: 'fr', value: 'ensuite' })
  assert.deepEqual(level(ws, 'b1').brief, { ...before, en: 'then', fr: 'ensuite' })
  roundTrip(ws, 'text.set', { in: 'game', path: 'title', lang: 'zh', value: '玩具' })
  assert.deepEqual(ws.game.title, { ...gameTitle, zh: '玩具' })
  roundTrip(ws, 'text.set', { entry: 'e', path: 'title', lang: 'ja', value: '項目' })
  assert.deepEqual(ws.entries.get('e').title, { ...entryTitle, ja: '項目' })
  assert.throws(() => run(ws, 'text.set', { level: 'b1', path: 'from', lang: 'en', value: 'x' }), /not a text/)
})

test('preview, apply and undo a locale edit across a workspace reopen', async () => {
  const { root } = toy()
  const ws = openGame('toy', root)
  const source = join(root, 'packages', 'toy', 'levels', 'b1.json')
  const catalog = 'packages/toy/i18n/fr.json'
  const before = readFileSync(source, 'utf8')
  const key = textKey(level(ws, 'b1').brief)
  const ops = [{ op: 'text.set', level: 'b1', path: 'brief', lang: 'fr', value: 'Ensuite' }]
  const options = { check: false, domain: DOMAIN }
  const preview = await runChangeset(ws, { ops }, options)
  assert.equal(preview.ok, true, preview.problems.join('\n'))
  assert.equal(preview.content.levels.find((level) => level.id === 'toy/b1').brief.fr, 'Ensuite')
  assert.deepEqual(preview.files, [catalog])
  assert.equal(existsSync(join(root, catalog)), false)

  const applied = await runChangeset(ws, { ops }, { ...options, write: true })
  assert.equal(applied.ok, true, applied.problems.join('\n'))
  assert.equal(readFileSync(source, 'utf8'), before)
  assert.deepEqual(JSON.parse(readFileSync(join(root, catalog), 'utf8')), { [key]: 'Ensuite' })
  const reopened = openGame('toy', root)
  assert.equal(level(reopened, 'b1').brief.fr, 'Ensuite')
  const undone = await undo(reopened, { ...options, write: true })
  assert.equal(undone.ok, true, undone.problems.join('\n'))
  assert.equal(existsSync(join(root, catalog)), false)
  assert.equal(readFileSync(source, 'utf8'), before)

  const stale = openGame('toy', root)
  const remove = { ops: [{ op: 'level.unset', level: 'b1', path: 'brief' }] }
  assert.equal((await runChangeset(reopened, remove, { ...options, write: true })).ok, true)
  const late = await runChangeset(stale, { ops }, { ...options, write: true })
  assert.match(late.problems[0], /changed on disk since the game was opened/)
  assert.equal(existsSync(join(root, catalog)), false)
})

test('entry.put, entry.patch and entry.remove edit the encyclopedia', () => {
  const { ws } = toy()
  roundTrip(ws, 'entry.put', { entry: 'f', data: { title: 'F', body: [] } })
  assert.deepEqual([...ws.entries.keys()], ['e', 'f'])
  roundTrip(ws, 'entry.patch', { entry: 'e', fields: { title: 'E2', at: null } })
  assert.deepEqual(ws.entries.get('e'), { title: 'E2', body: ['see <level-ref to="a2"></level-ref>'] })
  roundTrip(ws, 'entry.remove', { entry: 'e' })
  assert.deepEqual([...ws.entries.keys()], ['f'])
})

test('the log keeps each file’s hashes; a write lands only on the files and the log it was made on', async () => {
  const { root } = toy()
  const ws = openGame('toy', root)
  const one = { ops: [{ op: 'level.set', level: 'a1', path: 'brief', value: 'one' }] }
  const done = await runChangeset(ws, one, { write: true, check: false, domain: DOMAIN })
  assert.equal(done.ok, true, done.problems.join('\n'))
  const [entry] = readLog(ws)
  assert.deepEqual(entry.files.map((f) => [f.file, typeof f.before, typeof f.after]), [['packages/toy/levels/a1.json', 'string', 'string']])
  // Two writers that opened the game at once: the second is refused, the first's change stands.
  const a = openGame('toy', root)
  const b = openGame('toy', root)
  assert.equal((await runChangeset(a, { ops: [{ op: 'level.set', level: 'a2', path: 'brief', value: 'a' }] }, { write: true, check: false, domain: DOMAIN })).ok, true)
  const late = await runChangeset(b, { ops: [{ op: 'level.set', level: 'a2', path: 'brief', value: 'b' }] }, { write: true, check: false, domain: DOMAIN })
  assert.match(late.problems[0], /changed on disk since the game was opened: packages\/toy\/levels\/a2.json/)
  assert.equal(JSON.parse(readFileSync(join(root, 'packages', 'toy', 'levels', 'a2.json'), 'utf8')).brief, 'a')
  // A base that is not the log's last entry is refused.
  const stale = await runChangeset(openGame('toy', root), one, { write: true, check: false, base: 1, domain: DOMAIN })
  assert.match(stale.problems[0], /changed since you saw it \(its log is at #2, not #1\)/)
  assert.deepEqual(readLog(ws).map((e) => e.seq), [1, 2])
  // A file changed by hand: drift, and the change before it cannot be undone over it; adopting takes it.
  const source = join(root, 'packages', 'toy', 'levels', 'a2.json')
  writeFileSync(source, `${JSON.stringify({ ...JSON.parse(readFileSync(source, 'utf8')), brief: 'hand' }, null, 2)}\n`)
  const now = openGame('toy', root)
  assert.deepEqual(driftOf(now, now.onDisk()), ['packages/toy/levels/a2.json'])
  assert.match((await undo(now, { write: true, check: false, domain: DOMAIN })).problems[0], /#2 cannot be undone: changed since it was made: packages\/toy\/levels\/a2.json/)
  adopt(now, 'edited by hand')
  assert.deepEqual(driftOf(now, now.onDisk()), [])
})

test('a changeset whose domain throws while it is settled is refused and leaves the workspace as it was', async () => {
  const op = { ops: [{ op: 'level.set', level: 'a1', path: 'tests', value: [9] }] }
  // The domain's spec throws, or its checks do, while the whole game is checked.
  for (const broken of [{ ...DOMAIN, spec: () => { throw new Error('the domain broke') } }, { ...DOMAIN, validate: () => { throw new Error('the checks broke') } }]) {
    const { root } = toy()
    const ws = openGame('toy', root)
    const before = JSON.stringify(ws.content())
    const files = () => ['game.json', 'levels/a1.json'].map((f) => readFileSync(join(root, f.startsWith('levels/') ? 'packages' : 'games', 'toy', f), 'utf8')).join()
    const disk = files()
    const r = await runChangeset(ws, op, { write: true, check: true, domain: broken })
    assert.equal(r.ok, false)
    assert.match(r.problems[0], /^toy\/a1: the (domain|checks) broke$/)
    assert.equal(JSON.stringify(ws.content()), before)
    assert.equal(files(), disk, 'nothing on disk changed')
    assert.deepEqual(readLog(ws), [])
  }
})

test('a package changeset is checked atomically, logged and undone independently of its game', async () => {
  const { root } = toy()
  const ws = openGame('toy', root)
  const options = { write: true, check: false, domain: DOMAIN }
  const refused = await runChangeset(ws, { ops: [{ op: 'level.set', level: 'a1', path: 'from', value: 'gone' }] }, options)
  assert.equal(refused.ok, false)
  assert.match(refused.problems.join('\n'), /toy\/gone/)
  assert.deepEqual(readLog(ws), [])
  const bad = await runChangeset(ws, { ops: [{ op: 'level.set', level: 'nope', path: 'title', value: 'No' }] }, options)
  assert.match(bad.problems[0], /^op 1 \(level.set\): level: "nope" is no level of this game/)
  const why = 'a rewritten puzzle and an extra level'
  const done = await runChangeset(ws, { why, ops: [
    { op: 'level.set', level: 'a3', path: 'tests', value: [2] },
    { op: 'level.add', level: 'n1', data: { title: 'N', tasks: [{ id: 'n1' }] } },
  ] }, options)
  assert.equal(done.ok, true, done.problems.join('\n'))
  assert.ok(existsSync(join(root, 'packages/toy/levels/n1.json')))
  assert.ok(done.files.every((file) => file.startsWith('packages/toy/')))
  assert.deepEqual(readLog(ws).map((e) => [e.seq, e.why]), [[1, why]])
  assert.deepEqual(readLog(openWorkspace('toy', root, { vocabulary: VOCAB })), [])
  assert.match((await undo(ws, { ...options, seq: 0 })).problems[0], /#0 is not the change/)
  const back = await undo(ws, { ...options, seq: 1 })
  assert.equal(back.ok, true, back.problems.join('\n'))
  assert.equal(existsSync(join(root, 'packages/toy/levels/n1.json')), false)
  assert.deepEqual(readLog(ws).map((e) => e.undoes), [undefined, 1])
  assert.match((await undo(ws, options)).problems[0], /nothing to undo/)
})

test('tasks by id: task.add, task.move in a level and across levels, task.remove, each undone', async () => {
  const T = defineVocabulary({ module: 'tasked', version: 1, kinds: {}, game: VOCAB.game, level: taskLevel({ title: S.text() }, { brief: S.text() }) })
  const tx = (s) => ({ en: s })
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
  assert.throws(() => go('task.remove', { task: 'r1' }), /only task: remove the level/)
  const removed = go('task.remove', { task: 'p_2' })
  assert.deepEqual(ids('p'), ['p2'])
  for (const done of [removed, across, inLevel, added]) for (const { op, ...args } of done.inverse) go(op, args)
  assert.equal(JSON.stringify([...ws.levels]), before)
})

// A toy whose parts are data (games/DESIGN.md 6.8): engine resources in its vocabulary, its parts in pieces/<name>.json.
const PVOCAB = defineVocabulary({
  module: 'ptoy',
  version: 1,
  kinds: { op: { add: { about: 'a + b', args: [{ name: 'a' }, { name: 'b' }] } }, family: { value: { about: 'numbers' } } },
  game: S.obj({ title: S.text(), primitives: S.list(S.ref('part')), chapters: S.list(ERA), ...COURSE_OPTIONS }),
  level: S.obj({ title: S.text(), brief: S.opt(S.text()), adds: S.opt(S.list(S.ref('part'))), solution: S.opt(S.board()), uses: S.opt(S.map(S.str(), { key: S.ref('part') })) }),
})
const sum = { name: { en: '和' }, desc: { en: 'a + b' }, icon: 'Plus', family: 'value', inputs: [{ name: 'a' }, { name: 'b' }], op: 'add' }
function partsToy() {
  const root = mkdtempSync(join(tmpdir(), 'ops-ptoy-'))
  const game = { vocabulary: 1, title: { en: 'Toy' }, primitives: ['sum'], chapters: [{ id: 'one', levels: ['a1'] }] }
  const glossary = { groups: [], entries: [] }
  const partDefs = { parts: { sum } }
  const levels = { a1: { title: 'A', brief: { en: '用 <part-ref to="sum"></part-ref>' }, adds: ['sum'], solution: ['s = sum(a, b)', 'out <- s'] } }
  writeContentFixture(root, 'ptoy', { game, glossary, partDefs, levels }, PVOCAB)
  return openWorkspace('ptoy', root, { vocabulary: PVOCAB })
}
const prun = (ws, op, args) => OPERATIONS[op].apply(ws, args, { vocabulary: withParts(PVOCAB, ws.partDefs), domain: { vocabulary: PVOCAB } })

test('the first part of a game makes its pieces.json', () => {
  const ws = partsToy()
  ws.partDefs = undefined
  prun(ws, 'piece.add', { piece: 'sum', data: sum })
  assert.deepEqual(Object.keys(ws.partDefs.parts), ['sum'])
})

test('the part operations edit pieces.json, refuse to remove a part still used', () => {
  const ws = partsToy()
  const before = JSON.stringify(ws.content())
  const added = prun(ws, 'piece.add', { piece: 'twice', data: { ...sum, inputs: [{ name: 'a' }], op: 'add' }, after: 'sum' })
  assert.deepEqual(Object.keys(ws.partDefs.parts), ['sum', 'twice'])
  const said = prun(ws, 'text.set', { in: 'pieces', path: 'parts.twice.name', lang: 'en', value: '两倍' })
  assert.deepEqual(ws.partDefs.parts.twice.name, { ...sum.name, en: '两倍' })
  const removed = prun(ws, 'piece.remove', { piece: 'twice' })
  assert.deepEqual(Object.keys(ws.partDefs.parts), ['sum'])
  for (const { op, ...args } of removed.inverse) prun(ws, op, args)
  for (const done of [said, added]) for (const { op, ...args } of done.inverse) prun(ws, op, args)
  assert.equal(JSON.stringify(ws.content()), before, 'the inverses put pieces.json back')
  assert.throws(() => prun(ws, 'piece.remove', { piece: 'sum' }), /still named at game.json primitives\[0\], levels\/a1.json adds\[0\], levels\/a1.json brief.en, levels\/a1.json solution\[0\]/)
  assert.throws(() => prun(ws, 'pieces.set', { path: 'parts.sum', value: {} }), /piece.add/)
  assert.throws(() => prun(ws, 'piece.add', { piece: 'twice', data: sum, after: 'none' }), /no part none/)
  // A map's key naming a part also prevents removal.
  prun(ws, 'level.set', { level: 'a1', path: 'uses', value: { sum: 'twice', other: 'once' } })
  assert.throws(() => prun(ws, 'piece.remove', { piece: 'sum' }), /levels\/a1.json uses.sum/)
})

test('inline settings are edited and undone with their piece', () => {
  const ws = partsToy()
  const before = ws.content()
  const data = { k: { control: 'slider', min: 0, max: 4 } }
  const change = prun(ws, 'pieces.set', { path: ['parts', 'sum', 'settings'], value: data })
  assert.deepEqual(ws.partDefs.parts.sum.settings, data)
  for (const { op, ...args } of change.inverse) prun(ws, op, args)
  assert.deepEqual(ws.content(), before)
  assert.equal(OPERATIONS['setting.add'], undefined)
  assert.equal(OPERATIONS['setting.remove'], undefined)
})

test('operations consume assembled names and keep package source references local', async () => {
  const original = partsToy()
  const ws = openGame('ptoy', original.root)
  const result = await runChangeset(ws, { ops: [{ op: 'level.set', level: 'ptoy/a1', path: 'adds', value: ['ptoy/sum'] }] }, { check: false, domain: { vocabulary: PVOCAB } })
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.deepEqual(ws.levels.get('a1').adds, ['sum'])
  assert.deepEqual(result.content.levels[0].adds, ['ptoy/sum'])
  const before = ws.snapshot()
  const refused = await runChangeset(ws, { ops: [{ op: 'level.set', level: 'ptoy/a1', path: 'adds', value: ['library/missing'] }] }, { check: false, domain: { vocabulary: PVOCAB } })
  assert.equal(refused.ok, false)
  assert.match(refused.problems.join('\n'), /library\/missing/)
  assert.deepEqual(ws.snapshot(), before)
})

test('assembled piece selectors and registry paths address layer-local source objects', async () => {
  const original = partsToy()
  const ws = openGame('ptoy', original.root)
  const result = await runChangeset(ws, { ops: [
    { op: 'pieces.set', path: ['parts', 'ptoy/sum', 'inputs', 0, 'label'], value: { en: 'First input' } },
    { op: 'piece.add', piece: 'ptoy/other', data: sum, after: 'ptoy/sum' },
  ] }, { check: false, domain: { vocabulary: PVOCAB } })
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.ok(result.changes.some(({ file }) => file.endsWith('/pieces/sum.json')))
  assert.ok(result.changes.some(({ file }) => file.endsWith('/pieces/other.json')))
  assert.equal(result.content.partDefs.parts['ptoy/sum'].inputs[0].label.en, 'First input')
  assert.ok(result.content.registries.piece['ptoy/other'])
})

test('package tags, relations and layouts persist and reopen with full names', async () => {
  const { root } = toy()
  const ws = openGame('toy', root)
  const result = await runChangeset(ws, { ops: [
    { op: 'relation.put', relation: 'toy/package-path', data: { kind: 'requires', edges: [{ from: 'a1', to: 'a2' }] } },
    { op: 'tag.put', tag: 'toy/pick', data: { kind: 'level', values: ['toy/a1', 'toy/a2'] } },
    { op: 'layout.put', layout: 'toy/map', data: { of: '#pick', rows: [['toy/a1'], ['toy/a2']] } },
  ] }, { write: true, check: false, domain: DOMAIN })
  assert.equal(result.ok, true, result.problems.join('\n'))
  assert.ok(result.files.includes('packages/toy/tags/level/pick.json'))
  assert.ok(result.files.includes('packages/toy/layouts/map.json'))
  const content = openGame('toy', root).content()
  assert.deepEqual(content.layouts['toy/map'].rows, [['toy/a1'], ['toy/a2']])
  assert.deepEqual(content.tags['toy/pick'].values, ['toy/a1', 'toy/a2'])
  assert.deepEqual(content.relationEdges.requires, [{ from: 'toy/a1', to: 'toy/a2' }])
  const refused = await runChangeset(ws, { ops: [{ op: 'tag.put', tag: '@toy/forbidden', data: { kind: 'level', values: [] } }] }, { check: false, domain: DOMAIN })
  assert.equal(refused.ok, false)
})


test('removing a level clears its tag, relation and layout placements and supports undo', () => {
  const { ws } = toy()
  run(ws, 'tag.put', { tag: 'levels', data: { kind: 'level', values: ['c1'] } })
  run(ws, 'relation.put', { relation: 'path', data: { kind: 'requires', edges: [{ from: 'b2', to: 'c1' }] } })
  run(ws, 'layout.put', { layout: 'map', data: { of: '#levels', rows: [['c1']] } })
  roundTrip(ws, 'level.remove', { level: 'c1' })
  assert.deepEqual(ws.tags.get('levels').values, [])
  assert.deepEqual(ws.relations.get('path').edges, [])
  assert.deepEqual(ws.layouts.get('map').rows, [])
})


test('entry identity and membership cannot be hidden by the encyclopedia projection', async () => {
  const { root } = toy()
  const ws = openPackage('toy', root, { vocabulary: VOCAB })
  for (const op of [{ op: 'entry.set', entry: 'e', path: 'id', value: 'other' }, { op: 'entry.patch', entry: 'e', fields: { group: 'g' } }]) {
    const result = await runChangeset(ws, { ops: [op] }, { check: false, domain: DOMAIN })
    assert.equal(result.ok, false)
    assert.match(result.problems.join('\n'), /identity belongs|id cannot change/)
    assert.equal(ws.entries.get('e').id, undefined)
    assert.equal(ws.entries.get('e').group, undefined)
  }
})


test('package operations write concept tags and local items on levels and tasks', async () => {
  const { root } = toy()
  const ws = openPackage('toy', root, { vocabulary: VOCAB })
  const result = await runChangeset(ws, { why: 'Declare package-owned progression.', ops: [
    { op: 'tag.put', tag: 'numbers', data: { kind: 'piece', concept: true, values: ['a', 'b'] } },
    { op: 'level.set', level: 'a1', path: 'adds', value: ['a'] },
    { op: 'level.set', level: 'a1', path: 'local', value: ['#numbers'] },
    { op: 'level.set', level: 'a1', path: 'tasks[0].adds', value: ['b'] },
    { op: 'level.set', level: 'a1', path: 'tasks[0].local', value: ['b'] },
  ] }, { write: true, check: false, domain: DOMAIN })
  assert.equal(result.ok, true, result.problems.join('\n'))
  const reopened = openPackage('toy', root, { vocabulary: VOCAB }).content()
  assert.equal(reopened.tags['toy/numbers'].concept, true)
  assert.deepEqual(reopened.levels.find((level) => level.id === 'toy/a1').local, ['a', 'b'])
  assert.deepEqual(reopened.levels.find((level) => level.id === 'toy/a1').tasks[0].local, ['b'])
  const game = openWorkspace('toy', root, { vocabulary: VOCAB })
  const refused = await runChangeset(game, { ops: [
    { op: 'level.set', level: 'a1', path: 'local', value: [] },
  ] }, { check: false, domain: DOMAIN })
  assert.equal(refused.ok, false)
})
