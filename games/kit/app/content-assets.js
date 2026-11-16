// The build, dev server, and content-only publisher serve the same reference-only configuration and locale assets.
import { createHash } from 'node:crypto'
import { sourceValue } from '../engine/catalogs.js'
import { catalogsOf } from '../engine/content-text.js'
import { assemblySource, configurationFiles } from '../engine/content.js'

export const CONTENT_FILE = 'content.json'

/** The content as the page plays it: its chapters as played, without what only authoring reads. */
export function contentAssets(content) {
  const source = assemblySource(content)
  const { levels, glossary, partDefs, blueprint, game, tags, relations, layouts, contentObjects } = source
  const objects = [...tags, ...relations, ...layouts]
  const packageObjects = [...objects.map(([, value]) => value), ...Object.values(contentObjects).flatMap(Object.values)]
  const { 'game.json': meta, 'course.json': course, ...configuration } = configurationFiles(game)
  const assets = new Map()
  const manifests = {}
  for (const [scope, catalogs] of Object.entries({
    course: catalogsOf('course', meta, course, blueprint),
    package: catalogsOf('package', ...Object.values(configuration), levels, glossary, partDefs, ...packageObjects),
  })) {
    manifests[scope] = Object.fromEntries(Object.entries(catalogs).map(([lang, entries]) => {
      const text = JSON.stringify(entries)
      const hash = createHash('sha256').update(text).digest('hex').slice(0, 16)
      const name = `i18n/${scope}/${lang}.${hash}.json`
      assets.set(name, text)
      return [lang, name]
    }))
  }
  // The content-only publisher writes the manifest last so readers only discover assets after they exist.
  assets.set(CONTENT_FILE, JSON.stringify({ ...sourceValue(source), locales: manifests }))
  return assets
}
