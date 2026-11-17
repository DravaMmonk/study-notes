import { test } from 'node:test'
import assert from 'node:assert/strict'
import { firstText, isText, languagesOf, textIn } from './i18n.js'
import { sideOf } from '../shell/i18n.js'
import { refProblems } from './text.js'
import { catalogReader, sourceValue } from './catalogs.js'

test('language maps are independent of English or Chinese', () => {
  const field = { fr: 'Titre', 'pt-BR': 'Título', en: '' }
  assert.equal(isText(field), true)
  assert.equal(isText({ default: 'Title' }), false)
  assert.equal(isText({ of: 'errorsTitle' }), false)
  assert.equal(isText({ 'yue-Hant-HK': '標題' }), true)
  assert.equal(isText({ fr: 4 }), false)
  assert.equal(textIn(field, 'pt-BR'), 'Título')
  assert.equal(textIn(field, 'ja'), '')
  assert.equal(textIn('a + b', 'ja'), 'a + b')
  assert.equal(firstText(field), 'Titre')
  assert.equal(sideOf(field, 'pt-BR'), 'Título')
  assert.equal(sideOf(field, 'ja'), 'Titre')
  assert.deepEqual(languagesOf([field, { zh: '标题' }, 'a + b']), ['en', 'fr', 'pt-BR', 'zh'])
})

test('references are validated independently in every language', () => {
  const names = { level: new Map([['start', 'Start']]), part: new Map(), wiki: new Map() }
  const field = { zh: '开始', fr: '<level-ref to="start"></level-ref>', ja: '<wiki-ref to="missing"></wiki-ref>' }
  assert.deepEqual(refProblems(field, 'title', names), ['title refers to a missing encyclopedia entry: missing'])
})

test('catalog text keeps its identity through serialization and resolves each language independently', () => {
  const read = catalogReader({
    en: { 'part.counter.name': 'Route Counter' },
    zh: { 'part.counter.name': '路线计数器', 'part.counter.desc': '数路线' },
  }, 'package i18n')
  const source = { name: '@part.counter.name', desc: '@part.counter.desc', inside: [{ id: 'base', reference: {} }] }
  const part = JSON.parse(JSON.stringify(read(source)))
  assert.deepEqual(sourceValue(part), source)
  assert.deepEqual(languagesOf([part.name, part.desc]), ['en', 'zh'])
  assert.equal(firstText(part.name), 'Route Counter')
  assert.equal(sideOf(part.name, 'zh'), '路线计数器')
  assert.equal(textIn(part.desc, 'en'), '')
  assert.equal(sideOf(part.desc, 'en'), '⟦part.counter.desc · en⟧')
  assert.throws(() => read({ name: '@part.unknown.name' }, 'parts.json'), /parts.json: @part\.unknown\.name has no entry/)
  assert.throws(() => read({ name: { en: 'Inline', $key: 'part.counter.name' } }), /Use an @key catalog reference/)
  assert.throws(() => catalogReader({ en: { name: { subfield: 'Text' } } }), /invalid text entry name/)
})
