import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assemble } from './content.js'
import { S } from './schema.js'
import { checkContent, defineVocabulary } from './vocabulary.js'
import { COURSE_FIELDS, COURSE_OPTIONS } from './course-schema.js'
import { referenceResolver, expandReferences, relationOrder } from './objects.js'

const vocabulary = defineVocabulary({ module: 'toy', version: 1, kinds: {},
  game: S.obj({ title: S.text(), chapters: S.list(S.obj({ id: S.str(), ...COURSE_FIELDS })), primitives: S.opt(S.list(S.ref('part'))), ...COURSE_OPTIONS }),
  level: S.obj({ title: S.text(), adds: S.opt(S.list(S.ref('part'))) }),
})
const source = () => ({ id: 'toy', schemas: vocabulary,
  game: { vocabulary: 1, title: 'Toy', chapters: [{ id: 'main', levels: ['toy/start', '#toy/core', 'toy/end'], layout: 'toy/map' }], optional: ['#toy/extras'] },
  levels: ['start', 'a', 'b', 'c', 'end'].map((id) => [id, { title: id }]),
  glossary: { groups: [], entries: [] },
  tags: [['core', { kind: 'level', title: 'Core', values: ['a', '#extras', 'b'] }], ['extras', { kind: 'level', values: ['c'] }]],
  relations: [['path', { kind: 'requires', edges: [{ from: 'a', to: 'b' }, { from: 'start', to: '#core' }, { from: '#core', to: 'end' }] }], ['sequence', { kind: 'order', sequence: ['start', 'a', 'b', 'c', 'end'] }]],
  layouts: [['map', { of: '#core', rows: [['a'], ['b', 'c']] }]],
})

test('tags, relation boundaries and selected layouts assemble the route; all relations take effect', () => {
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
    pieces: { kind: 'item', values: ['p'] }, words: { kind: 'entry', values: ['e'] },
    loop: { kind: 'level', values: ['#loop'] }, wrong: { kind: 'level', values: ['p'] }, mixed: { kind: 'level', values: ['#pieces'] },
  }, level: { a: {}, b: {} }, piece: { p: {} }, setting: {}, entry: { e: {} } }
  const expand = referenceResolver(registry, problems)
  const schema = S.obj({ levels: S.list(S.level()), optional: S.list(S.level()), arbitrary: S.obj({ entries: S.list(S.name('entry')), items: S.list(S.ref('part')) }) })
  assert.deepEqual(expandReferences({ levels: ['#all'], optional: ['#nested'], arbitrary: { entries: ['#words'], items: ['#pieces'] } }, schema, expand), {
    levels: ['a', 'b'], optional: ['b'], arbitrary: { entries: ['e'], items: ['p'] },
  })
  expand('#loop', 'level'); expand('#mixed', 'level'); expand('#wrong', 'level')
  assert.ok(problems.some((p) => /circular tags/.test(p.says)))
  assert.ok(problems.some((p) => /expected level/.test(p.says)))
  assert.ok(problems.some((p) => /unknown level p/.test(p.says)))
})

test('checks reject separate relation cycles, duplicate chapter membership, invalid layout rows and inverted prerequisites', () => {
  const wrong = source()
  wrong.relations.push(['loop', { kind: 'requires', edges: [{ from: 'b', to: 'a' }] }], ['order-loop', { kind: 'order', edges: [{ from: 'end', to: 'start' }] }])
  wrong.game.chapters.push({ id: 'two', levels: ['toy/a'] })
  wrong.layouts[0][1].rows = [['b', 'a', 'c', null]]
  const problems = checkContent({ vocabulary }, assemble(wrong)).map((p) => p.says)
  for (const pattern of [/circular requires/, /circular order/, /placed twice/, /no lower/, /at most|max|more than/]) assert.ok(problems.some((s) => pattern.test(s)), String(pattern) + problems.join('\n'))
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
  const registry = { tag: { items: { kind: 'item', values: ['p/b', 'p/a'] }, levels: { kind: 'level', values: ['p/one'] } }, level: { 'p/one': {} }, piece: { 'p/a': {}, 'p/b': {} }, setting: {}, entry: {} }
  const problems = [], expand = referenceResolver(registry, problems)
  expand.order = [{ from: 'p/b', to: 'p/a', of: 'item' }]
  const schema = S.obj({ list: S.list(S.ref('part')), keyed: S.map(S.str(), { key: S.ref('part') }), tray: S.name('tag', { members: 'item' }) })
  assert.deepEqual(expandReferences({ list: ['#items'], keyed: { '#items': 'same' }, tray: '#items' }, schema, expand), {
    list: ['p/b', 'p/a'], keyed: { 'p/a': 'same', 'p/b': 'same' }, tray: '#items',
  })
  expandReferences({ tray: '#levels' }, schema, expand)
  assert.ok(problems.some((p) => /expected item/.test(p.says)))
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
  const result = reader({ title: '@toy/name', layout: 'toy/name' }, 'course.json', S.obj({ title: S.text(), layout: S.name('layout') }))
  assert.equal(result.title.en, 'Translated title')
  assert.equal(result.layout, 'toy/name')
  assert.deepEqual(catalogsOf('course', result), { en: { 'toy/name': 'Translated title' } })
})


test('untyped order endpoints infer level scope and honor partial courses', () => {
  const input = source()
  input.game.chapters = [{ id: 'partial', levels: ['toy/b', 'toy/a'] }]
  input.game.optional = []
  input.relations = [['sequence', { kind: 'order', sequence: ['start', 'b', 'a', 'end'] }]]
  const content = assemble(input)
  assert.deepEqual(content.relationEdges.order, [{ from: 'toy/b', to: 'toy/a', of: 'level' }])
  assert.deepEqual(content.eras[0].levels.map(({ id }) => id), ['toy/b', 'toy/a'])
})

test('cycles between tag endpoints cannot vanish during boundary expansion', () => {
  const input = source()
  input.tags.push(['left', { kind: 'level', values: ['a'] }], ['right', { kind: 'level', values: ['b'] }])
  input.relations = [['loop', { kind: 'requires', edges: [{ from: '#left', to: '#right' }, { from: '#right', to: '#left' }] }]]
  assert.ok(assemble(input).objectProblems.some((p) => /circular requires/.test(p.says)))
})

test('game namespaces cannot declare tags, relations or layouts', () => {
  const input = source()
  input.tags.push(['illegal', { kind: 'level', values: [] }, '@toy'])
  assert.ok(checkContent({ vocabulary }, assemble(input)).some((p) => /games cannot declare objects/.test(p.says)))
})

test('nested item tags produce ordered menus, expand task items and apply replacements on load', () => {
  const input = source()
  input.schemas = { ...vocabulary, level: S.obj({ title: S.text(), tray: S.name('tag', { members: 'item' }), adds: S.list(S.ref('part')), tasks: S.list(S.obj({ gives: S.list(S.str({ reference: 'item' })) })) }) }
  input.partDefs = { parts: { one: {}, two: {}, three: {} } }
  input.tags.push(['menu', { kind: 'item', title: 'Menu', values: ['one', 'two'] }], ['tray', { kind: 'item', title: 'Tray', values: ['three', '#menu'] }])
  input.relations.push(['items', { kind: 'order', sequence: ['two', 'one', 'three'] }], ['upgrade', { kind: 'replaces', edges: [{ from: 'three', to: 'one' }] }])
  input.levels[0][1] = { title: 'Start', tray: '#tray', adds: ['#menu'], tasks: [{ gives: ['#tray'] }] }
  const content = assemble(input)
  const start = content.levels.find(({ id }) => id === 'toy/start')
  assert.equal(start.tray, 'toy/tray')
  assert.deepEqual(start.adds, ['toy/two', 'toy/one'])
  assert.deepEqual(start.tasks[0].gives, ['toy/two', 'toy/one', 'toy/three'])
  assert.deepEqual(content.trays['toy/tray'].items, [{ id: 'toy/menu', title: 'Menu', items: ['toy/two', 'toy/one'] }, 'toy/three'])
  assert.deepEqual(content.replaces, { 'toy/three': ['toy/one'] })
})

test('a selected layout projects onto a partial chapter and retains its empty positions', () => {
  const input = source()
  input.game.chapters[0].levels = ['toy/a', 'toy/b']
  input.game.optional = []
  const content = assemble(input)
  assert.deepEqual(content.eras[0].rows, [['toy/a'], ['toy/b', null]])
  assert.deepEqual(checkContent({ vocabulary }, content), [])
})


test('order qualification follows the referenced kind when a level shares a native piece name', () => {
  const input = source()
  input.schemas = { ...vocabulary, kinds: { part: { start: {} } } }
  const content = assemble(input)
  assert.equal(content.relations['toy/sequence'].sequence[0], 'toy/start')
})

test('item tags distinguish setting definitions from a piece setting and its values', () => {
  const input = source()
  input.partDefs = { parts: { knob: { settings: { 'mode': { options: [{ value: 'on' }] } } } } }
  input.tags.push(['settings', { kind: 'item', values: ['mode'] }], ['knob', { kind: 'item', values: ['knob.mode', 'knob.mode=on'] }])
  const content = assemble(input)
  assert.ok(content.objectProblems.some((p) => /unknown item toy\/mode/.test(p.says)))
  assert.ok(!content.objectProblems.some((p) => /unknown item toy\/knob/.test(p.says)))
})

test('settings have neither a registry nor a tag kind', () => {
  const input = source()
  input.tags.push(['obsolete', { kind: 'setting', values: [] }])
  const content = assemble(input)
  assert.equal(Object.hasOwn(content.registries, 'setting'), false)
  assert.ok(checkContent({ vocabulary }, content).some((problem) => /tags\/toy\/obsolete/.test(problem.at)))
})
