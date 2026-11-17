import { circuitFixtureSchema } from './ops/fixture.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assembleCircuitFixture as assembleContent } from './ops/fixture.js'
import { S, validate } from './schema.js'
import { checkContent, defineVocabulary } from './vocabulary.js'
import { COURSE_FIELDS, COURSE_OPTIONS } from './course-schema.js'
import { referenceResolver, expandReferences, relationOrder, importLevelOrder } from './objects.js'

const assemble = options => assembleContent({ ...options, schemas: circuitFixtureSchema(options.schemas) })

const vocabulary = defineVocabulary({ module: 'toy', version: 1, kinds: {},
  game: S.obj({ title: S.text(), chapters: S.list(S.str({ reference: 'chapter' })), primitives: S.opt(S.list(S.ref('part', { reference: 'circuit/part' }))), ...COURSE_OPTIONS }),
  level: S.obj({ title: S.text(), adds: S.opt(S.list(S.ref('part', { reference: 'circuit/part' }))) }),
})
const source = () => ({ id: 'toy', schemas: vocabulary,
  game: { vocabulary: 1, title: 'Toy', chapters: [{ id: 'main', levels: ['toy/start', 'toy/a', 'toy/b', 'toy/c', 'toy/end'], rows: [['toy/a'], ['toy/b', 'toy/c']] }], optional: ['#toy/extras'] },
  levels: ['start', 'a', 'b', 'c', 'end'].map((id) => [id, { title: id }]),
  glossary: { groups: [], entries: [] },
  tags: [['core', { kind: 'level', title: 'Core', values: ['a', '#extras', 'b'] }], ['extras', { kind: 'level', values: ['c'] }]],
  relations: [['path', { kind: 'requires', edges: [{ from: 'a', to: 'b' }, { from: 'start', to: '#core' }, { from: '#core', to: 'end' }] }]],
})

test('tags, relation boundaries and chapter rows assemble the route; all relations take effect', () => {
  const content = assemble(source())
  assert.deepEqual(checkContent({ vocabulary }, content), [])
  assert.deepEqual(content.eras[0].levels.map((l) => l.id), ['toy/start', 'toy/a', 'toy/b', 'toy/c', 'toy/end'])
  assert.deepEqual(content.relationEdges.requires.map(({ from, to }) => [from, to]), [
    ['toy/a', 'toy/b'], ['toy/start', 'toy/a'], ['toy/start', 'toy/c'], ['toy/b', 'toy/end'],
  ])
  assert.deepEqual(content.eras[0].rows, [['toy/a'], ['toy/b', 'toy/c']])
  assert.equal(content.eras[0].levels.find((l) => l.id === 'toy/c').optional, true)
  assert.deepEqual(relationOrder(['p/c', 'p/b', 'p/a'], [{ from: 'p/c', to: 'p/a' }]), ['p/b', 'p/c', 'p/a'])
})

test('the generic resolver expands every typed list, checks kind and cycles, and deduplicates nested tags', () => {
  const problems = []
  const registry = { tag: {
    all: { kind: 'level', values: ['a', '#nested', 'b'] }, nested: { kind: 'level', values: ['b'] },
    parts: { kind: 'circuit/part', values: ['p'] }, words: { kind: 'entry', values: ['e'] },
    loop: { kind: 'level', values: ['#loop'] }, wrong: { kind: 'level', values: ['p'] }, mixed: { kind: 'level', values: ['#parts'] },
  }, level: { a: {}, b: {} }, part: { p: {} }, setting: {}, entry: { e: {} } }
  const expand = referenceResolver(registry, problems)
  const schema = S.obj({ levels: S.list(S.level()), optional: S.list(S.level()), arbitrary: S.obj({ entries: S.list(S.name('entry')), items: S.list(S.ref('part', { reference: 'circuit/part' })) }) })
  assert.deepEqual(expandReferences({ levels: ['#all'], optional: ['#nested'], arbitrary: { entries: ['#words'], items: ['#parts'] } }, schema, expand), {
    levels: ['a', 'b'], optional: ['b'], arbitrary: { entries: ['e'], items: ['p'] },
  })
  expand('#loop', 'level'); expand('#mixed', 'level'); expand('#wrong', 'level')
  assert.ok(problems.some((p) => /circular tags/.test(p.says)))
  assert.ok(problems.every(p => !/unknown|missing target/.test(p.says)))
})

test('checks reject separate relation cycles, duplicate chapter membership, invalid layout rows and inverted prerequisites', () => {
  const wrong = source()
  wrong.relations.push(['loop', { kind: 'requires', edges: [{ from: 'b', to: 'a' }] }])
  wrong.game.chapters.push({ id: 'two', levels: ['toy/a'] })
  wrong.game.chapters[0].rows = [['toy/b', 'toy/a', 'toy/c', null]]
  const problems = checkContent({ vocabulary }, assemble(wrong)).map((p) => p.says)
  for (const pattern of [/circular requires/, /placed twice/, /no lower/, /at most|max|more than/]) assert.ok(problems.some((s) => pattern.test(s)), String(pattern) + problems.join('\n'))
})

test('partial courses restrict both ends of loaded level relations', () => {
  const input = source()
  input.game.chapters = [{ id: 'partial', levels: ['toy/a', 'toy/b'] }]
  input.game.optional = []
  const content = assemble(input)
  assert.deepEqual(content.relationEdges.requires, [{ from: 'toy/a', to: 'toy/b' }])
  assert.deepEqual(checkContent({ vocabulary }, content), [])
})

test('reference maps and item containers use the same typed resolver and loaded ordering', () => {
  const registry = { tag: { items: { kind: 'circuit/part', values: ['p/b', 'p/a'] }, levels: { kind: 'level', values: ['p/one'] } }, level: { 'p/one': {} }, part: { 'p/a': {}, 'p/b': {} }, setting: {}, entry: {} }
  const problems = [], expand = referenceResolver(registry, problems, circuitFixtureSchema({}))
  expand.order = [{ from: 'p/b', to: 'p/a', of: 'circuit/part' }]
  const schema = S.obj({ list: S.list(S.ref('part', { reference: 'circuit/part' })), keyed: S.map(S.str(), { key: S.ref('part', { reference: 'circuit/part' }) }), tray: S.name('tag', { members: 'circuit/part' }) })
  assert.deepEqual(expandReferences({ list: ['#items'], keyed: { '#items': 'same' }, tray: '#items' }, schema, expand), {
    list: ['p/a', 'p/b'], keyed: { 'p/a': 'same', 'p/b': 'same' }, tray: '#items',
  })
  expandReferences({ tray: '#levels' }, schema, expand)
  assert.deepEqual(problems, [])
})

test('cross-game prerequisites keep their source game and need no local source declaration', () => {
  const input = source()
  input.relations.push(['external', { kind: 'requires', edges: [{ from: 'elsewhere/source', game: 'other', to: 'a', required: true }] }])
  const content = assemble(input)
  assert.ok(content.eras[0].links.some((e) => e.from === 'elsewhere/source' && e.fromGame === 'other' && e.required))
  assert.ok(!content.objectProblems.some((p) => /elsewhere\/source/.test(p.says)))
})

test('schema-aware catalogs resolve text while preserving package object references', async () => {
  const { catalogReader } = await import('./catalogs.js')
  const { catalogsOf } = await import('./content-text.js')
  const reader = catalogReader({ en: { 'toy/name': 'Translated title' } })
  const result = reader({ title: '@toy/name', section: 'toy/name' }, 'section.json', S.obj({ title: S.text(), section: S.name('section') }))
  assert.equal(result.title.en, 'Translated title')
  assert.equal(result.section, 'toy/name')
  assert.deepEqual(catalogsOf('course', result), { en: { 'toy/name': 'Translated title' } })
})



test('cycles between tag endpoints cannot vanish during boundary expansion', () => {
  const input = source()
  input.tags.push(['left', { kind: 'level', values: ['a'] }], ['right', { kind: 'level', values: ['b'] }])
  input.relations = [['loop', { kind: 'requires', edges: [{ from: '#left', to: '#right' }, { from: '#right', to: '#left' }] }]]
  assert.ok(assemble(input).objectProblems.some((p) => /circular requires/.test(p.says)))
})

test('game namespaces cannot declare tags, relations or sections', () => {
  const input = source()
  input.tags.push(['illegal', { kind: 'level', values: [] }, '@toy'])
  assert.ok(checkContent({ vocabulary }, assemble(input)).some((p) => /may only be declared by package/.test(p.says)))
})

test('explicit trays produce ordered menus, expand task items and apply replacements on load', () => {
  const input = source()
  input.schemas = { ...vocabulary, level: S.obj({ title: S.text(), tray: S.name('circuit/tray'), adds: S.list(S.ref('part', { reference: 'circuit/part' })), tasks: S.list(S.obj({ gives: S.list(S.str({ reference: 'circuit/part' })) })) }) }
  input.partDefs = { parts: { one: {}, two: {}, three: {} } }
  input.tags.push(['menu', { kind: 'circuit/part', title: 'Menu', values: ['one', 'two'] }], ['tray', { kind: 'circuit/part', title: 'Tray', values: ['three', '#menu'] }])
  input.trays = [['tray', { title: 'Tray', values: ['three'], menus: [{ id: 'menu', title: 'Menu', values: ['two', 'one'] }] }]]
  input.relations.push( ['upgrade', { kind: 'replaces', edges: [{ from: 'three', to: 'one' }] }])
  input.levels[0][1] = { title: 'Start', tray: 'tray', adds: ['#menu'], tasks: [{ gives: ['#tray'] }] }
  const content = assemble(input)
  const start = content.levels.find(({ id }) => id === 'toy/start')
  assert.equal(start.tray, 'toy/tray')
  assert.deepEqual(start.adds, ['toy/one', 'toy/two'])
  assert.deepEqual(start.tasks[0].gives, ['toy/one', 'toy/three', 'toy/two'])
  assert.deepEqual(content.trays['toy/tray'].items, [{ id: 'toy/menu', title: 'Menu', items: ['toy/two', 'toy/one'] }, 'toy/three'])
  assert.deepEqual(content.replaces, { 'toy/three': ['toy/one'] })
})

test('chapter rows retain authored empty positions', () => {
  const input = source()
  input.game.chapters[0].levels = ['toy/a', 'toy/b']
  input.game.chapters[0].rows = [['toy/a'], ['toy/b', null]]
  input.game.optional = []
  const content = assemble(input)
  assert.deepEqual(content.eras[0].rows, [['toy/a'], ['toy/b', null]])
  assert.deepEqual(checkContent({ vocabulary }, content), [])
})



test('item tags distinguish setting definitions from a part setting and its values', () => {
  const input = source()
  input.partDefs = { parts: { knob: { settings: { 'mode': { control: 'select', options: [{ value: 'on' }] } }, stages: [{ id: 'knob-on' }] } } }
  input.tags.push(['settings', { kind: 'circuit/part', values: ['mode'] }], ['knob', { kind: 'circuit/part', values: ['knob', 'knob-on'] }])
  const content = assemble(input)
  assert.ok(content.objectProblems.some((p) => /missing target circuit\/part toy\/mode/.test(p.says)))
  assert.ok(!content.objectProblems.some((p) => /missing target part toy\/knob/.test(p.says)))
})

test('settings have neither a registry nor a tag kind', () => {
  const input = source()
  input.tags.push(['obsolete', { kind: 'setting', values: [] }])
  const content = assemble(input)
  assert.equal(Object.hasOwn(content.registries, 'setting'), false)
  assert.ok(checkContent({ vocabulary }, content).some((problem) => problem.rule === 'exists' && problem.kind === 'kind' && problem.target === 'setting'))
})


test('tags reject teaching metadata and never implicitly declare trays', () => {
  const input = source()
  input.tags.push(['idea', { kind: 'circuit/part', concept: true, values: [] }])
  const content = assemble(input)
  assert.deepEqual(content.trays, {})
  assert.ok(checkContent({ vocabulary }, content).some(problem => /concept/.test(problem.at)))
})





test('chapters retain authored order independently of display relations and reject tags or reversed prerequisites', () => {
  const input = source()
  input.game.chapters[0].levels = ['toy/start', 'toy/a', 'toy/c', 'toy/b', 'toy/end']
  assert.deepEqual(assemble(input).eras[0].levels.map(level => level.id), input.game.chapters[0].levels)
  input.game.chapters[0].levels = ['toy/b', 'toy/a']
  assert.ok(assemble(input).objectProblems.some(problem => /must precede/.test(problem.says)))
  input.game.chapters[0].levels = ['#toy/core']
  assert.ok(assemble(input).objectProblems.some(problem => /without tags/.test(problem.says)))
})

test('imports include unscheduled prerequisite closures, using dependency order before package display order', () => {
  const input = source()
  input.game.chapters = []
  const content = assemble(input)
  assert.deepEqual(content.relationEdges.requires, [])
  assert.deepEqual(importLevelOrder(content, 'toy/end'), ['toy/start', 'toy/a', 'toy/b', 'toy/c', 'toy/end'])
  assert.deepEqual(importLevelOrder(content, '#toy/core'), ['toy/start', 'toy/a', 'toy/b', 'toy/c'])
  assert.deepEqual(importLevelOrder(content, 'toy/b'), ['toy/start', 'toy/a', 'toy/b'])
})



test('same-named typed tags resolve in context and ambiguous unconstrained references fail', () => {
  const problems = []
  const registries = { level: { 'p/a': {}, 'p/b': {} }, entry: { 'p/word': {} }, tag: {
    'level:p/all': { kind: 'level', values: ['#p/nested'] },
    'level:p/nested': { kind: 'level', values: ['p/a'] },
    'entry:p/all': { kind: 'entry', values: ['p/word'] },
    'entry:p/nested': { kind: 'entry', values: ['#p/nested'] },
  } }
  const expand = referenceResolver(registries, problems, circuitFixtureSchema({}))
  assert.deepEqual(expand('#p/all', 'level'), ['p/a'])
  assert.deepEqual(expand('#p/all', 'entry'), ['p/word'])
  assert.deepEqual(problems, [])
  assert.deepEqual(expand('#p/all', 'any'), [])
  assert.match(problems.at(-1).says, /ambiguous tag/)
  expand('#p/nested', 'entry')
  assert.match(problems.at(-1).says, /circular tags/)

})


test('schema tag names validate against the expected member type and reject untyped ambiguity', () => {
  const names = { tag: new Set(['level:p/all', 'entry:p/all']) }
  assert.deepEqual(validate(S.name('tag', { members: 'level' }), 'p/all', { names }), [])
  assert.deepEqual(validate(S.name('tag', { members: 'entry' }), '#p/all', { names }), [])
  assert.match(validate(S.name('tag'), 'p/all', { names })[0].says, /ambiguous tag/)
  assert.match(validate(S.name('tag', { members: 'circuit/part' }), 'p/all', { names })[0].says, /member type circuit\/part/)
})
