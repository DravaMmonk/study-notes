// node --test games/kit/studio — the studio's pure parts: forms from schemas (form.js), each edit as its operation and
// a pending changeset's coalescing, the course tree and its drop slots (tree.js), a changed file read field by field
// (diff.js); and on a real game, that every level of every domain reads as a form with no field left to raw JSON
// that the schema could say more about.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from '../engine/schema.js'
import { defineVocabulary } from '../engine/vocabulary.js'
import { putIn, takeOut } from '../engine/ops/place.js'
import { domainOf, readContent } from '../engine/content-node.js'
import { blank, boardsOf, formOf, holdsLevels, opFor, pushOp, recast, shapeOf, textsOf } from './form.js'
import { courseTree, stays } from './tree.js'
import { fieldDiff } from './diff.js'

const VOCAB = defineVocabulary({
  domain: 'toy',
  version: 1,
  kinds: { part: { add: { about: { zh: '加', en: 'adds' } }, sub: { about: 'subtracts' } }, gen: { rows: { about: 'rows', params: S.obj({ n: S.int({ min: 1 }), wide: S.opt(S.bool()) }) }, none: { about: 'nothing' } } },
  game: S.obj({ title: S.text(), eras: S.list(S.any()) }),
  level: S.by('kind', {
    board: S.obj({
      kind: S.oneOf(['board', 'hand']),
      title: S.text({ about: 'what the map shows' }),
      hint: S.opt(S.list(S.text())),
      adds: S.opt(S.list(S.ref('part'))),
      tests: S.list(S.obj({ input: S.num({ min: 0, max: 9 }), from: S.opt(S.level()) })),
      gen: S.call('gen'),
      pick: S.either(S.str(), S.list(S.str())),
      solution: S.board(),
      naive: S.opt(S.board()),
      extra: S.any(),
    }),
    hand: S.obj({ kind: S.oneOf(['board', 'hand']), title: S.text({ about: 'what the map shows' }), moves: S.list(S.str()) }),
  }),
})
const ctx = { vocabulary: VOCAB, levels: ['a', 'b'] }
const LEVEL = { kind: 'board', title: { zh: '甲', en: 'A' }, adds: ['add'], tests: [{ input: 3 }], gen: { rows: { n: 2 } }, pick: ['x'], solution: ['s = add(in)', 'out <- s'], extra: { any: 1 } }

test('a level reads as fields by its schema: its shape (by), texts, choices from the vocabulary, calls, boards', () => {
  const form = formOf(VOCAB.level, LEVEL, ctx)
  assert.equal(form.kind, 'obj')
  assert.deepEqual(form.tag.options.map((o) => o.value), ['board', 'hand'])
  assert.equal(form.tag.value, 'board')
  const field = (key) => form.fields.find((f) => f.key === key)
  assert.equal(field('title').field.kind, 'text')
  assert.equal(field('title').about, 'what the map shows')
  assert.equal(field('hint').field, null, 'an optional field not there has no field, only its schema to add it')
  assert.equal(field('hint').optional, true)
  const adds = field('adds').field
  assert.equal(adds.kind, 'list')
  assert.deepEqual(adds.items[0].options, [{ value: 'add', about: { zh: '加', en: 'adds' } }, { value: 'sub', about: 'subtracts' }])
  assert.deepEqual(adds.items[0].path, ['adds', 0])
  const input = field('tests').field.items[0].fields.find((f) => f.key === 'input').field
  assert.deepEqual([input.kind, input.min, input.max, input.int, input.path], ['num', 0, 9, false, ['tests', 0, 'input']])
  const from = field('tests').field.items[0].fields.find((f) => f.key === 'from')
  assert.equal(from.field, null)
  assert.deepEqual(formOf(from.schema, 'b', ctx).options.map((o) => o.value), ['a', 'b'], 'a level field picks among the game’s levels')
  const gen = field('gen').field
  assert.deepEqual([gen.kind, gen.item, gen.params.kind, gen.params.path], ['call', 'rows', 'obj', ['gen', 'rows']])
  assert.equal(field('pick').field.kind, 'list', 'an either reads as the shape the value has')
  assert.equal(field('pick').field.shape, 1)
  assert.equal(field('solution').field.kind, 'board')
  assert.equal(field('extra').field.kind, 'any')
  // Another case of the by: its own fields.
  const hand = formOf(VOCAB.level, { kind: 'hand', title: 'H', moves: [] }, ctx)
  assert.deepEqual(hand.fields.map((f) => f.key), ['kind', 'title', 'moves'])
})

test('blank values fit their schemas, and a shape recast keeps the fields both shapes share', () => {
  const value = blank(VOCAB.level, ctx)
  assert.equal(value.kind, 'board')
  assert.deepEqual(value.gen, { rows: { n: 1 } })
  assert.deepEqual(blank(S.call('gen'), ctx), { rows: { n: 1 } })
  assert.equal(blank(S.level(), ctx), 'a')
  const tag = formOf(VOCAB.level, LEVEL, ctx).tag
  assert.deepEqual(recast(tag, LEVEL, 'hand', ctx), { kind: 'hand', title: { zh: '甲', en: 'A' }, moves: [] })
  assert.equal(shapeOf(S.either(S.str(), S.list(S.str())), ['x'], VOCAB).at, 1)
  assert.equal(shapeOf(S.either(S.str(), S.obj({ a: S.int() })), { a: 'not a number' }, VOCAB).at, 1, 'a value fitting no shape reads as the shape of its kind')
})

test('an edit is the operation that makes it, and edits of one field coalesce', () => {
  assert.deepEqual(opFor({ level: 'a' }, ['title'], { set: { zh: '乙', en: 'B' } }, 'text'), { op: 'text.set', level: 'a', path: ['title'], zh: '乙', en: 'B' })
  assert.deepEqual(opFor({ game: true }, ['title'], { set: { zh: '乙', en: 'B' } }, 'text'), { op: 'text.set', in: 'game', path: ['title'], zh: '乙', en: 'B' })
  assert.deepEqual(opFor({ level: 'a' }, ['solution'], { set: ['x = add()', 'out <- x'] }, 'board'), { op: 'level.blueprint', level: 'a', path: ['solution'], text: 'x = add()\nout <- x' })
  assert.deepEqual(opFor({ level: 'a' }, ['tests', 0, 'input'], { set: 4 }, 'num'), { op: 'level.set', level: 'a', path: ['tests', 0, 'input'], value: 4 })
  assert.deepEqual(opFor({ level: 'a' }, ['hint'], { unset: true }), { op: 'level.unset', level: 'a', path: ['hint'] })
  assert.deepEqual(opFor({ game: true }, ['eras', 0, 'title'], { unset: true }), { op: 'game.unset', path: ['eras', 0, 'title'] })
  assert.deepEqual(opFor({ level: 'a' }, [], { set: { kind: 'hand' } }, 'obj'), { op: 'level.replace', level: 'a', data: { kind: 'hand' } })
  assert.deepEqual(opFor({ level: 'a' }, ['title'], { set: { en: 'B' } }, 'text'), { op: 'text.set', level: 'a', path: ['title'], en: 'B' }, 'one side typed into: that side')
  let ops = []
  for (const en of ['B', 'Bo', 'Bob']) ops = pushOp(ops, opFor({ level: 'a' }, ['title'], { set: { en } }, 'text'))
  ops = pushOp(ops, opFor({ level: 'a' }, ['title'], { set: { zh: '乙' } }, 'text'))
  assert.deepEqual(ops, [{ op: 'text.set', level: 'a', path: ['title'], en: 'Bob', zh: '乙' }], 'typing into one text is one operation, both sides kept')
  ops = pushOp(ops, { op: 'level.move', level: 'a', to: { before: 'b' } })
  ops = pushOp(ops, { op: 'level.move', level: 'a', to: { after: 'b' } })
  assert.equal(ops.length, 2, 'moving the same level again replaces the move')
  ops = pushOp(ops, opFor({ level: 'a' }, ['title'], { set: { en: 'Bobs' } }, 'text'))
  assert.equal(ops.length, 3, 'an edit after another operation is a new one')
})

test('a level’s boards, its reference, its texts; which schemas hold levels', () => {
  assert.equal(holdsLevels(S.list(S.either(S.level(), S.obj({ parallel: S.list(S.obj({ levels: S.list(S.level()) })) })))), true)
  assert.equal(holdsLevels(S.obj({ title: S.text(), n: S.int() })), false)
  const { paths, reference } = boardsOf(VOCAB, { id: 'a', ...LEVEL, naive: ['out <- in'] })
  assert.deepEqual(paths, [['solution'], ['naive']])
  assert.deepEqual(reference, ['solution'])
  assert.deepEqual(textsOf(VOCAB.level, { ...LEVEL, hint: [{ zh: '提示', en: 'hint' }] }, VOCAB).map((t) => t.path), [['title'], ['hint', 0]])
})

const ERAS = [
  { id: 1, foundation: ['a', { parallel: [{ id: 'p', levels: ['b', 'c'] }, { id: 'q', levels: ['d'] }] }, 'e'], practice: ['f'], topics: [{ id: 't', levels: ['g'] }], challenges: [{ level: 'h', after: 'e' }] },
  { id: 2, foundation: ['i'] },
]

test('the course tree lays out eras as the map does, with a slot between every two levels', () => {
  const tree = courseTree(ERAS)
  const [one, two] = tree.eras
  assert.deepEqual(one.paths.map((p) => p.path), ['foundation', 'practice'])
  assert.deepEqual(two.paths.map((p) => p.path), ['foundation'])
  const path = one.paths[0]
  assert.deepEqual(path.items.map((i) => i.level ?? i.parallel.map((b) => b.branch.id)), ['a', ['p', 'q'], 'e'])
  assert.deepEqual(path.slots, [{ era: 1, path: 'foundation', at: 0 }, { after: 'a', on: 'path' }, { after: 'd', on: 'path' }, { after: 'e', on: 'path' }])
  assert.deepEqual(path.items[1].parallel[0].slots, [{ branch: 'p', era: 1, at: 0 }, { after: 'b' }, { after: 'c' }])
  assert.deepEqual(one.topics[0].slots, [{ topic: 't', era: 1, at: 0 }, { after: 'g' }])
  assert.deepEqual(one.challenges, ['h'])
  // Every slot is a place the operation set can put a level: moving `i` into each lands where the slot is.
  const slots = [...one.paths.flatMap((p) => [...p.slots, ...p.items.flatMap((i) => (i.parallel ?? []).flatMap((b) => b.slots))]), ...one.topics.flatMap((t) => t.slots), one.challengeSlot]
  for (const to of slots) assert.doesNotThrow(() => putIn(takeOut(ERAS, 'i').eras, 'i', to), JSON.stringify(to))
  assert.equal(stays(tree, 'c', { after: 'b' }), true, 'right before itself')
  assert.equal(stays(tree, 'c', { after: 'c' }), true, 'right after itself')
  assert.equal(stays(tree, 'a', { era: 1, path: 'foundation', at: 0 }), true)
  assert.equal(stays(tree, 'a', { after: 'e', on: 'path' }), false)
})

test('a changed file reads field by field: texts and boards whole, objects and same-length lists looked into', () => {
  const before = { title: { zh: '甲', en: 'A' }, tests: [{ input: 1 }, { input: 2 }], solution: ['x', 'y'], eras: [{ foundation: ['a', 'b'] }] }
  const after = { title: { zh: '甲', en: 'Ay' }, tests: [{ input: 1 }, { input: 3 }], solution: ['x', 'z'], eras: [{ foundation: ['b', 'a', 'c'] }], note: 'n' }
  assert.deepEqual(fieldDiff(before, after), [
    { path: ['title'], before: { zh: '甲', en: 'A' }, after: { zh: '甲', en: 'Ay' }, as: 'text' },
    { path: ['tests', 1, 'input'], before: 2, after: 3, as: 'value' },
    { path: ['solution'], before: ['x', 'y'], after: ['x', 'z'], as: 'lines' },
    { path: ['eras', 0, 'foundation'], before: ['a', 'b'], after: ['b', 'a', 'c'], as: 'lines' },
    { path: ['note'], before: undefined, after: 'n', as: 'value' },
  ])
  assert.deepEqual(fieldDiff(undefined, { a: 1 }), [{ path: [], before: undefined, after: { a: 1 }, as: 'value' }])
})

test('every level of the prototypes reads as a form: each text a text pair, each board a board, where the schema has it', async () => {
  for (const game of ['factory', 'bus', 'qed-lab', 'syntax-graph', 'state-graph', 'vision-complete']) {
    const content = readContent(game)
    const { vocabulary } = await domainOf(content)
    const levels = content.levels.map((l) => l.id)
    for (const { id, ...level } of content.levels) {
      const kinds = new Map()
      const walk = (f) => {
        kinds.set(JSON.stringify(f.path), f.kind)
        for (const x of f.items ?? []) walk(x)
        for (const e of f.entries ?? []) walk(e.field)
        for (const x of f.fields ?? []) if (x.field) walk(x.field)
        if (f.params) walk(f.params)
      }
      walk(formOf(vocabulary.level, level, { vocabulary, levels }))
      for (const { path } of textsOf(vocabulary.level, level, vocabulary)) assert.equal(kinds.get(JSON.stringify(path)), 'text', `${game} ${id} ${path.join('.')}`)
      for (const path of boardsOf(vocabulary, level).paths) assert.equal(kinds.get(JSON.stringify(path)), 'board', `${game} ${id} ${path.join('.')}`)
    }
  }
})
