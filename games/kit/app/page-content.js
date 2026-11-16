import { GLOSSARY } from '../engine/vocabulary.js'
import { PARTS_FILE } from '../engine/parts/schema.js'
import { OBJECT_SCHEMAS } from '../engine/objects.js'
import { BLUEPRINT } from '../pipeline/blueprint.js'
import { catalogReader } from '../engine/catalogs.js'
import { assemble, combineConfiguration, configurationFiles } from '../engine/content.js'

/** Resolve the separately published language files once at startup so switching languages needs no reload. */
export async function pageContent(manifest, base, fetcher = fetch, vocabulary) {
  const { id, locales, levels, glossary, partDefs, blueprint, tags, relations, layouts, game } = manifest
  async function reader(scope) {
    const catalogs = await Promise.all(Object.entries(locales[scope]).map(async ([lang, path]) => {
      const response = await fetcher(new URL(path, base))
      if (!response.ok) throw new Error(`${path}: ${response.status} ${response.statusText}`)
      return [lang, await response.json()]
    }))
    return catalogReader(Object.fromEntries(catalogs), `i18n/${scope}`)
  }
  const [courseText, packageText] = await Promise.all([reader('course'), reader('package')])
  const configuration = Object.fromEntries(Object.entries(configurationFiles(game)).map(([file, value]) => [
    file, (file === 'game.json' || file === 'course.json' ? courseText : packageText)(value, file, vocabulary.game, vocabulary),
  ]))
  return assemble({
    id, schemas: vocabulary,
    game: combineConfiguration(configuration),
    levels: levels.map(([level, value]) => [level, packageText(value, `levels/${level}.json`, vocabulary.level, vocabulary)]),
    ...Object.fromEntries(Object.entries({ tags, relations, layouts }).map(([kind, values]) => [kind, (values ?? []).map(([name, value, ns]) => [name, packageText(value, `${kind}/${name}.json`, OBJECT_SCHEMAS[kind], vocabulary), ns])])),
    glossary: packageText(glossary, 'glossary.json', GLOSSARY, vocabulary),
    partDefs: packageText(partDefs, 'pieces.json', PARTS_FILE, vocabulary),
    blueprint: courseText(blueprint, 'blueprint.json', BLUEPRINT, vocabulary),
    fromDisk: true,
  })
}
