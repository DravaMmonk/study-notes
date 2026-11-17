// node --test games/kit/studio — the studio's tools, pure parts: bulk edits as operations (bulk.js), the command
// palette's index and ranking (palette.js), the check's lines as a worklist (worklist.js), the copy
// table's rows (copy.js); and on every domain's starter game (kit/modules/<d>/starter, copied to a temp folder), that
// bulk operations, the palette's index and the copy rows hold up.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from '../engine/schema.js'
import { defineVocabulary } from '../engine/vocabulary.js'
import { cpSync, existsSync, mkdirSync, readFileSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { runtimeOf, readStarter } from '../engine/content-node.js'
import { eraLevels } from '../course.js'
import { openPackage } from '../engine/ops/workspace.js'
import { runChangeset } from '../engine/ops/changeset.js'
import { bulkAdds, bulkPatch, bulkSet, bulkUnset, commonFields } from './bulk.js'
import { paletteIndex, rankPalette, scoreOf } from './palette.js'
import { filterItems, itemOf, ruleOf, stepIn, tally } from './worklist.js'
import { copyRows } from './copy.js'

const VOCAB = defineVocabulary({
  module: 'toy',
  version: 1,
  kinds: { part: { add: { about: 'adds' }, sub: { about: 'subtracts' } } },
  game: S.obj({ title: S.text(), eras: S.list(S.any()) }),
  level: S.by('kind', {
    board: S.obj({ kind: S.oneOf(['board', 'hand']), title: S.text(), note: S.opt(S.text()), n: S.opt(S.int()), adds: S.opt(S.list(S.ref('part'))), tests: S.list(S.int(), { section: 'tests' }), hidden: S.opt(S.list(S.int(), { section: 'tests' })), solution: S.board() }),
    hand: S.obj({ kind: S.oneOf(['board', 'hand']), title: S.text(), moves: S.list(S.str()) }),
  }),
})
const LEVELS = [
  { id: 'a', kind: 'board', title: { en: '甲' }, adds: ['add'], tests: [1, 2], hidden: [3], solution: [] },
  { id: 'b', kind: 'board', title: { en: '乙' }, n: 2, tests: [1], solution: [] },
  { id: 'c', kind: 'hand', title: { en: '丙' }, moves: [] },
]

test('bulk edits are one operation a level, and the levels an edit does not fit are skipped with the reason', () => {
  assert.deepEqual(commonFields(VOCAB, LEVELS.slice(0, 2)).map((f) => f.key), ['title', 'note', 'n', 'adds', 'tests', 'hidden', 'solution'])
  assert.deepEqual(commonFields(VOCAB, LEVELS).map((f) => f.key), ['title'], 'a level of another shape: only what both shapes hold')
  assert.deepEqual(bulkSet(VOCAB, LEVELS, ['n'], 2), {
    ops: [{ op: 'level.set', level: 'a', path: ['n'], value: 2 }],
    skipped: [{ level: 'b', why: 'holds that already' }, { level: 'c', why: 'has no such field' }],
  })
  assert.deepEqual(bulkSet(VOCAB, LEVELS.slice(0, 1), ['note'], { en: '注' }).ops, [{ op: 'text.set', level: 'a', path: ['note'], lang: 'en', value: '注' }])
  assert.deepEqual(bulkSet(VOCAB, LEVELS.slice(0, 1), ['solution'], ['x = add()']).ops, [{ op: 'level.blueprint', level: 'a', path: ['solution'], text: 'x = add()' }])
  assert.deepEqual(bulkUnset(VOCAB, LEVELS, ['n']), { ops: [{ op: 'level.unset', level: 'b', path: ['n'] }], skipped: [{ level: 'a', why: 'has none' }, { level: 'c', why: 'has none' }] })
  assert.deepEqual(bulkPatch(VOCAB, LEVELS.slice(0, 2), { n: 2, note: null }).ops, [{ op: 'level.patch', level: 'a', fields: { n: 2, note: null } }])
  assert.deepEqual(bulkPatch(VOCAB, LEVELS.slice(0, 1), { kind: 'hand' }).ops, [])
  assert.deepEqual(bulkAdds(VOCAB, LEVELS, { add: ['sub'], remove: ['add'] }), {
    ops: [{ op: 'level.adds', level: 'a', add: ['sub'], remove: ['add'] }, { op: 'level.adds', level: 'b', add: ['sub'] }],
    skipped: [{ level: 'c', why: 'brings in no parts' }],
  })
  // Put together into a group: the first to the place, each next right after the one before; or out of every group.
})

// Every domain's starter game, as content.js assembles it; and one opened for operations in a temp games folder.
const DOMAINS = resolve(import.meta.dirname, '../templates')
const STARTERS = readdirSync(DOMAINS).filter((d) => existsSync(resolve(DOMAINS, d, 'starter', 'game.json')))
const starter = (d) => readStarter(resolve(DOMAINS, d))
function openStarter(d) {
  const root = mkdtempSync(join(tmpdir(), 'studio-tools-'))
  const dir = join(root, 'games', d)
  const pkg = join(root, 'packages', d)
  mkdirSync(dir, { recursive: true })
  const source = resolve(DOMAINS, d, 'starter')
  cpSync(source, pkg, { recursive: true, filter: (file) => !['game.json', 'course.json', 'i18n'].map((name) => resolve(source, name)).includes(file) })
  cpSync(resolve(source, 'course.json'), join(dir, 'course.json'))
  cpSync(resolve(source, 'i18n/course'), resolve(dir, 'i18n'), { recursive: true })
  cpSync(resolve(source, 'i18n/package'), resolve(pkg, 'i18n'), { recursive: true })
  const game = JSON.parse(readFileSync(resolve(source, 'game.json'), 'utf8'))
  writeFileSync(join(dir, 'game.json'), JSON.stringify({ packages: [d], ...game }))
  writeFileSync(join(root, 'games', 'games.js'), `export const GAMES = [{ id: '${d}', levels: ${readdirSync(join(pkg, 'levels')).length} }]\n`)
  for (const folder of [dir, pkg]) {
    const rename = (folder) => { for (const entry of readdirSync(folder, { withFileTypes: true })) { const file = join(folder, entry.name); if (entry.isDirectory()) rename(file); else if (file.endsWith('.json')) writeFileSync(file, readFileSync(file, 'utf8').replaceAll('starter/', `${d}/`)) } }; rename(folder)
  }
  return openPackage(d, root)
}

test('on every starter: a bulk edit of its package levels runs as a changeset, and they go into a group in order', async () => {
  for (const d of STARTERS) {
    const ws = openStarter(d)
    const content = ws.content()
    const { vocabulary } = await runtimeOf(content)
    const ids = content.levels.map(l => l.id)
    const levels = ids.map((id) => content.levels.find((l) => l.id === id))
    // A text every level of the era holds: the title, which every vocabulary gives a level.
    const { ops, skipped } = bulkSet(vocabulary, levels, ['title'], { en: '同一个标题' })
    assert.deepEqual([ops.length, skipped], [ids.length, []], d)
    // The era's levels backwards, into a new group: they end up together there, in that order.
    const grouped = [{ op: 'tag.put', tag: 'first', member: 'level', data: { title: { en: 'First' }, values: ids } }]
    const r = await runChangeset(ws, { ops: [...ops, ...grouped] }, { write: false, check: false })
    assert.equal(r.failed, null, `${d}: ${r.problems.join('\n')}`)
    assert.deepEqual(r.content.tags[`level:${d}/first`].values, ids, d)
    assert.ok(ids.every((id) => r.content.levels.find((l) => l.id === id).title.en === '同一个标题'), d)
  }
})

const CONTENT = {
  id: 'toy', title: { en: '玩具' }, eras: [{ id: 1, title: { en: '第一章' }, levels: [{ id: 'a' }, { id: 'b' }] }],
  levels: LEVELS, glossary: { groups: [], entries: [{ id: 'adder', title: { en: '加法器' }, body: [] }] },
}

test('the palette indexes levels, eras, fields, entries, findings, recent fields and actions, and ranks them as typed', () => {
  const items = paletteIndex({
    content: CONTENT, labels: [{ id: 'b', label: '1-1' }, { id: 'a', label: '1-2' }, { id: 'c', label: '1-3' }], level: 'a', fields: ['title', 'tests', 'hint[0]'],
    items: [itemOf({ fail: true, text: 'a: reference fails test 2', levels: ['a'] }), itemOf({ text: 'b: answer PASS', levels: ['b'] })],
    recent: [{ level: 'a', path: 'title' }], actions: [{ id: 'search', label: 'Search and replace', keys: 'Ctrl+Shift+F' }], lang: 'en',
  })
  assert.deepEqual(items.map((it) => it.kind), ['recent', 'action', 'level', 'level', 'level', 'era', 'field', 'field', 'field', 'entry', 'finding'])
  assert.deepEqual(items.filter((it) => it.kind === 'level').map((it) => it.label), ['1-1 乙', '1-2 甲', '1-3 丙'], 'levels in play order, by their number on the map')
  assert.equal(items.find((it) => it.kind === 'finding').finding.rule, 'domain', 'passing lines are not findings')
  assert.equal(rankPalette(items, '乙')[0].level, 'b')
  assert.equal(rankPalette(items, '1-3')[0].level, 'c')
  assert.equal(rankPalette(items, 'adder')[0].kind, 'entry')
  assert.deepEqual(rankPalette(items, '>').map((it) => it.kind), ['action'])
  assert.deepEqual(rankPalette(items, '@hint').map((it) => it.path), ['hint[0]'])
  assert.equal(rankPalette(items, 'srch')[0].action, 'search', 'letters in order')
  assert.deepEqual(rankPalette(items, 'zzz'), [])
  assert.ok(scoreOf('Search', 'se') > scoreOf('the search', 'se') && scoreOf('the search', 'se') > scoreOf('lose', 'se') && scoreOf('lose', 'se') > scoreOf('s-x-e', 'se'))
})

test('the check’s lines as a worklist: severity, rule, levels; filtered and stepped through', () => {
  assert.equal(ruleOf('content: levels/a.json.title: is not a text'), 'content')
  assert.equal(ruleOf('text levels.1.hint[0] has no English'), 'copy')
  assert.equal(ruleOf('course: on a tray, and no level brings it in or builds it (1): x@a'), 'tray-unmet')
  assert.equal(ruleOf("OPEN course: offered before the level that builds it (2, on the game's work list): x@a"), 'built-later')
  assert.equal(ruleOf('course: left open in game.json, but met now (not-built): drop x@a'), 'not-built')
  assert.equal(ruleOf('REPORT difficulty-spike: a costs 3.0 attempts'), 'difficulty-spike')
  assert.equal(ruleOf('a links the entry x, which opens later (at b)'), 'links')
  assert.equal(ruleOf('a 甲: answer PASS (2 tests)'), 'domain')
  const items = [
    { text: 'a 甲: answer PASS', levels: ['a'] },
    { fail: true, text: 'b: the answer fails test 1', levels: ['b'] },
    { text: 'REPORT difficulty-spike: a costs 3.0 attempts', levels: ['a'] },
    { fail: true, text: 'content: levels/a.json.n: not an integer', levels: ['a'] },
    { text: 'OPEN course: offered, but no level builds it and it is not a primitive (1): x@b', levels: ['b'] },
  ].map(itemOf)
  assert.deepEqual(filterItems(items).map((it) => it.severity), ['fail', 'fail', 'open', 'report', 'pass'], 'failures first')
  assert.deepEqual(filterItems(items, { severities: ['fail'], level: 'a' }).map((it) => it.rule), ['content'])
  assert.deepEqual(filterItems(items, { rules: ['not-built'] }).map((it) => it.levels), [['b']])
  assert.deepEqual(filterItems(items, { query: 'SPIKE' }).length, 1)
  assert.deepEqual([...tally(items).severities], [['pass', 1], ['fail', 2], ['report', 1], ['open', 1]])
  assert.deepEqual([stepIn(3, -1, 1), stepIn(3, -1, -1), stepIn(3, 2, 1), stepIn(3, 0, -1), stepIn(0, -1, 1)], [0, 2, 0, 2, -1])
})

test('on every starter: the palette indexes every level and entry', () => {
  assert.ok(STARTERS.length > 0)
  for (const game of STARTERS) {
    const content = starter(game)
    const items = paletteIndex({ content })
    assert.equal(items.filter((it) => it.kind === 'level').length, content.levels.length, game)
    assert.equal(items.filter((it) => it.kind === 'entry').length, content.glossary.entries.length, game)
  }
})

test('on every starter: the copy table’s rows: an era’s own texts and its levels’, the whole game, the encyclopedia; each with its copy rule and whose it is', async () => {
  for (const game of STARTERS) {
    const content = starter(game)
    const { vocabulary } = await runtimeOf(content)
    const order = content.levels.map((l) => l.id)
    const era = copyRows(content, vocabulary, 0, order, 'game')
    const own = eraLevels(content.eras[0])
    // The era's own texts first, under its id in game.json; then only its levels' texts, each under its level.
    const head = era.findIndex((r) => !r.file.game)
    assert.ok(head >= 0 && era.slice(0, head).every((r) => r.file.game && r.path[0] === 'chapters' && r.path[1] === 0 && r.name === String(content.eras[0].id)), game)
    assert.ok(era.slice(head).every((r) => own.includes(r.file.level) && r.name === r.file.level), game)
    assert.ok(own.every((id) => era.some((r) => r.file.level === id && r.field === 'title')), game)
    const all = copyRows(content, vocabulary, 'all', order, 'game')
    assert.ok(all.length >= era.length && all[0].file.game, game)
    // The package workspace has the package's texts alone: nothing of game.json or the course.
    assert.ok(copyRows(content, vocabulary, 'all', order).every((r) => r.own === 'package'), game)
    assert.ok(era.slice(head).every((r) => r.own === 'package') && era.slice(0, head).every((r) => r.own === 'game'), game)
    assert.ok(order.every((id) => all.some((r) => r.file.level === id)), game)
    assert.equal(new Set(all.map((r) => r.key)).size, all.length, `${game}: every row its own key`)
    const glossary = copyRows(content, vocabulary, 'glossary', order)
    const first = content.glossary.entries[0]
    assert.deepEqual(glossary.find((r) => r.name === first.id && r.field === 'body').path, ['entries', 0, 'body', 0], game)
    assert.ok(glossary.every((r) => r.file.glossary), game)
  }
})
