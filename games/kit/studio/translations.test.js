// node --test (npm test, from trace-viewer) — the translation table's rows (translations.js), on content written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from '../engine/schema.js'
import { translationOp, translationRows } from './translations.js'

const link = '<level-ref to="a"></level-ref>'
const vocabulary = { game: S.obj({ title: S.text() }), level: S.obj({ title: S.text(), hint: S.opt(S.list(S.text())) }) }
const content = {
  id: 'toy', title: { zh: '玩具' }, eras: [],
  levels: [{ id: 'b', title: { zh: '乙' }, hint: [{ zh: `看${link}` }, { zh: '玩具' }, 'a + b'] }, { id: 'a', title: { zh: '甲' } }],
  partDefs: { parts: { add: { name: { zh: '加' } } } },
  glossary: { groups: [], entries: [{ id: 'e', title: { zh: '词' }, body: [{ zh: '甲' }] }] },
  i18n: { en: { 玩具: 'Toy', [`看${link}`]: 'See it', 旧: 'Old' } },
}

test('every base text once, in play order, with its state; then the entries no text reads', () => {
  const rows = translationRows(content, vocabulary, ['a', 'b'], 'en')
  assert.deepEqual(rows.map((r) => [r.from, r.state]), [['玩具', 'done'], ['甲', 'missing'], ['乙', 'missing'], [`看${link}`, 'wrong'], ['词', 'missing'], ['加', 'missing'], ['旧', 'unused']], 'a plain string is no text; a part’s name is')
  assert.match(rows.find((r) => r.state === 'wrong').why, /links nothing/)
  assert.equal(rows[0].where, 'game.json title')
  assert.deepEqual(translationRows(content, vocabulary, ['a', 'b'], 'ja').map((r) => r.state), ['missing', 'missing', 'missing', 'missing', 'missing', 'missing'], 'a language not begun: everything is missing')
})

test('typing a translation writes it; emptying one drops its entry; emptying nothing is nothing', () => {
  const [done, missing] = translationRows(content, vocabulary, ['a', 'b'], 'en')
  assert.deepEqual(translationOp('en', missing, 'A'), { op: 'i18n.set', lang: 'en', from: '甲', to: 'A' })
  assert.deepEqual(translationOp('en', done, ' '), { op: 'i18n.set', lang: 'en', from: '玩具' })
  assert.equal(translationOp('en', missing, ''), null)
})
