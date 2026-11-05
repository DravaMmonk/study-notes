// node --test games/kit/studio — the studio's tools, pure parts: bulk edits as operations (bulk.js), the command
// palette's index and ranking (palette.js), the check's lines as a worklist and the tree's marks (worklist.js), the copy
// table's rows (copy.js); and on every domain's starter game (kit/domains/<d>/starter, copied to a temp folder), that
// bulk operations, the palette's index and the copy rows hold up.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from '../engine/schema.js'
import { defineVocabulary } from '../engine/vocabulary.js'
import { putIn, takeOut } from '../engine/ops/place.js'
import { cpSync, existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { domainOf, readContent } from '../engine/content-node.js'
import { eraLevels } from '../course.js'
import { openGame } from '../engine/ops/workspace.js'
import { runChangeset } from '../engine/ops/changeset.js'
import { bulkAdds, bulkMove, bulkPatch, bulkSet, bulkUnset, commonFields } from './bulk.js'
import { paletteIndex, rankPalette, scoreOf } from './palette.js'
import { filterItems, itemOf, marksOf, ruleOf, stepIn, tally, testsOf } from './worklist.js'
import { copyRows } from './copy.js'

const VOCAB = defineVocabulary({
  domain: 'toy',
  version: 1,
  kinds: { part: { add: { about: 'adds' }, sub: { about: 'subtracts' } } },
  game: S.obj({ title: S.text(), eras: S.list(S.any()) }),
  level: S.by('kind', {
    board: S.obj({ kind: S.oneOf(['board', 'hand']), title: S.text(), note: S.opt(S.text()), n: S.opt(S.int()), adds: S.opt(S.list(S.ref('part'))), tests: S.list(S.int(), { section: 'tests' }), hidden: S.opt(S.list(S.int(), { section: 'tests' })), solution: S.board() }),
    hand: S.obj({ kind: S.oneOf(['board', 'hand']), title: S.text(), moves: S.list(S.str()) }),
  }),
})
const LEVELS = [
  { id: 'a', kind: 'board', title: { zh: '甲', en: 'A' }, adds: ['add'], tests: [1, 2], hidden: [3], solution: [] },
  { id: 'b', kind: 'board', title: { zh: '乙', en: 'Bee' }, n: 2, tests: [1], solution: [] },
  { id: 'c', kind: 'hand', title: { zh: '丙', en: 'C' }, moves: [] },
]

test('bulk edits are one operation a level, and the levels an edit does not fit are skipped with the reason', () => {
  assert.deepEqual(commonFields(VOCAB, LEVELS.slice(0, 2)).map((f) => f.key), ['kind', 'title', 'note', 'n', 'adds', 'tests', 'hidden', 'solution'])
  assert.deepEqual(commonFields(VOCAB, LEVELS).map((f) => f.key), ['kind', 'title'], 'a level of another shape: only what both shapes hold')
  assert.deepEqual(bulkSet(VOCAB, LEVELS, ['n'], 2), {
    ops: [{ op: 'level.set', level: 'a', path: ['n'], value: 2 }],
    skipped: [{ level: 'b', why: 'holds that already' }, { level: 'c', why: 'has no such field' }],
  })
  assert.deepEqual(bulkSet(VOCAB, LEVELS.slice(0, 1), ['note'], { zh: '注', en: 'Note' }).ops, [{ op: 'text.set', level: 'a', path: ['note'], zh: '注', en: 'Note' }])
  assert.deepEqual(bulkSet(VOCAB, LEVELS.slice(0, 1), ['solution'], ['x = add()']).ops, [{ op: 'level.blueprint', level: 'a', path: ['solution'], text: 'x = add()' }])
  assert.deepEqual(bulkUnset(LEVELS, ['n']), { ops: [{ op: 'level.unset', level: 'b', path: ['n'] }], skipped: [{ level: 'a', why: 'has none' }, { level: 'c', why: 'has none' }] })
  assert.deepEqual(bulkPatch(LEVELS.slice(0, 2), { n: 2, note: null }).ops, [{ op: 'level.patch', level: 'a', fields: { n: 2, note: null } }])
  assert.deepEqual(bulkAdds(VOCAB, LEVELS, { add: ['sub'], remove: ['add'] }), {
    ops: [{ op: 'level.adds', level: 'a', add: ['sub'], remove: ['add'] }, { op: 'level.adds', level: 'b', add: ['sub'] }],
    skipped: [{ level: 'c', why: 'brings in no parts' }],
  })
  // Moved together: the first to the place, each next right after the one before, on the main path when the place is.
  assert.deepEqual(bulkMove(['x', 'y', 'z'], { era: 1, path: 'foundation', at: 0 }).map((op) => op.to), [{ era: 1, path: 'foundation', at: 0 }, { after: 'x', on: 'path' }, { after: 'y', on: 'path' }])
  assert.deepEqual(bulkMove(['x', 'y'], { branch: 'p', era: 1, at: 0 }).map((op) => op.to), [{ branch: 'p', era: 1, at: 0 }, { after: 'x' }])
  // Each move lands where it says: the levels end up together, in order.
  let eras = [{ id: 1, foundation: ['a', 'b', 'x', 'c', 'y'] }]
  for (const op of bulkMove(['y', 'x'], { after: 'a', on: 'path' })) eras = putIn(takeOut(eras, op.level).eras, op.level, op.to)
  assert.deepEqual(eras[0].foundation, ['a', 'y', 'x', 'b', 'c'])
})

// Every domain's starter game, as content.js assembles it; and one opened for operations in a temp games folder.
const DOMAINS = resolve(import.meta.dirname, '../domains')
const STARTERS = readdirSync(DOMAINS).filter((d) => existsSync(resolve(DOMAINS, d, 'starter', 'game.json')))
const starter = (d) => readContent('starter', resolve(DOMAINS, d))
function openStarter(d) {
  const root = mkdtempSync(join(tmpdir(), 'studio-tools-'))
  cpSync(resolve(DOMAINS, d, 'starter'), join(root, d), { recursive: true })
  writeFileSync(join(root, 'games.js'), `export const GAMES = [{ id: '${d}', levels: ${readdirSync(join(root, d, 'levels')).length} }]\n`)
  return openGame(d, root)
}

test('on every starter: a bulk edit of its first era’s levels runs as a changeset, and a move lands where it says', async () => {
  for (const d of STARTERS) {
    const ws = openStarter(d)
    const content = ws.content()
    const { vocabulary } = await domainOf(content)
    const ids = eraLevels(content.eras[0])
    const levels = ids.map((id) => content.levels.find((l) => l.id === id))
    // A text every level of the era holds: the title, which every vocabulary gives a level.
    const { ops, skipped } = bulkSet(vocabulary, levels, ['title'], { zh: '同一个标题', en: 'One title' })
    assert.deepEqual([ops.length, skipped], [ids.length, []], d)
    // The era's levels backwards, from the top of its main path: they end up together, in that order.
    const moved = bulkMove([...ids].reverse(), { era: content.eras[0].id, path: 'foundation', at: 0 })
    const r = await runChangeset(ws, { ops: [...ops, ...moved] }, { write: false, check: false })
    assert.equal(r.failed, null, `${d}: ${r.problems.join('\n')}`)
    assert.deepEqual(eraLevels(r.content.eras[0]), [...ids].reverse(), d)
    assert.ok(ids.every((id) => r.content.levels.find((l) => l.id === id).title.en === 'One title'), d)
  }
})

const CONTENT = {
  id: 'toy', title: { zh: '玩具', en: 'Toy' }, eras: [{ id: 1, title: { zh: '第一章', en: 'One' }, foundation: ['a', 'b'] }],
  levels: LEVELS, glossary: { groups: [], entries: [{ id: 'adder', title: { zh: '加法器', en: 'adder' }, body: [] }] },
}

test('the palette indexes levels, eras, fields, entries, findings, recent fields and actions, and ranks them as typed', () => {
  const items = paletteIndex({
    content: CONTENT, labels: [{ id: 'b', label: '1-1' }, { id: 'a', label: '1-2' }, { id: 'c', label: '1-3' }], level: 'a', fields: ['title', 'tests', 'hint[0]'],
    items: [itemOf({ fail: true, text: 'a: reference fails test 2', levels: ['a'] }), itemOf({ text: 'b: answer PASS', levels: ['b'] })],
    recent: [{ level: 'a', path: 'title' }], actions: [{ id: 'search', label: 'Search and replace', keys: 'Ctrl+Shift+F' }], lang: 'en',
  })
  assert.deepEqual(items.map((it) => it.kind), ['recent', 'action', 'level', 'level', 'level', 'era', 'field', 'field', 'field', 'entry', 'finding'])
  assert.deepEqual(items.filter((it) => it.kind === 'level').map((it) => it.label), ['1-1 Bee', '1-2 A', '1-3 C'], 'levels in play order, by their number on the map')
  assert.equal(items.find((it) => it.kind === 'finding').finding.rule, 'domain', 'passing lines are not findings')
  assert.equal(rankPalette(items, 'bee')[0].level, 'b')
  assert.equal(rankPalette(items, '乙')[0].level, 'b', 'found by the other side’s title')
  assert.equal(rankPalette(items, '1-3')[0].level, 'c')
  assert.equal(rankPalette(items, 'adder')[0].kind, 'entry')
  assert.deepEqual(rankPalette(items, '>').map((it) => it.kind), ['action'])
  assert.deepEqual(rankPalette(items, '@hint').map((it) => it.path), ['hint[0]'])
  assert.equal(rankPalette(items, 'srch')[0].action, 'search', 'letters in order')
  assert.deepEqual(rankPalette(items, 'zzz'), [])
  assert.ok(scoreOf('Search', 'se') > scoreOf('the search', 'se') && scoreOf('the search', 'se') > scoreOf('lose', 'se') && scoreOf('lose', 'se') > scoreOf('s-x-e', 'se'))
})

test('the check’s lines as a worklist: severity, rule, levels; filtered, stepped through; the tree’s marks', () => {
  assert.equal(ruleOf('content: levels/a.json.title: is not a text'), 'content')
  assert.equal(ruleOf('text levels.1.hint[0] has no English'), 'copy')
  assert.equal(ruleOf('course: more than one new part in one level (1): x@a'), 'many-new')
  assert.equal(ruleOf("OPEN course: a new idea no later level puts to work before two more new ideas come in (brought in before it is needed) (2, on the game's work list): x@a"), 'idle-idea')
  assert.equal(ruleOf('course: left open in game.json, but met now (unused): drop x@a'), 'unused')
  assert.equal(ruleOf('REPORT difficulty-spike: a costs 3.0 attempts'), 'difficulty-spike')
  assert.equal(ruleOf('a links the entry x, which opens later (at b)'), 'links')
  assert.equal(ruleOf('a 甲: answer PASS (2 tests)'), 'domain')
  const items = [
    { text: 'a 甲: answer PASS', levels: ['a'] },
    { fail: true, text: 'b: the answer fails test 1', levels: ['b'] },
    { text: 'REPORT difficulty-spike: a costs 3.0 attempts', levels: ['a'] },
    { fail: true, text: 'content: levels/a.json.n: not an integer', levels: ['a'] },
    { text: 'OPEN course: a built part that no later reference answer (nor a later task of its own level) uses (1): x@b', levels: ['b'] },
  ].map(itemOf)
  assert.deepEqual(filterItems(items).map((it) => it.severity), ['fail', 'fail', 'open', 'report', 'pass'], 'failures first')
  assert.deepEqual(filterItems(items, { severities: ['fail'], level: 'a' }).map((it) => it.rule), ['content'])
  assert.deepEqual(filterItems(items, { rules: ['unused'] }).map((it) => it.levels), [['b']])
  assert.deepEqual(filterItems(items, { query: 'SPIKE' }).length, 1)
  assert.deepEqual([...tally(items).severities], [['pass', 1], ['fail', 2], ['report', 1], ['open', 1]])
  assert.deepEqual([stepIn(3, -1, 1), stepIn(3, -1, -1), stepIn(3, 2, 1), stepIn(3, 0, -1), stepIn(0, -1, 1)], [0, 2, 0, 2, -1])
  assert.equal(testsOf(VOCAB.level, LEVELS[0], VOCAB), 3, 'visible and hidden tests')
  const marks = marksOf(CONTENT, VOCAB, items, true)
  assert.deepEqual(marks.get('a'), { fails: 1, open: 1, domain: 'pass', tests: 3 })
  assert.deepEqual(marks.get('b'), { fails: 1, open: 1, domain: 'fail', tests: 1 })
  assert.equal(marks.get('c').domain, 'pass', 'the whole check in, nothing failing: its answers pass')
  assert.equal(marksOf(CONTENT, VOCAB, [], false).get('c').domain, null, 'not checked yet')
})

test('on every starter: the palette indexes every level and entry, and the tree’s marks count every test', async () => {
  assert.ok(STARTERS.length > 0)
  let tests = 0
  for (const game of STARTERS) {
    const content = starter(game)
    const { vocabulary } = await domainOf(content)
    const items = paletteIndex({ content })
    assert.equal(items.filter((it) => it.kind === 'level').length, content.levels.length, game)
    assert.equal(items.filter((it) => it.kind === 'entry').length, content.glossary.entries.length, game)
    const marks = marksOf(content, vocabulary, [], false)
    for (const { id, ...level } of content.levels) assert.equal(marks.get(id).tests, testsOf(vocabulary.level, level, vocabulary), `${game} ${id}`)
    tests += [...marks.values()].reduce((n, m) => n + m.tests, 0)
  }
  // A truth circuit's rows are its tests, which no field lists; the starters together hold some.
  assert.ok(tests > 0)
})

test('on every starter: the copy table’s rows: an era’s own texts and its levels’, the whole game, the encyclopedia; each with its copy rule', async () => {
  for (const game of STARTERS) {
    const content = starter(game)
    const { vocabulary } = await domainOf(content)
    const order = content.levels.map((l) => l.id)
    const era = copyRows(content, vocabulary, 0, order)
    const own = eraLevels(content.eras[0])
    // The era's own texts first, under its id in game.json; then only its levels' texts, each under its level.
    const head = era.findIndex((r) => !r.file.game)
    assert.ok(head > 0 && era.slice(0, head).every((r) => r.file.game && r.path[0] === 'eras' && r.path[1] === 0 && r.name === String(content.eras[0].id)), game)
    assert.ok(era.slice(head).every((r) => own.includes(r.file.level) && r.name === r.file.level), game)
    assert.ok(own.every((id) => era.some((r) => r.file.level === id && r.field === 'title')), game)
    const all = copyRows(content, vocabulary, 'all', order)
    assert.ok(all.length >= era.length && all[0].file.game, game)
    assert.ok(order.every((id) => all.some((r) => r.file.level === id)), game)
    assert.equal(new Set(all.map((r) => r.key)).size, all.length, `${game}: every row its own key`)
    const glossary = copyRows(content, vocabulary, 'glossary', order)
    const first = content.glossary.entries[0]
    assert.deepEqual(glossary.find((r) => r.name === first.id && r.field === 'body').path, ['entries', 0, 'body', 0], game)
    assert.ok(glossary.every((r) => r.file.glossary), game)
  }
})
