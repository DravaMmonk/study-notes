// node --test (npm test, from trace-viewer) — overlays over base-language content (i18n.js), on content written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from './schema.js'
import { sideOf } from '../shell/i18n.js'
import { localized, mistranslated, textsIn, translationState } from './i18n.js'

const link = '<level-ref to="a"></level-ref>'
const content = {
  title: { en: 'Title' },
  levels: [{ id: 'a', brief: { en: `First do ${link}` }, hint: [{ en: 'Title' }, { en: 'Untranslated' }], symbol: 'a + b' }],
  i18n: { zh: { Title: '标题', [`First do ${link}`]: '先做', Old: '旧的' } },
}

test('texts are found wherever they stand, a plain string is none', () => {
  assert.deepEqual(textsIn(content.levels), [`First do ${link}`, 'Title', 'Untranslated'])
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
  assert.deepEqual(page.levels[0].hint, [{ zh: '标题', en: 'Title' }, { en: 'Untranslated' }])
  assert.deepEqual(page.levels[0].brief, { en: `First do ${link}` })
  assert.equal(sideOf(page.title, 'zh'), '标题')
  assert.equal(sideOf(page.levels[0].hint[1], 'zh'), 'Untranslated')
  assert.equal(page.levels[0].symbol, 'a + b')
  assert.equal('i18n' in page, false)
})

test('the state of an overlay: what is translated, what is wrong, what nothing reads', () => {
  assert.deepEqual(translationState(content), [{ lang: 'zh', texts: 3, translated: 1, wrong: [{ from: `First do ${link}`, why: 'links nothing, its text level:a' }], unused: 1 }])
})

test('schema field kinds select translations without counting the same source twice', () => {
  const source = '拼接'
  const text = { en: source }
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
    i18n: { zh: { [source]: {
      default: 'Combine', gameTitle: 'Game', levelTitle: 'Append', partName: 'Join',
      partDescription: 'Join both inputs.', settingLabel: 'Set', regionLabel: 'Inside', portLabel: 'In',
    } } },
  }
  const page = localized(draft, vocabulary)
  const part = page.partDefs.parts.join
  assert.deepEqual([
    page.title.zh, page.levels[0].title.zh, page.levels[0].brief.zh, part.name.zh, part.desc.zh,
    part.settings[0].label.zh, part.regions[0].label.zh, part.inputs[0].label.zh,
  ], ['Game', 'Append', 'Combine', 'Join', 'Join both inputs.', 'Set', 'Inside', 'In'])
  assert.deepEqual(translationState(draft, vocabulary), [{ lang: 'zh', texts: 1, translated: 1, wrong: [], unused: 0 }])

  draft.i18n.zh[source] = { partName: '<b>broken', regionLabel: 'Inside' }
  assert.equal(localized(draft, vocabulary).partDefs.parts.join.name.zh, undefined)
  assert.equal(localized(draft, vocabulary).levels[0].title.zh, undefined)
  assert.equal(translationState(draft, vocabulary)[0].translated, 0)
  assert.equal(translationState(draft, vocabulary)[0].wrong[0].kind, 'partName')

  draft.i18n.zh[source] = { default: 'Combine', partName: 'Join' }
  assert.equal(localized(draft, vocabulary).partDefs.parts.join.desc.zh, 'Combine')
  assert.equal(translationState({ ...draft, partDefs: undefined }, vocabulary)[0].unused, 1)
})
