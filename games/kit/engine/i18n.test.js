// node --test (npm test, from trace-viewer) — overlays over base-language content (i18n.js), on content written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
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
