// node --test (npm test, from trace-viewer) — the translation table's rows (translations.js), on content written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from '../engine/schema.js'
import { copySide, translationOp, translationRows } from './translations.js'

const link = '<level-ref to="a"></level-ref>'
const vocabulary = { game: S.obj({ title: S.text() }), level: S.obj({ title: S.text(), hint: S.opt(S.list(S.text())) }) }
const content = {
  id: 'toy', title: { en: 'Toy' }, eras: [],
  levels: [{ id: 'b', title: { en: 'B' }, hint: [{ en: `See ${link}` }, { en: 'Toy' }, 'a + b'] }, { id: 'a', title: { en: 'A' } }],
  partDefs: { parts: { add: { name: { en: 'Add' } } } },
  glossary: { groups: [], entries: [{ id: 'e', title: { en: 'Term' }, body: [{ en: 'A' }] }] },
  i18n: { zh: { Toy: '玩具', [`See ${link}`]: '看看', Old: '旧' } },
}

test('every base text once, in play order, with its state; then the entries no text reads', () => {
  const rows = translationRows(content, vocabulary, ['a', 'b'], 'zh')
  assert.deepEqual(rows.map((r) => [r.from, r.state]), [['Toy', 'done'], ['A', 'missing'], ['B', 'missing'], [`See ${link}`, 'wrong'], ['Term', 'missing'], ['Add', 'missing'], ['Old', 'unused']], 'a plain string is no text; a part’s name is')
  assert.match(rows.find((r) => r.state === 'wrong').why, /links nothing/)
  assert.equal(rows[0].where, 'game.json title')
  assert.deepEqual(translationRows(content, vocabulary, ['a', 'b'], 'ja').map((r) => r.state), ['missing', 'missing', 'missing', 'missing', 'missing', 'missing'], 'a language not begun: everything is missing')
})

test('typing a translation writes it; emptying one drops its entry; emptying nothing is nothing', () => {
  const [done, missing] = translationRows(content, vocabulary, ['a', 'b'], 'zh')
  assert.deepEqual(translationOp('zh', missing, '甲'), { op: 'i18n.set', lang: 'zh', from: 'A', to: '甲' })
  assert.deepEqual(translationOp('zh', done, ' '), { op: 'i18n.set', lang: 'zh', from: 'Toy' })
  assert.equal(translationOp('zh', missing, ''), null)
})

test('the Copy editor uses the selected Studio language and keeps new and neutral text editable', () => {
  assert.deepEqual(copySide(content.title, 'en', content.i18n), { lang: 'en', text: 'Toy' })
  const translated = copySide(content.title, 'zh', content.i18n)
  assert.deepEqual(translated, { lang: 'zh', text: '玩具', from: 'Toy', to: '玩具' })
  assert.deepEqual(translationOp(translated.lang, translated, '游戏'), { op: 'i18n.set', lang: 'zh', from: 'Toy', to: '游戏' })
  assert.deepEqual(copySide({ en: 'A' }, 'zh', content.i18n), { lang: 'zh', text: '', from: 'A', to: undefined })
  assert.deepEqual(copySide({ en: '' }, 'zh', content.i18n), { lang: 'en', text: '' })
  assert.deepEqual(copySide('a + b', 'zh', content.i18n), { lang: 'en', text: 'a + b' })
})

test('field variants can be edited from the translation table or the Copy editor', () => {
  const draft = { ...content, i18n: { zh: { A: { default: '甲', levelTitle: '第一关' } } } }
  const title = translationRows(draft, vocabulary, ['a', 'b'], 'zh').find((row) => row.from === 'A' && row.kind === 'levelTitle')
  const copy = copySide({ en: 'A' }, 'zh', draft.i18n, 'levelTitle')
  assert.equal(title.to, '第一关')
  assert.equal(copy.text, title.to)
  const expected = { op: 'i18n.set', lang: 'zh', from: 'A', to: { default: '甲', levelTitle: '首关' } }
  assert.deepEqual(translationOp('zh', title, '首关'), expected)
  assert.deepEqual(translationOp('zh', copy, '首关'), expected)
  assert.deepEqual(translationOp('zh', title, ''), { op: 'i18n.set', lang: 'zh', from: 'A', to: '甲' })
})
