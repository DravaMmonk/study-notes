import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contentAssets, CONTENT_FILE } from './content-assets.js'
import { S } from '../engine/schema.js'
import { COURSE_FIELDS } from '../engine/course-schema.js'
import { assemble } from '../engine/content.js'
import { pageContent } from './page-content.js'

test('the page loads independent course and package catalogs, and a translation changes the manifest', async () => {
  const vocabulary = { kinds: {}, game: S.obj({ title: S.text(), chapters: S.list(S.obj({ id: S.str(), title: S.text(), ...COURSE_FIELDS })) }), level: S.obj({ title: S.text() }) }
  const content = {
    id: 'toy',
    title: { en: 'Course', zh: '课程', $key: '@toy/heading' },
    chapters: [{ id: 'main', title: { en: 'Opening', zh: '开场', $key: '@toy/chapter' }, levels: ['toy/first'] }],
    levels: [{ id: 'toy/first', title: { en: 'Level', zh: '关卡', $key: 'toy/heading' } }],
    glossary: { groups: [], entries: [] },
  }
  const assets = contentAssets(content)
  const manifest = JSON.parse(assets.get(CONTENT_FILE))
  assert.equal(manifest.game.title, '@@toy/heading')
  assert.equal(manifest.levels[0][1].title, '@toy/heading')
  assert.deepEqual(JSON.parse(assets.get(manifest.locales.package.zh)), { 'toy/heading': '关卡' })
  assert.deepEqual(JSON.parse(assets.get(manifest.locales.course.zh)), { '@toy/chapter': '开场', '@toy/heading': '课程' })

  const restored = await pageContent(manifest, 'https://example.test/toy/', (url) => new Response(assets.get(url.pathname.slice('/toy/'.length))), vocabulary)
  assert.deepEqual(restored, assemble({ id: content.id, schemas: vocabulary, game: { title: content.title, chapters: content.chapters }, levels: content.levels.map(({ id, ...level }) => [id, level]), glossary: content.glossary }))

  const revised = contentAssets({ ...content, title: { ...content.title, en: 'Course title' } })
  const next = JSON.parse(revised.get(CONTENT_FILE))
  assert.notEqual(next.locales.course.en, manifest.locales.course.en)
  assert.equal(next.locales.course.zh, manifest.locales.course.zh)
  assert.deepEqual(next.locales.package, manifest.locales.package)

  const duplicate = { ...content, levels: [...content.levels, { ...content.levels[0], id: 'second' }] }
  assert.throws(() => contentAssets(duplicate), /package: text key toy\/heading is used by multiple fields/)
})
