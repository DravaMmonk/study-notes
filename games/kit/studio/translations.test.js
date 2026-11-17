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
    { file: { object: { kind: 'demo/item', name: 'demo/and', folder: 'parts' } }, path: ['name'] },
    { file: { glossary: true, target: { entry: 'demo/proof', path: ['title'] } }, path: ['entries', 0, 'title'] },
    { file: { glossary: true, target: { tag: 'demo/basics', path: ['title'] } }, path: ['groups', 0, 'title'] },
  ]
  assert.deepEqual(rows.map(copyFileOf), ['levels/one.json', 'levels/one.json', 'parts/and.json', 'entries/proof.json', 'tags/entry/basics.json'])
  assert.deepEqual(copyFiles(rows), [['levels/one.json', 2], ['parts/and.json', 1], ['entries/proof.json', 1], ['tags/entry/basics.json', 1]])
  // A row goes to its field in the side panel.
  assert.deepEqual(copyFieldOf(rows[1]), { at: { level: 'demo/one' }, path: ['tasks', 0, 'brief'] })
  assert.deepEqual(copyFieldOf(rows[2]), { at: { object: { kind: 'demo/item', name: 'demo/and', folder: 'parts', full: 'demo/and', namespace: 'demo', own: true } }, path: ['name'] })
  assert.deepEqual(copyFieldOf({ file: { game: true }, path: ['title'] }), { at: { game: true }, path: ['title'] })
})


test('declared object copy uses its schema, directory and generic text target', async () => {
  const { S } = await import('../engine/schema.js')
  const { operationsFor } = await import('../engine/ops/operations.js')
  const { copyFileOf, copyFieldOf } = await import('./copy.js')
  const declaration = { folder: 'scenes', schema: S.obj({ title: S.text() }) }
  const original = { title: { en: 'First', zh: '第一', $key: 'demo/scene.first.title' } }
  const vocabulary = { game: S.obj({}), level: S.obj({}), objectKinds: { 'demo/scene': declaration } }
  const content = { levels: [], objectKinds: vocabulary.objectKinds, registries: { 'demo/scene': { 'demo/first': original } }, glossary: { entries: [], groups: [] } }
  const rows = allCopyRows(content, vocabulary, [])
  assert.equal(rows.length, 1)
  assert.equal(copyFileOf(rows[0]), 'scenes/first.json')
  assert.equal(copyFieldOf(rows[0]).at.object.kind, 'demo/scene')
  const op = copyEdit(rows[0], 'zh', '开始')
  assert.deepEqual(op, { op: 'text.set', kind: 'demo/scene', name: 'demo/first', path: ['title'], lang: 'zh', value: '开始' })
  const objects = new Map([['demo/first', original]])
  const ws = { contentObjects: { 'demo/scene': objects }, entries: new Map(), tags: new Map(), sections: new Map() }
  const { inverse } = operationsFor(vocabulary)['text.set'].apply(ws, op, { vocabulary })
  assert.deepEqual(objects.get('demo/first').title, { ...original.title, zh: '开始' })
  operationsFor(vocabulary)['text.set'].apply(ws, inverse[0], { vocabulary })
  assert.deepEqual(objects.get('demo/first'), original)
})
