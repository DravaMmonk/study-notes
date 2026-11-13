// node --test (npm test, from trace-viewer) — overlays over base-language content (i18n.js), on content written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from './schema.js'

import { localized, mistranslated, textsIn, translationState } from './i18n.js'

const link = '<level-ref to="a"></level-ref>'
const content = {
  title: { zh: '标题' },
  levels: [{ id: 'a', brief: { zh: `先做${link}` }, hint: [{ zh: '标题' }, { zh: '没译的' }], symbol: 'a + b' }],
  i18n: { en: { 标题: 'Title', [`先做${link}`]: 'Do it first', 旧的: 'Old' } },
}

test('texts are found wherever they stand, a plain string is none', () => {
  assert.deepEqual(textsIn(content.levels), [`先做${link}`, '标题', '没译的'])
})

test('a translation stands only with sound markup and the same links', () => {
  assert.equal(mistranslated(`看${link}`, `See ${link}`), null)
  assert.match(mistranslated(`看${link}`, 'See it'), /links nothing/)
  assert.ok(mistranslated('甲', '<b>A'))
  assert.equal(mistranslated('甲', ' '), 'is empty')
})

test('the page’s content carries each sound translation, falls back where there is none, and drops the overlays', () => {
  const page = localized(content)
  assert.deepEqual(page.title, { zh: '标题', en: 'Title' })
  assert.deepEqual(page.levels[0].hint, [{ zh: '标题', en: 'Title' }, { zh: '没译的' }])
  assert.deepEqual(page.levels[0].brief, { zh: `先做${link}` })
  assert.equal(page.levels[0].symbol, 'a + b')
  assert.equal('i18n' in page, false)
})

test('the state of an overlay: what is translated, what is wrong, what nothing reads', () => {
  assert.deepEqual(translationState(content), [{ lang: 'en', texts: 3, translated: 1, wrong: [{ from: `先做${link}`, why: 'links nothing, its text level:a' }], unused: 1 }])
})

test('schema field kinds select translations without counting the same source twice', () => {
  const source = '拼接'
  const text = { zh: source }
  const vocabulary = { game: S.obj({ title: S.text() }), level: S.obj({ title: S.text(), brief: S.text() }) }
  const draft = {
    title: text,
    levels: [{ id: 'one', title: text, brief: text }],
    partDefs: { parts: { join: {
      name: text, desc: text,
      inputs: [{ name: 'a', label: text }],
      settings: [{ control: 'toggle', key: 'choose', label: text }],
      regions: [{ name: 'body', label: text }],
    } } },
    i18n: { en: { [source]: {
      default: 'Combine', gameTitle: 'Game', levelTitle: 'Append', partName: 'Join',
      partDescription: 'Join both inputs.', settingLabel: 'Set', regionLabel: 'Inside', portLabel: 'In',
    } } },
  }
  const page = localized(draft, vocabulary)
  const part = page.partDefs.parts.join
  assert.deepEqual([
    page.title.en, page.levels[0].title.en, page.levels[0].brief.en, part.name.en, part.desc.en,
    part.settings[0].label.en, part.regions[0].label.en, part.inputs[0].label.en,
  ], ['Game', 'Append', 'Combine', 'Join', 'Join both inputs.', 'Set', 'Inside', 'In'])
  assert.deepEqual(translationState(draft, vocabulary), [{ lang: 'en', texts: 1, translated: 1, wrong: [], unused: 0 }])

  draft.i18n.en[source] = { partName: '<b>broken', regionLabel: 'Inside' }
  assert.equal(localized(draft, vocabulary).partDefs.parts.join.name.en, undefined)
  assert.equal(localized(draft, vocabulary).levels[0].title.en, undefined)
  assert.equal(translationState(draft, vocabulary)[0].translated, 0)
  assert.equal(translationState(draft, vocabulary)[0].wrong[0].kind, 'partName')

  draft.i18n.en[source] = { default: 'Combine', partName: 'Join' }
  assert.equal(localized(draft, vocabulary).partDefs.parts.join.desc.en, 'Combine')
  assert.equal(translationState({ ...draft, partDefs: undefined }, vocabulary)[0].unused, 1)
})
