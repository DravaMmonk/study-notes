// node --test games/kit/engine — the content contract: schemas, vocabularies, data games assembled from their files.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { S, callOf, validate } from './schema.js'
import { markupOf } from './markup.js'
import { checkContent, defineVocabulary, describe } from './vocabulary.js'
import { assemble } from './content.js'
import { isDataGame, readContent } from './content-node.js'

const VOCAB = defineVocabulary({
  domain: 'toy',
  version: 2,
  kinds: {
    world: { line: { about: { zh: '一排格子', en: 'a row of cells' }, params: S.obj({ n: S.int({ min: 1 }) }) } },
    condition: {
      uses: { about: 'reads a sensor', params: S.str() },
      placed: { about: 'any part placed', params: S.opt(S.obj({})) },
      all: { about: 'every one holds', params: S.list(S.call('condition')) },
    },
  },
  game: S.obj({ title: S.text() }),
  level: S.by('mode', {
    run: S.obj({ mode: S.oneOf(['run']), world: S.ref('world'), when: S.opt(S.call('condition')) }),
    read: S.obj({ mode: S.oneOf(['read']), text: S.text() }),
  }),
})

const says = (schema, value) => validate(schema, value, { vocabulary: VOCAB }).map((p) => `${p.at}: ${p.says}`)

test('plain values and objects', () => {
  assert.deepEqual(says(S.int({ min: 1 }), 3), [])
  assert.match(says(S.int(), 1.5)[0], /whole number/)
  assert.match(says(S.int({ min: 1 }), 0)[0], /outside/)
  assert.deepEqual(says(S.text(), { zh: '甲', en: 'A' }), [])
  assert.deepEqual(says(S.text(), 'a + b'), [])
  assert.match(says(S.text(), { zh: '甲' })[0], /expected text/)
  const point = S.obj({ x: S.num(), y: S.opt(S.num()) })
  assert.deepEqual(says(point, { x: 1 }), [])
  assert.deepEqual(says(point, { y: 1, z: 2 }), ['.x: is missing', '.z: is not a field here'])
  assert.deepEqual(says(S.list(point), [{ x: 1 }, { x: 'a' }]), ['[1].x: expected a number, found "a"'])
  assert.deepEqual(says(S.map(S.int(), { keys: '^\\d+,\\d+$' }), { '0,1': 2, up: 3 }), ['.up: the key "up" does not match ^\\d+,\\d+$'])
})

test('either reports its closest fit, by its shape by a field', () => {
  assert.deepEqual(says(S.either(S.num(), S.obj({ a: S.num() })), { a: 'x' }), ['.a: expected a number, found "x"'])
  assert.deepEqual(says(VOCAB.level, { mode: 'read', text: 'hi' }), [])
  assert.match(says(VOCAB.level, { mode: 'jump' })[0], /^\.mode: expected one of "run", "read"/)
})

test('references and calls go by the vocabulary', () => {
  assert.deepEqual(says(VOCAB.level, { mode: 'run', world: 'line', when: { all: [{ uses: 'up' }, 'placed'] } }), [])
  assert.deepEqual(says(VOCAB.level, { mode: 'run', world: 'grid' }), ['.world: "grid" is no world of the vocabulary'])
  assert.deepEqual(says(S.call('condition'), 'uses'), ['(root): the condition "uses" needs parameters: { "uses": … }'])
  assert.deepEqual(says(S.call('condition'), { all: [{ uses: 3 }] }), ['.all[0].uses: expected a string, found 3'])
  assert.deepEqual(says(S.call('condition'), { uses: 'a', placed: true }), ['(root): expected a condition: { name: parameters } or a name, found {"uses":"a","placed":true}'])
  assert.deepEqual(callOf('placed'), ['placed', {}])
  assert.deepEqual(callOf({ placed: true }), ['placed', {}])
  assert.deepEqual(callOf({ uses: 'up' }), ['uses', 'up'])
})

test('a small language reports what it cannot read, by the path, without throwing', () => {
  const brackets = (text) => { let d = 0; for (const c of text) { d += c === '(' ? 1 : c === ')' ? -1 : 0; if (d < 0) return `unexpected ) in ${text}` } return d ? 'unclosed (' : null }
  const vocabulary = defineVocabulary({ domain: 'toy', version: 1, kinds: {}, game: S.obj({}), level: S.obj({ goal: S.syntax('brackets') }), languages: { brackets: { about: 'balanced brackets' } } })
  const languages = { brackets }
  assert.deepEqual(validate(vocabulary.level, { goal: '(a)' }, { vocabulary, languages }), [])
  assert.deepEqual(validate(vocabulary.level, { goal: ')))not a formula' }, { vocabulary, languages }), [{ at: '.goal', says: '")))not a formula" is no brackets: unexpected ) in )))not a formula' }])
  assert.deepEqual(validate(vocabulary.level, { goal: ')))' }, { vocabulary }), [], 'without the readers only the type is checked')
  assert.match(validate(vocabulary.level, { goal: 3 }, { vocabulary })[0].says, /expected brackets text/)
  assert.match(validate(S.syntax('nope'), 'x', { languages })[0].says, /reads no nope/)
  const content = { id: 'g', domain: 'toy', vocabulary: 1, levels: [{ id: 'one', goal: '(()' }], glossary: { groups: [], entries: [] } }
  assert.deepEqual(checkContent({ vocabulary, languages }, content), [{ at: 'levels/one.json.goal', says: '"(()" is no brackets: unclosed (' }])
})

test('text carries only the kernel’s markup: a few tags and references, nothing set as HTML', () => {
  assert.deepEqual(markupOf('a <b>bold <i>and</i></b> <level-ref to="x"></level-ref>, a < b').nodes, ['a ', { tag: 'b', kids: ['bold ', { tag: 'i', kids: ['and'] }] }, ' ', { ref: 'level', to: 'x' }, ', a < b'])
  assert.match(markupOf('<script>alert(1)</script>').problems[0], /<script> is no markup/)
  assert.deepEqual(markupOf('<img src=x onerror=alert(1)>').nodes, ['<img src=x onerror=alert(1)>'], 'drawn as the characters it is')
  assert.match(markupOf('<b onclick="x">hi</b>').problems[0], /takes no attributes/)
  assert.match(markupOf('<b>open').problems[0], /never closed/)
  assert.match(says(S.text(), { zh: '<script>x</script>', en: 'ok' })[0], /^\.zh: <script> is no markup/)
  assert.deepEqual(says(S.text(), { zh: '<b>粗</b> <code>x</code>', en: '<strong>bold</strong> a <- b' }), [])
})

test('a vocabulary prints as plain data', () => {
  const printed = describe(VOCAB)
  assert.equal(printed.kinds.world.line.params.fields.n.type, 'int')
  assert.deepEqual(JSON.parse(JSON.stringify(printed)), printed)
})

test('content is checked file by file', () => {
  const content = assemble({
    id: 'toy',
    game: { domain: 'toy', vocabulary: 3, title: { zh: '玩具', en: 'Toy' }, extra: 1 },
    levels: [['b', { mode: 'read', text: 'x' }], ['a', { mode: 'run', world: 'nowhere' }]],
    glossary: { groups: [], entries: [{ id: 'e', group: 'g', title: 'E', body: [] }] },
  })
  assert.deepEqual(content.levels.map((l) => l.id), ['a', 'b'])
  assert.deepEqual(checkContent({ vocabulary: VOCAB }, content).map((p) => `${p.at}: ${p.says}`), [
    "game.json.vocabulary: written for version 3; the domain's vocabulary is version 2",
    'game.json.extra: is not a field here',
    'levels/a.json.world: "nowhere" is no world of the vocabulary',
  ])
})

test('a data game is read from its folder', () => {
  const dir = mkdtempSync(join(tmpdir(), 'games-'))
  mkdirSync(join(dir, 'toy', 'levels'), { recursive: true })
  writeFileSync(join(dir, 'toy', 'game.json'), JSON.stringify({ domain: 'toy', vocabulary: 1, title: 'Toy' }))
  writeFileSync(join(dir, 'toy', 'levels', 'one.json'), JSON.stringify({ mode: 'read', text: 'hello' }))
  writeFileSync(join(dir, 'toy', 'glossary.json'), JSON.stringify({ groups: [], entries: [] }))
  assert.equal(isDataGame('toy', dir), true)
  assert.equal(isDataGame('none', dir), false)
  const content = readContent('toy', dir)
  assert.deepEqual(content.levels, [{ id: 'one', mode: 'read', text: 'hello' }])
  assert.deepEqual(checkContent({ vocabulary: VOCAB }, content), [])
})
