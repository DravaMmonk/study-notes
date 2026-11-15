import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from '../engine/schema.js'
import { allCopyRows, copyEdit, copyLanguages } from './copy.js'

test('the comparison keeps separate fields when text repeats and uses their own language values', () => {
  const vocabulary = { game: S.obj({ title: S.text() }), level: S.obj({ title: S.text() }) }
  const content = {
    title: { en: 'Join', zh: '加入' },
    levels: [{ id: 'step', title: { en: 'Join', fr: 'Assembler' } }],
    glossary: { groups: [], entries: [] },
  }
  const [game, level] = allCopyRows(content, vocabulary, ['step'])
  assert.notEqual(game.key, level.key)
  assert.deepEqual(copyLanguages([game, level]), ['en', 'fr', 'zh'])
  assert.deepEqual(copyEdit(game, 'zh', '合并'), { op: 'text.set', in: 'game', path: ['title'], lang: 'zh', value: '合并' })
  assert.deepEqual(copyEdit(level, 'zh', '拼接'), { op: 'text.set', level: 'step', path: ['title'], lang: 'zh', value: '拼接' })
})
