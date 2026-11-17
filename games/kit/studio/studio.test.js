// node --test games/kit/studio — the studio's pure parts: forms from schemas (form.js), the control each value takes by
// its shape and hints, cells typed and read back, a level's sections, the check's findings on their fields, each edit as
// its operation and a pending changeset's coalescing, the package's group tree and its drop slots (groups.js), the game workspace's course edits (course-edit.js), a changed file read
// field by field (diff.js), the game page's marks as the fields they show (marks.js); and on every domain's starter game
// (kit/modules/<d>/starter), that every level reads as a form with no field left to raw JSON that the schema could say
// more about, every value a schema hint names gets its control, and every cell control gives back the value it shows.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S, find, holdsLevels, sectionOf } from '../engine/schema.js'
import { defineVocabulary } from '../engine/vocabulary.js'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { runtimeOf, readStarter } from '../engine/resolver.js'
import {
  blank, boardPaths, cellText, cellValue, creationChoices, formOf, gridRows, gridValue, moved, opFor, pastedCells, placeFindings, placesOf, pushOp,
  referenceFor, revertOf, sectionsOf, shapeName, shapeOf, summaryOf, tableOf, tableValue, textsOf, taskOptionsOf, tickValue, tickValues, toggled,
} from './form.js'
import { lintText } from '../pipeline/lint.js'
import { groupOf, groupTree, stays } from './groups.js'
import { blankChapter, chapterOrderRefusal, importLevels, moveChapter } from './course-edit.js'
import { fieldDiff } from './diff.js'
import { lacking } from '../engine/text.js'
import { taskIdsOf } from '../engine/tasks.js'

import { partGroups } from './parts.js'

const VOCAB = defineVocabulary({
  module: 'toy',
  version: 1,
  kinds: { part: { add: { about: { en: '加' } }, sub: { about: 'subtracts' } }, gen: { rows: { about: 'rows', params: S.obj({ n: S.int({ min: 1 }), wide: S.opt(S.bool()) }) }, none: { about: 'nothing' } } },
  game: S.obj({ title: S.text(), eras: S.list(S.any()) }),
  level: S.by('kind', {
    board: S.obj({
      kind: S.oneOf(['board', 'hand']),
      title: S.text({ about: 'what the map shows' }),
      hint: S.opt(S.list(S.text())),
      adds: S.opt(S.list(S.ref('part', { reference: 'circuit/part' }))),
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

// Every domain's starter game, as content.js assembles it: the studio's forms on content no real game owns.
const DOMAINS = resolve(import.meta.dirname, '../templates')
const STARTERS = readdirSync(DOMAINS).filter((d) => existsSync(resolve(DOMAINS, d, 'starter', 'game.json')))
const starter = (d) => readStarter(resolve(DOMAINS, d))
const LEVEL = { kind: 'board', title: { en: '甲' }, adds: ['add'], tests: [{ input: 3 }], gen: { rows: { n: 2 } }, pick: ['x'], solution: ['s = add(in)', 'out <- s'], extra: { any: 1 } }

test('a level reads as fields by its schema: its shape (by), texts, choices from the vocabulary, calls, boards', () => {
  const form = formOf(VOCAB.level, LEVEL, ctx)
  assert.equal(form.kind, 'obj')
  assert.deepEqual(creationChoices(VOCAB.level, ctx).map((option) => option.label), ['board', 'hand'])
  assert.equal(form.tags[0].value, 'board')
  const field = (key) => form.fields.find((f) => f.key === key)
  assert.equal(field('kind').field.kind, 'fixed')
  assert.equal(field('title').field.kind, 'text')
  assert.equal(field('title').about, 'what the map shows')
  assert.equal(field('hint').field, null, 'an optional field not there has no field, only its schema to add it')
  assert.equal(field('hint').optional, true)
  const adds = field('adds').field
  assert.equal(adds.kind, 'chips', 'a list of choices is chips')
  assert.deepEqual(adds.options, [{ value: 'add', about: { en: '加' } }, { value: 'sub', about: 'subtracts' }])
  const tests = field('tests').field
  assert.deepEqual(tests.columns.map((c) => [c.key, c.schema.type, c.optional]), [['input', 'num', false], ['from', 'level', true]])
  const input = formOf(tests.columns[0].schema, 3, ctx, ['tests', 0, 'input'])
  assert.deepEqual([input.kind, input.min, input.max, input.int, input.step, input.path], ['num', 0, 9, false, 1, ['tests', 0, 'input']])
  assert.deepEqual(formOf(tests.columns[1].schema, 'b', ctx).options.map((o) => o.value), ['a', 'b'], 'a level field picks among the game’s levels')
  const gen = field('gen').field
  assert.deepEqual([gen.kind, gen.item, gen.params.kind, gen.params.path], ['call', 'rows', 'obj', ['gen', 'rows']])
  assert.equal(field('pick').field.kind, 'list', 'an either reads as the shape the value has')
  assert.equal(field('tests').field.kind, 'table', 'a list of objects of scalars is a table')
  assert.equal(field('pick').field.shape, 1)
  assert.equal(field('solution').field.kind, 'board')
  assert.equal(field('extra').field.kind, 'any')
  // Another case of the by: its own fields.
  const hand = formOf(VOCAB.level, { kind: 'hand', title: 'H', moves: [] }, ctx)
  assert.deepEqual(hand.fields.map((f) => f.key), ['kind', 'title', 'moves'])
})

test('blank values fit their schemas, and alternatives have their own creation drafts', () => {
  const value = blank(VOCAB.level, ctx)
  assert.equal(value.kind, 'board')
  assert.deepEqual(value.gen, { rows: { n: 1 } })
  assert.deepEqual(blank(S.call('gen'), ctx), { rows: { n: 1 } })
  assert.equal(blank(S.level(), ctx), 'a')
  assert.deepEqual(creationChoices(VOCAB.level, { ...ctx, lang: 'en' })[1].make(), { kind: 'hand', title: { en: '' }, moves: [] })
  assert.equal(shapeOf(S.either(S.str(), S.list(S.str())), ['x'], VOCAB).at, 1)
  assert.equal(shapeOf(S.either(S.str(), S.obj({ a: S.int() })), { a: 'not a number' }, VOCAB).at, 1, 'a value fitting no shape reads as the shape of its kind')
})

test('an edit is the operation that makes it, and edits of one field coalesce', () => {
  assert.deepEqual(opFor({ level: 'a' }, ['title'], { set: '乙', lang: 'zh' }, 'text'), { op: 'text.set', level: 'a', path: ['title'], lang: 'zh', value: '乙' })
  assert.deepEqual(opFor({ game: true }, ['title'], { set: { zh: '乙' } }, 'text'), { op: 'text.set', in: 'game', path: ['title'], value: { zh: '乙' } })
  assert.deepEqual(opFor({ level: 'a' }, ['solution'], { set: ['x = add()', 'out <- x'] }, 'board'), { op: 'level.blueprint', level: 'a', path: ['solution'], text: 'x = add()\nout <- x' })
  assert.deepEqual(opFor({ level: 'a' }, ['tests', 0, 'input'], { set: 4 }, 'num'), { op: 'level.set', level: 'a', path: ['tests', 0, 'input'], value: 4 })
  assert.deepEqual(opFor({ level: 'a' }, ['hint'], { unset: true }), { op: 'level.unset', level: 'a', path: ['hint'] })
  assert.deepEqual(opFor({ game: true }, ['chapters', 0, 'title'], { unset: true }), { op: 'game.unset', path: ['chapters', 0, 'title'] })
  assert.deepEqual(opFor({ level: 'a' }, [], { set: { kind: 'hand' } }, 'obj'), { op: 'level.replace', level: 'a', data: { kind: 'hand' } })
  let ops = []
  for (const set of ['乙', '乙丙', '乙丙丁']) ops = pushOp(ops, opFor({ level: 'a' }, ['title'], { set, lang: 'zh' }, 'text'))
  assert.deepEqual(ops, [{ op: 'text.set', level: 'a', path: ['title'], lang: 'zh', value: '乙丙丁' }], 'typing into one text is one operation')
  const french = opFor({ level: 'a' }, ['title'], { set: 'Titre', lang: 'fr' }, 'text')
  assert.deepEqual(pushOp(ops, french), [...ops, french], 'different languages are separate pending edits')
  ops = pushOp(ops, { op: 'relation.set', relation: 'path', path: 'sequence', value: ['a', 'b'] })
  ops = pushOp(ops, { op: 'relation.set', relation: 'path', path: 'sequence', value: ['b', 'a'] })
  assert.equal(ops.length, 2, 'editing the same relation again replaces the pending edit')
  ops = pushOp(ops, opFor({ level: 'a' }, ['title'], { set: { en: 'Bobs' } }, 'text'))
  assert.equal(ops.length, 3, 'an edit after another operation is a new one')
})

test('a level’s boards, its reference, its texts; which schemas hold levels', () => {
  assert.equal(holdsLevels(S.list(S.either(S.level(), S.obj({ parallel: S.list(S.obj({ levels: S.list(S.level()) })) })))), true)
  assert.equal(holdsLevels(S.obj({ title: S.text(), n: S.int() })), false)
  const level = { id: 'a', ...LEVEL, naive: ['out <- in'] }
  assert.deepEqual(boardPaths(VOCAB, level), [['solution'], ['naive']])
  assert.deepEqual(referenceFor(VOCAB, level, []), ['solution'])
  assert.deepEqual(textsOf(VOCAB.level, { ...LEVEL, hint: [{ en: '提示' }] }, VOCAB).map((t) => t.path), [['title'], ['hint', 0]])
})

test('the package sidebar lists each group with a drop place before and after its levels, then the levels in no group', () => {
  const tags = { 'level:g': { kind: 'level', title: 'G', values: ['a', 'b'] } }
  const content = { tags, registries: { tag: tags, level: { a: {}, b: {}, c: {} } }, levels: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }
  const tree = groupTree(content)
  assert.deepEqual(tree.sections.map(({ group, levels, slots }) => [group, levels.map(({ id }) => id), slots]), [
    ['level:g', ['a', 'b'], [{ group: 'level:g', at: 0 }, { group: 'level:g', after: 'a' }, { group: 'level:g', after: 'b' }]],
    [null, ['c'], [{ out: true }, null]],
  ])
  assert.equal(stays(tree, 'a', { group: 'level:g', at: 0 }), true)
  assert.equal(stays(tree, 'b', { group: 'level:g', after: 'a' }), true)
  assert.equal(stays(tree, 'a', { group: 'level:g', after: 'b' }), false)
  assert.equal(stays(tree, 'c', { out: true }), true)
  assert.equal(groupOf(content, 'b'), 'level:g')
  assert.equal(groupOf(content, 'c'), null)
})

test('chapter metadata edits preserve level references and detach a copied layout', () => {
  const chapters = [{ id: 1, levels: ['#pkg/a'] }, { id: 2, levels: ['pkg/b'] }]
  assert.deepEqual(moveChapter(chapters, 0, 1).map(({ id }) => id), [2, 1])
  assert.deepEqual(blankChapter(chapters, { ...chapters[1], rows: [['pkg/a']], title: 'T' }, (v) => v), { id: 3, title: 'T', levels: [] })
  // A level or a level tag imported with the prerequisites no chapter places yet, those first.
  const pkg = {
    registries: {
      level: { 'p/a': {}, 'p/b': {}, 'p/c': {}, 'p/d': {} }, tag: { 'p/t': { kind: 'level', values: ['p/c', 'p/d'] } },
      relation: { 'p/needs': { kind: 'requires', edges: [{ from: 'p/b', to: 'p/c' }, { from: 'p/a', to: 'p/b' }] } },
    },
    relationEdges: { requires: [{ from: 'p/b', to: 'p/c' }, { from: 'p/a', to: 'p/b' }], order: [] },
  }
  assert.deepEqual(importLevels(pkg, ['p/x'], 'p/c'), ['p/x', 'p/a', 'p/b', 'p/c'])
  assert.deepEqual(importLevels(pkg, [], '#p/t', new Set(['p/a'])), ['p/b', 'p/c', 'p/d'])
  // A chapter order that puts a level before its prerequisite is refused as the check says it.
  assert.equal(chapterOrderRefusal(pkg, ['p/a', 'p/b', 'p/c']), null)
  assert.equal(chapterOrderRefusal(pkg, ['p/b', 'p/a']), 'p/a must precede p/b in chapter order')
})

test('a changed file reads field by field: texts and boards whole, objects and lists looked into', () => {
  const before = { title: { en: '甲' }, tests: [{ input: 1 }, { input: 2 }], solution: ['x', 'y'], eras: [{ levels: [{ id: 'a' }, { id: 'b' }] }] }
  const after = { title: { en: '乙' }, tests: [{ input: 1 }, { input: 3 }], solution: ['x', 'z'], eras: [{ levels: [{ id: 'b' }, { id: 'a' }, { id: 'c' }] }], note: 'n' }
  assert.deepEqual(fieldDiff(before, after), [
    { path: ['title'], before: { en: '甲' }, after: { en: '乙' }, as: 'text' },
    { path: ['tests', 1, 'input'], before: 2, after: 3, as: 'value' },
    { path: ['solution'], before: ['x', 'y'], after: ['x', 'z'], as: 'lines' },
    { path: ['eras', 0, 'levels', 0], before: { id: 'a' }, after: undefined, as: 'value' },
    { path: ['eras', 0, 'levels', 1], before: undefined, after: { id: 'a' }, as: 'value' },
    { path: ['eras', 0, 'levels', 2], before: undefined, after: { id: 'c' }, as: 'value' },
    { path: ['note'], before: undefined, after: 'n', as: 'value' },
  ])
  assert.deepEqual(fieldDiff(undefined, { a: 1 }), [{ path: [], before: undefined, after: { a: 1 }, as: 'value' }])
})

test('a list that grew or shrank shows only the items added or removed, and items changed in place looked into', () => {
  // An item appended: only it, at its own index.
  const steps = [{ n: 1, ops: ['a'] }, { n: 2, ops: ['b'] }]
  const step = { n: 3, ops: ['c'] }
  assert.deepEqual(fieldDiff({ steps }, { steps: [...steps, step] }), [{ path: ['steps', 2], before: undefined, after: step, as: 'value' }])
  // An item removed from the middle; another inserted where one changed.
  assert.deepEqual(fieldDiff([{ n: 1 }, { n: 2 }, { n: 3 }], [{ n: 1 }, { n: 3 }]), [{ path: [1], before: { n: 2 }, after: undefined, as: 'value' }])
  assert.deepEqual(fieldDiff([{ n: 1 }, { n: 2 }, { n: 9 }], [{ n: 1 }, { n: 5 }, { n: 6 }, { n: 9 }]), [
    { path: [1, 'n'], before: 2, after: 5, as: 'value' },
    { path: [2], before: undefined, after: { n: 6 }, as: 'value' },
  ])
})

test('every level of every starter reads as a form: each text a text pair, each board a board, where the schema has it', async () => {
  assert.ok(STARTERS.length > 0)
  for (const game of STARTERS) {
    const content = starter(game)
    const { vocabulary } = await runtimeOf(content)
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
      for (const path of boardPaths(vocabulary, level)) assert.equal(kinds.get(JSON.stringify(path)), 'board', `${game} ${id} ${path.join('.')}`)
    }
  }
})

test('each kind of value takes its control: from its shape, or from the hints a vocabulary gives', () => {
  const kind = (schema, value) => formOf(schema, value, ctx)
  // Matrices: a list of lists of numbers with view grid; a flat list with cols, or as a square.
  assert.deepEqual([kind(S.list(S.list(S.num()), { view: 'grid' }), [[1, 2], [3, 4]]).kind, kind(S.list(S.list(S.num()), { view: 'grid' }), []).cols], ['grid', null])
  assert.equal(kind(S.list(S.list(S.int(), { min: 2 })), [[1, 2]]).kind, 'list', 'without the hint a list of pairs stays a list (of rows of numbers)')
  assert.equal(kind(S.list(S.num(), { view: 'grid', cols: 4 }), []).cols, 4)
  assert.equal(kind(S.list(S.num(), { view: 'grid' }), []).cols, 'square')
  // Ticks: a list of 0 / 1 by its shape; any list of cells, a string, a map of lists by the hint.
  assert.equal(kind(S.list(S.oneOf([0, 1])), [0, 1]).kind, 'ticks')
  assert.equal(kind(S.list(S.int(), { view: 'ticks' }), [0, 1]).kind, 'ticks')
  assert.deepEqual([kind(S.str({ pattern: '^[01]+$', view: 'ticks' }), '101').kind, kind(S.str({ view: 'ticks' }), '1').bits], ['ticks', true])
  assert.equal(kind(S.str({ pattern: '^[01]+$' }), '101').kind, 'str', 'a pattern alone is no hint')
  const wave = kind(S.map(S.list(S.either(S.int(), S.oneOf([null]))), { view: 'ticks' }), { go: [1, null] })
  assert.deepEqual([wave.kind, wave.cell.type], ['wave', 'either'])
  // Numbers in a row; choices as chips; records and maps of scalars as tables.
  assert.equal(kind(S.list(S.num()), [1, 2]).kind, 'numbers')
  assert.deepEqual([kind(S.list(S.level()), ['a']).kind, kind(S.list(S.level()), ['a']).of], ['chips', 'level'])
  assert.equal(kind(S.list(S.oneOf(['x', 'y'])), ['x']).kind, 'chips')
  const records = kind(S.list(S.map(S.str())), [{ A: 'Rain' }])
  assert.deepEqual([records.kind, records.columns, records.cell.type], ['table', null, 'str'])
  const keyed = kind(S.map(S.str()), { p: 'A ∧ B' })
  assert.deepEqual([keyed.kind, keyed.keyed], ['table', true])
  assert.equal(kind(S.map(S.list(S.int())), { a: [1] }).kind, 'map', 'a map of lists without the hint stays a map')
  assert.equal(kind(S.list(S.obj({ t: S.text() })), []).kind, 'list', 'objects holding text stay cards')
  // Numbers carry their range and step.
  const n = kind(S.num({ min: 0, max: 1, step: 0.05 }), 0.5)
  assert.deepEqual([n.kind, n.min, n.max, n.step], ['num', 0, 1, 0.05])
})

test('cells are typed and read back; a pasted block, a tick flipped, an item moved, a folded item summed up', () => {
  assert.equal(cellValue(S.int(), '3'), 3)
  assert.equal(cellValue(S.int(), '3.5'), undefined)
  assert.equal(cellValue(S.num(), '-0.25'), -0.25)
  assert.equal(cellValue(S.num(), ''), undefined)
  const maybe = S.either(S.int(), S.oneOf([null]))
  assert.deepEqual([cellValue(maybe, ''), cellValue(maybe, '—'), cellValue(maybe, '7')], [null, null, 7])
  assert.equal(cellValue(S.oneOf([0, 1]), '1'), 1)
  assert.equal(cellValue(S.str(), 'Rain'), 'Rain')
  assert.equal(cellValue(S.any(), 'null'), null)
  for (const v of [0, 1, 2.5, -3, 'x', null]) assert.equal(cellValue(v === 'x' ? S.str() : v === null ? maybe : S.num(), cellText(v)), v, `round trip ${v}`)
  assert.deepEqual(pastedCells('1\t2\n3\t4\n'), [['1', '2'], ['3', '4']])
  assert.deepEqual(pastedCells('1 2, 3'), [['1', '2', '3']])
  assert.deepEqual([toggled(0), toggled(1), toggled(null)], [1, 0, 1])
  assert.deepEqual(moved(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a'])
  assert.equal(summaryOf({ t: { en: '一<b>句</b><part-ref to="add"></part-ref>' } }), '一句add')
  assert.equal(summaryOf({ R: 3, costs: [[1, 2], [3]] }), 'R 3 · costs [1 2] · costs [3]')
  assert.equal(summaryOf({ go: [1, null, 0] }), 'go [1 — 0]')
})

test('a level falls into sections: what the player reads, the puzzle, tests, answers, the course', () => {
  assert.equal(sectionOf(S.text()), 'read')
  assert.equal(sectionOf(S.list(S.obj({ t: S.text(), fig: S.opt(S.call('gen')) }))), 'read', 'words and their figures')
  assert.equal(sectionOf(S.list(S.obj({ name: S.str(), label: S.text() }))), 'puzzle', 'ports: names with labels')
  assert.equal(sectionOf(S.board()), 'answers')
  assert.equal(sectionOf(S.opt(S.level())), 'course')
  assert.equal(sectionOf(S.list(S.ref('part', { reference: 'circuit/part' }), { section: 'course' })), 'course', 'the hint wins')
  const form = formOf(S.obj({ title: S.text(), n: S.int(), tests: S.list(S.int(), { section: 'tests' }), solution: S.board(), carry: S.opt(S.level()) }), { title: 'T', n: 1, tests: [], solution: [] }, ctx)
  assert.deepEqual(sectionsOf(form).map((s) => [s.section, s.fields.map((f) => f.key)]), [['read', ['title']], ['puzzle', ['n']], ['tests', ['tests']], ['answers', ['solution']], ['course', ['carry']]])
  assert.equal(sectionsOf(formOf(VOCAB.level, LEVEL, ctx)).flatMap((s) => s.fields.map((f) => f.key)).includes('kind'), false, 'the shape field is in the head')
  const shapes = [S.by('world', { a: S.obj({ world: S.oneOf(['a']), x: S.int() }) }), S.obj({ x: S.int(), stages: S.list(S.any()) })]
  assert.deepEqual(shapes.map((s) => shapeName(s, shapes)), ['world', 'stages'])
})

test('the check’s findings land on the fields they are about', () => {
  const lines = [
    { fail: true, text: 'content: levels/a.json.tests[0].input: 12 is outside 0–9', levels: ['a'] },
    { fail: true, text: 'text levels.1.title has an empty English side: 乙', levels: ['b'] },
    { fail: true, text: 'a: reference fails test 2', levels: ['a'] },
    { text: 'a: answer PASS', levels: ['a'] },
  ]
  const places = placesOf(lines, ['a', 'b'])
  assert.deepEqual(places, [
    { level: 'a', path: ['tests', 0, 'input'], says: '12 is outside 0–9' },
    { level: 'b', path: ['title'], says: 'has an empty English side: 乙' },
    { level: 'a', path: null, says: 'a: reference fails test 2' },
  ])
  const form = formOf(VOCAB.level, LEVEL, ctx)
  const { at, rest } = placeFindings(form, [...places.filter((p) => p.level === 'a'), { path: ['gen', 'rows', 'n'], says: 'n is wrong' }])
  assert.deepEqual([...at], [['tests', ['12 is outside 0–9']], ['gen.rows.n', ['n is wrong']]], 'inside a table: on the table')
  assert.deepEqual(rest, ['a: reference fails test 2'])
})

test('a field put back, a test list’s reference, the copy rules on one text', () => {
  assert.deepEqual(revertOf(3), { set: 3 })
  assert.deepEqual(revertOf(undefined), { unset: true })
  const level = { id: 'x', ...LEVEL, tasks: [{ solution: ['a'], tests: [] }, { tests: [] }] }
  const vocab = { ...VOCAB, level: S.obj({ ...VOCAB.level.cases.board.fields, tasks: S.list(S.obj({ solution: S.board(), tests: S.list(S.any()) })) }) }
  assert.deepEqual(referenceFor(vocab, level, ['tasks', 0]), ['tasks', 0, 'solution'], 'a task’s tests run its own reference')
  assert.deepEqual(referenceFor(vocab, level, []), ['solution'], 'the level’s tests its own')
  assert.equal(referenceFor(vocab, level, ['tasks', 1]), null, 'a task without a reference cannot run another task’s board')
  assert.deepEqual(lintText('brief', { zh: '因为要搞定它' }).map((f) => f.rule), ['copy-banned', 'copy-brief-why'])
  assert.deepEqual(lintText('after', { en: '<part-ref to="a"></part-ref>' }).map((f) => f.rule), ['copy-after-part'])
  assert.deepEqual(lintText('title', { en: '好' }), [])
})

/** Every field of a form, depth first. */
function* fieldsIn(f) {
  yield f
  for (const x of f.items ?? []) yield* fieldsIn(x)
  for (const e of f.entries ?? []) yield* fieldsIn(e.field)
  for (const x of f.fields ?? []) if (x.field) yield* fieldsIn(x.field)
  if (f.params) yield* fieldsIn(f.params)
}

/** The control a hinted schema asks for (form.js), or null: a grid, ticks (a string of bits too), a wave of ticks. */
const hinted = (s) => (s.view === 'grid' ? 'grid' : s.view === 'ticks' ? (s.type === 'map' ? 'wave' : 'ticks') : null)

test('on every starter: each value a schema hint names gets its control, and each cell control gives back the value it shows', async () => {
  const counts = {}
  for (const game of STARTERS) {
    const content = starter(game)
    const { vocabulary } = await runtimeOf(content)
    const levels = content.levels.map((l) => l.id)
    for (const { id, ...level } of content.levels) {
      const kinds = new Map()
      for (const f of fieldsIn(formOf(vocabulary.level, level, { vocabulary, levels }))) {
        const where = `${game} ${id} ${f.path.join('.')}`
        kinds.set(f.path.join('.'), f.kind)
        counts[f.kind] = (counts[f.kind] ?? 0) + 1
        if (f.kind === 'grid') assert.deepEqual(gridValue(f, gridRows(f)), f.value, where)
        if (f.kind === 'ticks') assert.deepEqual(tickValue(f, tickValues(f)), f.value, where)
        if (f.kind === 'table') {
          const t = tableOf(f)
          assert.deepEqual(tableValue(f, t, t.rows), f.value, where)
        }
        if (f.kind === 'wave') for (const v of Object.values(f.value)) assert.ok(Array.isArray(v), where)
        // Every cell a control shows types back to itself.
        const cells = f.kind === 'grid' ? gridRows(f).flat() : f.kind === 'ticks' ? tickValues(f) : f.kind === 'numbers' ? f.value : f.kind === 'wave' ? Object.values(f.value).flat() : []
        for (const v of cells) assert.deepEqual(cellValue(f.cell, cellText(v)), v, `${where} cell ${v}`)
      }
      // Every value whose schema carries a view hint (found through the schema, whatever its type) gets that control.
      for (const type of ['list', 'map', 'str']) {
        for (const { path, schema } of find(vocabulary.level, level, type, { vocabulary })) {
          const want = hinted(schema)
          if (!want) continue
          assert.equal(kinds.get(path.join('.')), want, `${game} ${id} ${path.join('.')}`)
        }
      }
    }
  }
  for (const k of ['text', 'board', 'choice', 'call', 'list', 'chips']) assert.ok(counts[k] > 0, `some field is ${k}`)
})

test('each control on content written here: a grid, ticks, a wave, a table read back as the value they show', () => {
  const LEVEL_HINTS = S.obj({
    kernel: S.list(S.list(S.num()), { view: 'grid' }),
    flags: S.list(S.oneOf([0, 1])),
    bits: S.str({ pattern: '^[01]+$', view: 'ticks' }),
    inputs: S.map(S.list(S.either(S.int(), S.oneOf([null]))), { view: 'ticks' }),
    cases: S.list(S.map(S.str())),
    costs: S.list(S.num()),
  })
  const value = { kernel: [[1, 2], [3, 4]], flags: [0, 1, 1], bits: '0110', inputs: { go: [1, null, 0] }, cases: [{ A: 'Rain' }, { A: 'Bus' }], costs: [1, 2.5] }
  const form = formOf(LEVEL_HINTS, value, ctx)
  const kinds = Object.fromEntries(form.fields.map((f) => [f.key, f.field.kind]))
  assert.deepEqual(kinds, { kernel: 'grid', flags: 'ticks', bits: 'ticks', inputs: 'wave', cases: 'table', costs: 'numbers' })
  const field = (key) => form.fields.find((f) => f.key === key).field
  assert.deepEqual(gridValue(field('kernel'), gridRows(field('kernel'))), value.kernel)
  assert.deepEqual(tickValue(field('flags'), tickValues(field('flags'))), value.flags)
  assert.deepEqual(tickValue(field('bits'), tickValues(field('bits'))), value.bits)
  const t = tableOf(field('cases'))
  assert.deepEqual(tableValue(field('cases'), t, t.rows), value.cases)
  for (const v of Object.values(field('inputs').value).flat()) assert.deepEqual(cellValue(field('inputs').cell, cellText(v)), v)
})

test('the link picker offers first the links the other language has more of than this one', () => {
  const l = (id) => `<level-ref to="${id}"></level-ref>`
  const w = (id) => `<wiki-ref to="${id}"></wiki-ref>`
  assert.deepEqual(lacking(`${l('a')} ${w('x')} ${w('x')}`, `${w('x')}`), ['level:a', 'wiki:x'])
  assert.deepEqual(lacking(`${l('a')}`, `${l('a')} ${w('x')}`), [])
})

test('a mark on the game page is the field it shows: the task’s, else the level’s; a + adds to that list', async () => {
  const { taskLevel } = await import('../engine/tasks.js')
  const { addFor, markOf, markPath } = await import('./marks.js')
  const T = { brief: S.text(), hint: S.opt(S.list(S.text())), tests: S.list(S.obj({ n: S.int() }), { min: 1, section: 'tests' }) }
  const vocabulary = defineVocabulary({ module: 't', version: 1, kinds: {}, game: S.obj({ title: S.text() }), level: taskLevel({ title: S.text(), hint: S.opt(S.list(S.text())) }, T) })
  const t = (s) => ({ en: s })
  const level = { title: t('L'), hint: [t('shared')], tasks: [{ id: 'L', brief: t('a'), tests: [{ n: 1 }] }, { id: 'L2', step: t('two'), brief: t('b'), hint: [t('own')], tests: [{ n: 2 }] }] }
  assert.deepEqual(markPath(level, vocabulary, { at: 'brief', scope: 'task', task: 1 }), ['tasks', 1, 'brief'])
  assert.deepEqual(markPath(level, vocabulary, { at: 'title', scope: 'level', task: 1 }), ['title'])
  // A task without hints of its own shows the level's; one with its own shows those.
  assert.deepEqual(markPath(level, vocabulary, { at: 'hint[0]', scope: 'task', task: 0 }), ['hint', 0])
  assert.deepEqual(markPath(level, vocabulary, { at: 'hint[0]', scope: 'task', task: 1 }), ['tasks', 1, 'hint', 0])
  // A paragraph of a text the screen splits is the whole text; a text the content does not hold is no field.
  assert.deepEqual(markPath(level, vocabulary, { at: 'brief[1]', scope: 'task', task: 0 }), ['tasks', 0, 'brief'])
  assert.equal(markPath(level, vocabulary, { at: 'tip', scope: 'task', task: 0 }), null)
  // A + on the tests copies the last; on hints (words alone) it adds a blank one, to the list the task shows.
  const test = addFor('L', level, vocabulary, { at: 'tests', scope: 'task', task: 1 })
  assert.deepEqual([test.op, test.at], [{ op: 'level.set', level: 'L', path: ['tasks', 1, 'tests'], value: [{ n: 2 }, { n: 2 }] }, ['tasks', 1, 'tests', 1]])
  const hint = addFor('L', level, vocabulary, { at: 'hint', scope: 'task', task: 1 })
  assert.deepEqual([hint.op.path, hint.op.value.at(-1)], [['tasks', 1, 'hint'], { en: '' }])
  // A new task copies the one played, without its id and its name, and goes after it.
  const task = addFor('L', level, vocabulary, { at: 'tasks', scope: 'level', task: 0 })
  assert.deepEqual([task.op, task.at], [{ op: 'task.add', level: 'L', data: { brief: t('a'), tests: [{ n: 1 }] }, after: 'L' }, ['tasks', 1]])
  // And back: a field drawn picked on the page.
  assert.deepEqual(markOf(level, ['tasks', 1, 'tests', 0]), { at: 'tests[0]', scope: 'task', task: 1 })
  assert.deepEqual(markOf(level, ['title']), { at: 'title', scope: 'level' })
  assert.deepEqual(markOf({ brief: t('x') }, ['brief']), { at: 'brief', scope: null })
})

test('task operations stand alone in a pending changeset', () => {
  const add = { op: 'task.add', level: 'p', data: {} }
  assert.equal(pushOp([add], add).length, 2)
  const up = { op: 'task.move', task: 'a', to: { level: 'p', first: true } }
  assert.equal(pushOp([up], up).length, 2)
})

test('a task is picked from the tasks of the game, grouped by level in course order', () => {
  const levels = [{ id: 'a', tasks: [{ id: 'a' }, { id: 'a_2', step: { en: 'Again' } }] }, { id: 'b' }]
  assert.deepEqual([...taskIdsOf(levels)], ['a', 'a_2', 'b'])
  const options = taskOptionsOf([{ value: 'b', label: '1-1', title: { en: 'B' } }, { value: 'a', label: '1-2', title: { en: 'A' }, tasks: levels[0].tasks }])
  assert.deepEqual(options.map((o) => [o.value, o.label, o.group]), [['b', '1-1', '1-1 B'], ['a', '1-2 · 1', '1-2 A'], ['a_2', '1-2 · 2', '1-2 A']])
  assert.deepEqual(formOf(S.task(), 'a_2', { vocabulary: null }).kind, 'choice')
  assert.equal(formOf(S.task(), 'a_2', { vocabulary: null }).of, 'task')
})

test('the parts list groups parts by tray, in the order the course gives them; the rest go last', () => {
  const order = ['1', '2', '3']
  const at = (type) => ({ a: '3', b: '1', c: '2', d: '2' })[type] ?? null
  assert.deepEqual(partGroups(['a', 'b', 'c', 'd', 'e', 'p'], { trays: { main: { items: ['a', 'b', 'p'] }, more: { items: ['a', 'c'] }, shared: { items: ['a'] }, empty: { items: [] } }, at, order, primitives: ['p'] }), [
    { tray: 'main', types: ['p', 'b', 'a'] },
    { tray: 'more', types: ['c'] },
    { tray: 'shared', types: [] },
    { tray: 'empty', types: [] },
    { tray: null, types: ['d', 'e'] },
  ])
  assert.deepEqual(partGroups(['a', 'b', 'c'], { at, order }), [{ tray: null, types: ['b', 'c', 'a'] }])
})
