// node --test games/kit/engine/ops — search across a game and replace as operations (search.js): texts side by side,
// never inside a link tag; board lines; ids found and left alone; a replace as text.set and level.blueprint operations
// that a changeset runs; and on a small game on a real domain (./fixture.js), a replace that the operation set takes and
// that leaves nothing to find.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from '../schema.js'
import { defineVocabulary } from '../vocabulary.js'
import { hitKey, patternOf, replaceOps, replaced, searchContent } from './search.js'
import { openGame } from './workspace.js'
import { runChangeset } from './changeset.js'
import { proofsRoot } from './fixture.js'

const VOCAB = defineVocabulary({
  domain: 'toy',
  version: 1,
  kinds: {},
  game: S.obj({ title: S.text(), eras: S.list(S.any()) }),
  level: S.obj({ title: S.text(), hint: S.opt(S.list(S.text())), solution: S.board(), name: S.opt(S.str()) }),
})
const CONTENT = {
  id: 'toy', domain: 'toy', vocabulary: 1, title: { zh: '旗标游戏', en: 'The flag game' }, eras: [],
  levels: [
    { id: 'flag', title: { zh: '旗标', en: 'A flag' }, hint: [{ zh: '看<level-ref to="flag"></level-ref>的旗标', en: 'See <level-ref to="flag"></level-ref>: flags and a flagpole' }], solution: ['f = flag()', 'out <- f'], name: 'flag' },
    { id: 'other', title: { zh: '别的', en: 'Other' }, solution: ['x = const[value=1]()'] },
  ],
  glossary: { groups: [{ id: 'g', title: 'G' }], entries: [{ id: 'flag', group: 'g', title: { zh: '旗标', en: 'flag' }, body: [{ zh: '一个旗标', en: 'A flag is 01111110.' }] }] },
}

test('search: each side of every text, never inside a link tag; board lines; ids', () => {
  const hits = searchContent(CONTENT, VOCAB, { find: 'flag' })
  const where = hits.map((h) => `${h.file} ${h.path.join('.')} ${h.kind} ${h.side ?? h.line ?? ''}`)
  assert.deepEqual(where, [
    'levels/flag.json  id ',
    'levels/flag.json title text en',
    'levels/flag.json hint.0 text en',
    'levels/flag.json solution board 0',
    'game.json title text en',
    'glossary.json entries.0.title text en',
    'glossary.json entries.0.body.0 text en',
    'glossary.json entries.0.id id ',
  ])
  const hint = hits.find((h) => h.path.join('.') === 'hint.0')
  assert.equal(hint.at.length, 2, 'flags and flagpole, not the tag’s "flag"')
  assert.equal(hint.text.slice(...hint.at[0]), 'flag')
  assert.equal(searchContent(CONTENT, VOCAB, { find: 'flag', word: true }).find((h) => h.path.join('.') === 'hint.0'), undefined, 'a whole word: neither flags nor flagpole')
  assert.equal(searchContent(CONTENT, VOCAB, { find: 'Flag', caseSensitive: true }).length, 0)
  assert.deepEqual(searchContent(CONTENT, VOCAB, { find: '旗标', sides: ['zh'] }).map((h) => h.file), ['levels/flag.json', 'levels/flag.json', 'game.json', 'glossary.json', 'glossary.json'])
  assert.deepEqual(searchContent(CONTENT, VOCAB, { find: 'value=\\d', regex: true }).map((h) => [h.level, h.kind, h.line]), [['other', 'board', 0]])
  assert.equal(patternOf({ find: '(', regex: true }), null, 'a pattern that does not read finds nothing')
  assert.deepEqual(searchContent(CONTENT, VOCAB, { find: '(', regex: true }), [])
})

test('replace: one text.set a text with the sides it changes, one level.blueprint a board; ids left alone', () => {
  const { ops, changes, skipped } = replaceOps(CONTENT, VOCAB, { find: 'flag' }, 'marker')
  assert.deepEqual(ops, [
    { op: 'text.set', level: 'flag', path: ['title'], en: 'A marker' },
    { op: 'text.set', level: 'flag', path: ['hint', 0], en: 'See <level-ref to="flag"></level-ref>: markers and a markerpole' },
    { op: 'text.set', in: 'game', path: ['title'], en: 'The marker game' },
    { op: 'text.set', in: 'glossary', path: ['entries', 0, 'title'], en: 'marker' },
    { op: 'text.set', in: 'glossary', path: ['entries', 0, 'body', 0], en: 'A marker is 01111110.' },
    { op: 'level.blueprint', level: 'flag', path: ['solution'], text: 'f = marker()\nout <- f' },
  ])
  assert.equal(changes.length, 6)
  assert.deepEqual(skipped.map((h) => h.text), ['flag', 'flag'], 'the level id and the entry id')
  // Both sides of one text change: one operation with both.
  const both = replaceOps(CONTENT, VOCAB, { find: '旗标|flag', regex: true, kinds: ['text'] }, '*')
  assert.deepEqual(both.ops[0], { op: 'text.set', level: 'flag', path: ['title'], zh: '*', en: 'A *' })
  // A pattern's groups; only the hits picked.
  assert.equal(replaced('a1 b22', { find: '([a-z])(\\d+)', regex: true }, '$2$1'), '1a 22b')
  assert.equal(replaced('$5', { find: '$5' }, '$&!'), '$&!', 'a plain replacement is taken as it is')
  const hit = searchContent(CONTENT, VOCAB, { find: 'flag' }).find((h) => h.in === 'game')
  assert.deepEqual(replaceOps(CONTENT, VOCAB, { find: 'flag' }, 'marker', [hitKey(hit)]).ops, [{ op: 'text.set', in: 'game', path: ['title'], en: 'The marker game' }])
  assert.deepEqual(replaceOps(CONTENT, VOCAB, { find: 'nothing here' }, 'x'), { ops: [], changes: [], skipped: [] })
})

test('on a game of a real domain: a replace runs as a changeset, and afterwards there is nothing left to find', async () => {
  const { root, id } = proofsRoot()
  const ws = openGame(id, root)
  const content = ws.content()
  const { vocabulary } = (await import('../../domains/logic/domain.js')).default
  const query = { find: 'Saturday', word: true, kinds: ['text'], sides: ['en'] }
  const before = searchContent(content, vocabulary, query)
  assert.ok(before.length > 1 && new Set(before.map((h) => h.file)).size > 1, 'hits in more than one file')
  const { ops } = replaceOps(content, vocabulary, query, 'Sunday')
  const r = await runChangeset(ws, { ops }, { write: false, check: false })
  assert.equal(r.failed, null, r.problems.join('\n'))
  assert.deepEqual(searchContent(r.content, vocabulary, query), [])
  assert.ok(searchContent(r.content, vocabulary, { ...query, find: 'Sunday' }).length >= before.length)
})
