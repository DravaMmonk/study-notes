import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contentAssets, CONTENT_FILE } from './content-assets.js'
import { pageContent } from './page-content.js'

test('the page loads independent course and package catalogs, and a translation changes the manifest', async () => {
  const content = {
    id: 'toy',
    title: { en: 'Course', zh: '课程', $key: 'heading' },
    eras: [{ id: 'main', title: { en: 'Opening', zh: '开场', $key: 'chapter' }, levels: [{ id: 'first' }] }],
    levels: [{ id: 'first', title: { en: 'Level', zh: '关卡', $key: 'heading' } }],
    glossary: { groups: [], entries: [] },
  }
  const assets = contentAssets(content)
  const manifest = JSON.parse(assets.get(CONTENT_FILE))
  assert.equal(manifest.title, '@heading')
  assert.equal(manifest.levels[0].title, '@heading')
  assert.deepEqual(JSON.parse(assets.get(manifest.locales.package.zh)), { heading: '关卡' })
  assert.deepEqual(JSON.parse(assets.get(manifest.locales.course.zh)), { chapter: '开场', heading: '课程' })

  const restored = await pageContent(manifest, 'https://example.test/toy/', (url) => new Response(assets.get(url.pathname.slice('/toy/'.length))))
  assert.deepEqual(restored, { ...content, sourceEras: content.eras, groups: {}, overridden: {} })

  const revised = contentAssets({ ...content, title: { ...content.title, en: 'Course title' } })
  const next = JSON.parse(revised.get(CONTENT_FILE))
  assert.notEqual(next.locales.course.en, manifest.locales.course.en)
  assert.equal(next.locales.course.zh, manifest.locales.course.zh)
  assert.deepEqual(next.locales.package, manifest.locales.package)

  const duplicate = { ...content, levels: [...content.levels, { ...content.levels[0], id: 'second' }] }
  assert.throws(() => contentAssets(duplicate), /package: text key heading is used by multiple fields/)
})
