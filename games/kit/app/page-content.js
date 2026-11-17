import { kindSchemas, withKindDeclarations } from '../engine/plugin-kinds.js'
import { vocabularyFor } from '../engine/kernel.js'
import { ENTRY } from '../engine/vocabulary.js'
import { circuitVocabulary, PARTS_FILE } from '../../../packages/circuit/core/index.js'
import { OBJECT_SCHEMAS } from '../engine/objects.js'
import { BLUEPRINT } from '../pipeline/blueprint.js'
import { catalogReader } from '../engine/catalogs.js'
import { assemble, combineConfiguration, configurationFiles } from '../engine/content.js'

/** Resolve the separately published language files once at startup so switching languages needs no reload. */
export async function pageContent(manifest, base, fetcher = fetch, vocabulary) {
  const { id, locales, levels, glossary, partDefs, blueprint, tags, relations, sections, trays, game, contentObjects = {} } = manifest
  async function reader(scope) {
    const catalogs = await Promise.all(Object.entries(locales[scope]).map(async ([lang, path]) => {
      const response = await fetcher(new URL(path, base))
      if (!response.ok) throw new Error(`${path}: ${response.status} ${response.statusText}`)
      return [lang, await response.json()]
    }))
    return Object.fromEntries(catalogs)
  }
  const [courseCatalogs, packageCatalogs] = await Promise.all([reader('course'), reader('package')])
  const courseText = catalogReader(courseCatalogs, 'i18n/course')
  const packageText = catalogReader(packageCatalogs, 'i18n/package')
  if (vocabulary.legacyModules) {
    const layers = Object.entries(contentObjects.kind ?? {}).map(([name, value]) => ({ id: name.split('/')[0], catalogs: packageCatalogs, objects: [{ kind: 'kind', name: name.split('/')[1], value }] }))
    vocabulary = withKindDeclarations(circuitVocabulary(vocabularyFor(vocabulary.legacyModules)), layers, vocabulary.packageCode)
  }

  const configuration = Object.fromEntries(Object.entries(configurationFiles(game)).map(([file, value]) => [
    file, (file === 'game.json' || file === 'course.json' ? courseText : packageText)(value, file, vocabulary.game, vocabulary),
  ]))
  return assemble({
    id, schemas: vocabulary,
    contentObjects: Object.fromEntries(Object.entries(contentObjects).map(([kind, values]) => [kind, Object.fromEntries(Object.entries(values).map(([name, value]) => [name, packageText(value, `${kind}/${name}.json`, kindSchemas(vocabulary)[kind], vocabulary)]))])),
    game: combineConfiguration(configuration),
    levels: levels.map(([level, value]) => [level, packageText(value, `levels/${level}.json`, vocabulary.level, vocabulary)]),
    ...Object.fromEntries(Object.entries({ tags, relations, sections, trays }).map(([kind, values]) => [kind, (values ?? []).map(([name, value, ns]) => [name, packageText(value, `${kind}/${name}.json`, OBJECT_SCHEMAS[kind], vocabulary), ns])])),
    glossary: { groups: [], entries: glossary.entries.map(({ id, ...entry }) => ({ id, ...packageText(entry, `entries/${id}.json`, ENTRY, vocabulary) })) },
    partDefs: partDefs && { parts: Object.fromEntries(Object.entries(partDefs?.parts ?? {}).map(([name, part]) => [name, packageText(part, `parts/${name}.json`, PARTS_FILE.fields.parts.of, vocabulary)])) },
    blueprint: courseText(blueprint, 'blueprint.json', BLUEPRINT, vocabulary),
    fromDisk: true,
  })
}
