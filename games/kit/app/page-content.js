import { catalogReader } from '../engine/catalogs.js'
import { assemble } from '../engine/content.js'

/** Resolve the separately published language files once at startup so switching languages needs no reload. */
export async function pageContent(manifest, base, fetcher = fetch) {
  const { id, locales, levels, glossary, partDefs, blueprint, ...game } = manifest
  async function reader(scope) {
    const catalogs = await Promise.all(Object.entries(locales[scope]).map(async ([lang, path]) => {
      const response = await fetcher(new URL(path, base))
      if (!response.ok) throw new Error(`${path}: ${response.status} ${response.statusText}`)
      return [lang, await response.json()]
    }))
    return catalogReader(Object.fromEntries(catalogs), `i18n/${scope}`)
  }
  const [courseText, packageText] = await Promise.all([reader('course'), reader('package')])
  return assemble({
    id,
    game: courseText(game, 'game.json'),
    levels: levels.map(({ id: level, ...value }) => [level, packageText(value, `levels/${level}.json`)]),
    glossary: packageText(glossary, 'glossary.json'),
    partDefs: packageText(partDefs, 'pieces.json'),
    blueprint: courseText(blueprint, 'blueprint.json'),
    fromDisk: true,
  })
}
