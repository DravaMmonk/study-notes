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
  const [game, level] = allCopyRows(content, vocabulary, ['step'], 'game')
  assert.notEqual(game.key, level.key)
  assert.deepEqual(copyLanguages([game, level]), ['en', 'fr', 'zh'])
  assert.deepEqual(copyEdit(game, 'zh', '合并', 'game'), { op: 'text.set', in: 'game', path: ['title'], lang: 'zh', value: '合并' })
  assert.deepEqual(copyEdit(level, 'zh', '拼接'), { op: 'text.set', level: 'step', path: ['title'], lang: 'zh', value: '拼接' })
  // In the game workspace a package text gets the game's own wording; the package keeps its own.
  assert.deepEqual(copyEdit(level, 'zh', '拼接', 'game'), { op: 'text.override', level: 'step', path: ['title'], lang: 'zh', value: '拼接' })
  assert.deepEqual(allCopyRows(content, vocabulary, ['step']).map((row) => row.file), [{ level: 'step' }])
})

test('the copy workspace lists texts by the file they are in', async () => {
  const { copyFieldOf, copyFileOf, copyFiles } = await import('./copy.js')
  const rows = [
    { file: { level: 'demo/one' }, path: ['title'] },
    { file: { level: 'demo/one' }, path: ['tasks', 0, 'brief'] },
    { file: { parts: true }, path: ['parts', 'demo/and', 'name'] },
    { file: { glossary: true, target: { entry: 'demo/proof', path: ['title'] } }, path: ['entries', 0, 'title'] },
    { file: { glossary: true, target: { tag: 'demo/basics', path: ['title'] } }, path: ['groups', 0, 'title'] },
  ]
  assert.deepEqual(rows.map(copyFileOf), ['levels/one.json', 'levels/one.json', 'pieces/and.json', 'entries/proof.json', 'tags/entry/basics.json'])
  assert.deepEqual(copyFiles(rows), [['levels/one.json', 2], ['pieces/and.json', 1], ['entries/proof.json', 1], ['tags/entry/basics.json', 1]])
  // A row goes to its field in the side panel.
  assert.deepEqual(copyFieldOf(rows[1]), { at: { level: 'demo/one' }, path: ['tasks', 0, 'brief'] })
  assert.deepEqual(copyFieldOf(rows[2]), { at: { parts: true, root: ['parts', 'demo/and'] }, path: ['parts', 'demo/and', 'name'] })
  assert.deepEqual(copyFieldOf({ file: { game: true }, path: ['title'] }), { at: { game: true }, path: ['title'] })
})
