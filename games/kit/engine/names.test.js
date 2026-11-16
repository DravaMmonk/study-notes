import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assemble } from './content.js'
import { COURSE_FIELDS } from './course-schema.js'
import { OPEN } from './vocabulary.js'
import { S, validate } from './schema.js'
import { createRegistries, expandNames, fullName } from './names.js'
import { isTextKey } from './i18n.js'
import { NAME } from './parts/schema.js'
import { mapBlueprintNames, parse } from '../circuit/text.js'

const schemas = {
  kinds: { part: { given: {} } },
  game: S.obj({ title: S.text(), chapters: S.list(S.obj({ id: S.str(), ...COURSE_FIELDS })), primitives: S.list(S.ref('part')) }),
  level: S.obj({ title: S.text(), tasks: S.list(S.obj({ id: S.str(), piece: S.ref('part'), carry: S.level(), solution: S.board() })) }),
}
const t = (key, en) => ({ $key: key, en })

test('file assembly qualifies each layer and keeps the registries independent', () => {
  const source = {
    id: 'demo', packageId: 'library', schemas,
    game: { title: t('heading', 'Demo'), primitives: ['library/calc'], chapters: [{ id: 'chapter', levels: ['library/calc'] }] },
    levels: [['calc', { title: t('heading', 'Calculate'), tasks: [{ id: 'work', piece: 'calc', carry: 'other/start', solution: ['n = calc()', 'out <- n'] }] }]],
    partDefs: { parts: { calc: { inputs: [{ name: 'a' }], settings: { 'value': { control: 'number', default: 1 } }, op: 'circuit:constant' } } },
    glossary: { groups: [], entries: [{ id: 'calc', at: 'calc', title: 'Calculate', body: [], see: ['other/entry'] }] },
    tags: [['calc', { kind: 'level', title: 'Group', values: ['calc'] }], ['entries-calc', { kind: 'entry', title: 'Numbers', values: ['calc'] }]],
  }
  const before = structuredClone(source)
  const content = assemble(source)
  assert.equal(content.title.$key, '@demo/heading')
  assert.equal(content.levels[0].title.$key, 'library/heading')
  assert.equal(content.levels[0].id, 'library/calc')
  assert.equal(content.levels[0].tasks[0].id, 'library/work')
  assert.equal(content.levels[0].tasks[0].piece, 'library/calc')
  assert.equal(content.levels[0].tasks[0].carry, 'other/start')
  assert.deepEqual(content.levels[0].tasks[0].solution, ['n = library/calc()', 'out <- n'])
  assert.deepEqual(Object.keys(content.partDefs.parts['library/calc'].settings), ['value'])
  assert.equal(content.partDefs.parts['library/calc'].inputs[0].name, 'a')
  assert.equal(content.glossary.entries[0].at, 'library/calc')
  assert.equal(content.glossary.entries[0].group, 'library/entries-calc')
  assert.deepEqual(content.glossary.entries[0].see, ['other/entry'])
  for (const kind of ['level', 'piece', 'entry']) assert.ok(content.registries[kind]['library/calc'])
  assert.ok(content.registries.tag['library/calc'])
  for (const kind of ['relation', 'layout']) assert.deepEqual(Object.keys(content.registries[kind]), [])
  assert.deepEqual(source, before)
  assert.throws(() => assemble({ ...source, partDefs: { parts: { calc: {}, 'library/calc': {} } } }), /duplicate piece library\/calc/)
  assert.throws(() => createRegistries({ level: [['lib/a', {}], ['lib/a', {}]] }), /duplicate level/)
})

test('typed references preserve cross-namespace and game-owned objects', () => {
  const schema = S.obj({ levels: S.list(S.level()), parts: S.map(S.ref('part'), { key: S.ref('part') }), entry: S.name('entry'), title: S.text(), world: S.ref('world') })
  const value = expandNames({
    levels: ['start', 'other/start', '@demo/start'], parts: { calc: '@demo/pin', 'other/calc': 'given' }, entry: 'term',
    title: t('other/heading', '<level-ref to="start"></level-ref> <part-ref to="part:calc"></part-ref>'), world: 'grid',
  }, 'library', { schema, vocabulary: schemas, pieces: new Set(['calc']) })
  assert.deepEqual(value.levels, ['library/start', 'other/start', '@demo/start'])
  assert.deepEqual(value.parts, { 'library/calc': '@demo/pin', 'other/calc': 'given' })
  assert.equal(value.entry, 'library/term')
  assert.equal(value.title.$key, 'other/heading')
  assert.equal(value.title.en, '<level-ref to="library/start"></level-ref> <part-ref to="part:library/calc"></part-ref>')
  assert.equal(value.world, 'grid')
  assert.equal(fullName('@demo', 'pin'), '@demo/pin')
  assert.equal(fullName('library', '@demo/pin'), '@demo/pin')
})

test('blueprint tokens accept full names and rewriting preserves quoted formulas and comments', () => {
  const lines = ['# n = calc()', '"n:one" = "calc"[A="s(a) = s(b)",use=["lemma.elim"]]()', 'm = @demo/pin("n:one")']
  const rewritten = mapBlueprintNames(lines, (type) => fullName('library', type), (rule) => fullName('library', rule))
  assert.deepEqual(rewritten, ['# n = calc()', '"n:one" = library/calc[A="s(a) = s(b)",use=["library/lemma.elim"]]()', 'm = @demo/pin("n:one")'])
  const parsed = parse(rewritten.join('\n'))
  assert.deepEqual(parsed.statements.map(({ type }) => type), ['library/calc', '@demo/pin'])
  assert.equal(parsed.statements[0].settings.A, 's(a) = s(b)')
  for (const name of ['library/calc', '@demo/pin']) {
    assert.deepEqual(validate(NAME, name), [])
    assert.equal(isTextKey(`${name}.title`), true)
  }
  assert.equal(isTextKey('library//title'), false)
})

test('item references and audit identities retain the game namespace', () => {
  const expanded = expandNames({ opens: ['calc.how=minus'], withholds: ['calc'], gives: ['@demo/pin.value'] }, 'library', { pieces: new Set(['calc']) })
  assert.deepEqual(expanded, { opens: ['library/calc.how=minus'], withholds: ['library/calc'], gives: ['@demo/pin.value'] })
  assert.deepEqual(validate(OPEN, { audit: ['@demo/pin@@demo/start'] }), [])
})

test('bench stage controls remain local when a task has item availability fields', () => {
  const schema = S.obj({ tasks: S.list(S.obj({ id: S.str(), opens: S.list(S.str()), bench: S.obj({ stages: S.list(S.obj({ opens: S.list(S.str()) })) }) })) })
  const content = expandNames({ tasks: [{ id: 'work', opens: ['calc.how=minus'], bench: { stages: [{ opens: ['calc'] }] } }] }, 'library', { schema, pieces: new Set(['calc']) })
  assert.deepEqual(content.tasks[0].opens, ['library/calc.how=minus'])
  assert.deepEqual(content.tasks[0].bench.stages[0].opens, ['calc'])
})
