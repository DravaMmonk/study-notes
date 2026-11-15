// node --test (npm test, from trace-viewer) — overlays over base-language content (i18n.js), on content written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
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
