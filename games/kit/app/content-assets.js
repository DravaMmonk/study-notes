// The build, dev server, and content-only publisher serve the same reference-only configuration and locale assets.
import { createHash } from 'node:crypto'
import { sourceValue } from '../engine/catalogs.js'
import { catalogsOf } from '../engine/content-text.js'

export const CONTENT_FILE = 'content.json'

export function contentAssets(content) {
  const { levels, glossary, partDefs, ...course } = content
  const assets = new Map()
  const manifests = {}
  for (const [scope, catalogs] of Object.entries({ course: catalogsOf('course', course), package: catalogsOf('package', levels, glossary, partDefs) })) {
    manifests[scope] = Object.fromEntries(Object.entries(catalogs).map(([lang, entries]) => {
      const text = JSON.stringify(entries)
      const hash = createHash('sha256').update(text).digest('hex').slice(0, 16)
      const name = `i18n/${scope}/${lang}.${hash}.json`
      assets.set(name, text)
      return [lang, name]
    }))
  }
  // The content-only publisher writes the manifest last so readers only discover assets after they exist.
  assets.set(CONTENT_FILE, JSON.stringify({ ...sourceValue(content), locales: manifests }))
  return assets
}
