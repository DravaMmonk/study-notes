// node --test games/kit/studio — the studio's pure parts: forms from schemas (form.js), the control each value takes by
// its shape and hints, cells typed and read back, a level's sections, the check's findings on their fields, each edit as
// its operation and a pending changeset's coalescing, the course tree and its drop slots (tree.js), a changed file read
// field by field (diff.js), the game page's marks as the fields they show (marks.js); and on the real games, that every level reads as a form with no field left to raw JSON that
// the schema could say more about, the hinted values get their controls, and every cell control gives back the value
// it shows.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from '../engine/schema.js'
import { defineVocabulary } from '../engine/vocabulary.js'
import { putIn, takeOut } from '../engine/ops/place.js'
import { domainOf, readContent } from '../engine/content-node.js'
import {
  blank, boardsOf, cellText, cellValue, formOf, gridRows, gridValue, holdsLevels, moved, opFor, pastedCells, placeFindings, placesOf, pushOp, recast,
  referenceFor, revertOf, sectionOf, sectionsOf, shapeName, shapeOf, summaryOf, tableOf, tableValue, textsOf, tickValue, tickValues, toggled,
} from './form.js'
import { lintText } from '../pipeline/lint.js'
import { courseTree, stays } from './tree.js'
import { fieldDiff } from './diff.js'
import { lacking } from '../engine/text.js'

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
  assert.deepEqual(form.tags[0].options.map((o) => o.value), ['board', 'hand'])
  assert.equal(form.tags[0].value, 'board')
  const field = (key) => form.fields.find((f) => f.key === key)
  assert.equal(field('title').field.kind, 'text')
  assert.equal(field('title').about, 'what the map shows')
  assert.equal(field('hint').field, null, 'an optional field not there has no field, only its schema to add it')
  assert.equal(field('hint').optional, true)
  const adds = field('adds').field
  assert.equal(adds.kind, 'chips', 'a list of choices is chips')
  assert.deepEqual(adds.options, [{ value: 'add', about: { zh: '加', en: 'adds' } }, { value: 'sub', about: 'subtracts' }])
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

test('blank values fit their schemas, and a shape recast keeps the fields both shapes share', () => {
  const value = blank(VOCAB.level, ctx)
  assert.equal(value.kind, 'board')
  assert.deepEqual(value.gen, { rows: { n: 1 } })
  assert.deepEqual(blank(S.call('gen'), ctx), { rows: { n: 1 } })
  assert.equal(blank(S.level(), ctx), 'a')
  const tag = formOf(VOCAB.level, LEVEL, ctx).tags[0]
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

test('a changed file reads field by field: texts and boards whole, objects and lists looked into', () => {
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

test('a list that grew or shrank shows only the items added or removed, and items changed in place looked into', () => {
  // A save step appended: only it, at its own index.
  const saves = [{ version: 1, ops: [{ rename: { a: 'b' } }] }, { version: 2, why: 'w', ops: [{ solve: ['x', ['y']] }] }]
  const step = { version: 3, ops: [{ data: { drop: ['z'] } }] }
  assert.deepEqual(fieldDiff({ saves }, { saves: [...saves, step] }), [{ path: ['saves', 2], before: undefined, after: step, as: 'value' }])
  // An item removed from the middle; another inserted where one changed.
  assert.deepEqual(fieldDiff([{ n: 1 }, { n: 2 }, { n: 3 }], [{ n: 1 }, { n: 3 }]), [{ path: [1], before: { n: 2 }, after: undefined, as: 'value' }])
  assert.deepEqual(fieldDiff([{ n: 1 }, { n: 2 }, { n: 9 }], [{ n: 1 }, { n: 5 }, { n: 6 }, { n: 9 }]), [
    { path: [1, 'n'], before: 2, after: 5, as: 'value' },
    { path: [2], before: undefined, after: { n: 6 }, as: 'value' },
  ])
})

test('every level of the prototypes reads as a form: each text a text pair, each board a board, where the schema has it', async () => {
  for (const game of ['factory', 'bus', 'qed-lab', 'qed', 'syntax-graph', 'state-graph', 'vision-complete', 'network']) {
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
  // A level's tests are cards that can be run.
  assert.equal(kind(S.list(S.obj({ bus: S.obj({ idle: S.int() }) }), { section: 'tests' }), []).tests, true)
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
  assert.equal(summaryOf({ t: { zh: '一<b>句</b><part-ref to="add"></part-ref>', en: 'x' } }), '一句add')
  assert.equal(summaryOf({ R: 3, costs: [[1, 2], [3]] }), 'R 3 · costs [1 2] · costs [3]')
  assert.equal(summaryOf({ go: [1, null, 0] }), 'go [1 — 0]')
})

test('a level falls into sections: what the player reads, the puzzle, tests, answers, the course', () => {
  assert.equal(sectionOf(S.text()), 'read')
  assert.equal(sectionOf(S.list(S.obj({ t: S.text(), fig: S.opt(S.call('gen')) }))), 'read', 'words and their figures')
  assert.equal(sectionOf(S.list(S.obj({ name: S.str(), label: S.text() }))), 'puzzle', 'ports: names with labels')
  assert.equal(sectionOf(S.board()), 'answers')
  assert.equal(sectionOf(S.opt(S.level())), 'course')
  assert.equal(sectionOf(S.list(S.ref('part'), { section: 'course' })), 'course', 'the hint wins')
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
  const level = { id: 'x', ...LEVEL, tasks: [{ solution: ['a'], tests: [] }] }
  const vocab = { ...VOCAB, level: S.obj({ ...VOCAB.level.cases.board.fields, tasks: S.list(S.obj({ solution: S.board(), tests: S.list(S.any()) })) }) }
  assert.deepEqual(referenceFor(vocab, level, ['tasks', 0, 'tests']), ['tasks', 0, 'solution'], 'a task’s tests run its own reference')
  assert.deepEqual(referenceFor(vocab, level, ['tests']), ['solution'], 'the level’s tests its own')
  assert.deepEqual(lintText('brief', { zh: '因为要搞定它', en: 'x' }).map((f) => f.rule), ['copy-banned', 'copy-brief-why'])
  assert.deepEqual(lintText('after', { zh: '<part-ref to="a"></part-ref>', en: '<part-ref to="a"></part-ref>' }).map((f) => f.rule), ['copy-after-part'])
  assert.deepEqual(lintText('title', { zh: '好', en: 'ok' }), [])
})

/** Every field of a form, depth first. */
function* fieldsIn(f) {
  yield f
  for (const x of f.items ?? []) yield* fieldsIn(x)
  for (const e of f.entries ?? []) yield* fieldsIn(e.field)
  for (const x of f.fields ?? []) if (x.field) yield* fieldsIn(x.field)
  if (f.params) yield* fieldsIn(f.params)
}

test('on the real games: the hinted values get their controls, and each cell control gives back the value it shows', async () => {
  const want = {
    bus: [['1-6', 'tests.0.inputs', 'wave']],
    network: [['1-12', 'tasks.0.tests.0.inputs', 'wave'], ['1-12', 'tasks.0.tests.3.expect', 'wave'], ['1-1', 'tasks.0.tests.0.wires.left.send.0.bits', 'ticks']],
    'state-graph': [['cheapest', 'tests.0.costs', 'grid'], ['carve', 'img', 'grid']],
    'vision-complete': [['1-1', 'setup.target.correlate.kernel', 'grid'], ['10-3', 'tests.0.flags', 'ticks']],
    qed: [['and', 'tasks.0.cases', 'table'], ['and', 'tasks.0.tests.0.premises', 'table']],
  }
  const counts = {}
  for (const game of ['factory', 'bus', 'qed-lab', 'qed', 'syntax-graph', 'state-graph', 'vision-complete', 'network']) {
    const content = readContent(game)
    const { vocabulary } = await domainOf(content)
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
      for (const [at, path, kind] of want[game] ?? []) if (at === id) assert.equal(kinds.get(path), kind, `${game} ${id} ${path}`)
    }
  }
  for (const k of ['grid', 'ticks', 'wave', 'table', 'numbers', 'chips', 'text', 'board', 'choice', 'call', 'list']) assert.ok(counts[k] > 0, `some field is ${k}`)
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
  const vocabulary = defineVocabulary({ domain: 't', version: 1, kinds: {}, game: S.obj({ title: S.text() }), level: taskLevel({ title: S.text(), hint: S.opt(S.list(S.text())) }, T) })
  const t = (s) => ({ zh: s, en: s })
  const level = { title: t('L'), hint: [t('shared')], tasks: [{ brief: t('a'), tests: [{ n: 1 }] }, { step: t('two'), brief: t('b'), hint: [t('own')], tests: [{ n: 2 }] }] }
  assert.deepEqual(markPath(level, vocabulary, { at: 'brief', scope: 'task', task: 1 }), ['tasks', 1, 'brief'])
  assert.deepEqual(markPath(level, vocabulary, { at: 'title', scope: 'level', task: 1 }), ['title'])
  // A task without hints of its own shows the level's; one with its own shows those.
  assert.deepEqual(markPath(level, vocabulary, { at: 'hint[0]', scope: 'task', task: 0 }), ['hint', 0])
  assert.deepEqual(markPath(level, vocabulary, { at: 'hint[0]', scope: 'task', task: 1 }), ['tasks', 1, 'hint', 0])
  // A paragraph of a text the screen splits is the whole text; a text the content does not hold is no field.
  assert.deepEqual(markPath(level, vocabulary, { at: 'brief[1]', scope: 'task', task: 0 }), ['tasks', 0, 'brief'])
  assert.equal(markPath(level, vocabulary, { at: 'tip', scope: 'task', task: 0 }), null)
  // A + on the tests copies the last; on hints (words alone) it adds a blank one, to the list the task shows.
  const test = addFor(level, vocabulary, { at: 'tests', scope: 'task', task: 1 })
  assert.deepEqual([test.path, test.set, test.at], [['tasks', 1, 'tests'], [{ n: 2 }, { n: 2 }], ['tasks', 1, 'tests', 1]])
  const hint = addFor(level, vocabulary, { at: 'hint', scope: 'task', task: 1 })
  assert.deepEqual([hint.path, hint.set.at(-1)], [['tasks', 1, 'hint'], { zh: '', en: '' }])
  // A new task copies the one played, without its name.
  const task = addFor(level, vocabulary, { at: 'tasks', scope: 'level', task: 1 })
  assert.deepEqual([task.path, task.set.length, task.set[2], task.at], [['tasks'], 3, { brief: t('b'), hint: [t('own')], tests: [{ n: 2 }] }, ['tasks', 2]])
  // And back: a field drawn picked on the page.
  assert.deepEqual(markOf(level, ['tasks', 1, 'tests', 0]), { at: 'tests[0]', scope: 'task', task: 1 })
  assert.deepEqual(markOf(level, ['title']), { at: 'title', scope: 'level' })
  assert.deepEqual(markOf({ brief: t('x') }, ['brief']), { at: 'brief', scope: null })
})
