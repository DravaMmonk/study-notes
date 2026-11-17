import { collectionProblems } from './collections.js'
import { layerProblems, BUILTIN_POLICIES } from './kind-policy.js'
import { schemaForKind } from './layers.js'
import { existenceProblems } from './existence.js'
import { tagKey, tagName } from './tag-identity.js'
import { kindSchemas, BUILTIN_KIND_NAMES } from './plugin-kinds.js'
import { encyclopedia } from './encyclopedia.js'
import { meaningsOf, derivedFields, configurationFile } from './kind-meanings.js'
import { registryVocabularies } from './objects.js'
import { GLOSSARY } from './vocabulary.js'
import { createRegistries, expandNames, fullName, registryOf } from './names.js'
import { referenceResolver, expandReferences, expandRelations, assembleChapters } from './objects.js'

const schemaKey = Symbol.for('study-notes.content-schema')
export const contentSchemas = {
  set(content, schemas) { Object.defineProperty(content, schemaKey, { value: schemas, enumerable: true, configurable: true }); return this },
  get: content => content?.[schemaKey],
  has: content => Boolean(content?.[schemaKey]),
}
export const contentRoots = new WeakMap()
const sourceContents = new WeakSet()
export const hasCatalogSource = (content) => sourceContents.has(content)

const gameFields = new Set(['title', 'kicker', 'lede', 'chapters', 'encyclopedia'])
const courseFields = new Set(['optional', 'skippable', 'mode', 'open', 'views', 'words', 'power', 'box'])

/** The owner of a field in the assembled game configuration. */
export function contentFileFor([field]) {
  if (configurationFile(field)) return configurationFile(field)
  if (courseFields.has(field)) return 'course.json'
  if (field === undefined || gameFields.has(field)) return 'game.json'
  return 'package.json'
}

/** Split configuration into its editable game, course and package files. */
export function configurationFiles(configuration) {
  const files = { 'game.json': {}, 'package.json': {}, 'course.json': {} }
  for (const [field, value] of Object.entries(configuration)) files[contentFileFor([field])][field] = value
  return files
}

export function combineConfiguration(files) {
  const configuration = {}
  for (const [file, value] of Object.entries(files)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${file}: expected a JSON object`)
    for (const [field, data] of Object.entries(value)) {
      if (['version', 'kernel', 'uses', 'packages'].includes(field)) continue
      if (contentFileFor([field]) !== file) throw new Error(`${file}: ${field} belongs in ${contentFileFor([field])}`)
      configuration[field] = data
    }
  }
  return configuration
}

export const courseLevelCount = (configuration, total) => configuration.eras ? configuration.eras.reduce((count, chapter) => count + chapter.levels.length, 0) : total

/** One content from a game's files. `levels` and named objects: [[id, value, namespace?]] in any order (they are kept sorted by id). */
export function assemble({ id, packageId = id, schemas, contentObjects = {}, courseNamespace = `@${id}`, game, levels, tags = [], relations = [], sections = [], declarationProblems = [], glossary, blueprint, overridden = {}, fromDisk = false, qualified = false, existenceChecked = false, provenance = {}, packageTarget = null, objectKinds = schemas?.objectKinds }) {
  game = { ...game }
  delete game.uses
  if (!schemas) throw new Error('content assembly needs the domain vocabulary')
  const expand = (value, namespace, schema, context = '') => qualified ? value : expandNames(value, namespace, { objects: contentObjects, schema, vocabulary: schemas, context })
  game = Object.fromEntries(Object.entries(configurationFiles(game)).flatMap(([file, value]) => {
    const namespace = file === 'game.json' || file === 'course.json' ? courseNamespace : packageId
    return Object.entries(expand(value, namespace, schemas.game, 'configuration'))
  }))
  levels = levels.map(([name, value]) => [fullName(packageId, name), expand(value, packageId, schemas?.level)])
  glossary = expand(glossary, packageId, GLOSSARY)
  blueprint = expand(blueprint, `@${id}`)
  overridden = Object.fromEntries(Object.entries(overridden).map(([key, value]) => [fullName(packageId, key), value]))
  const byId = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)
  const objects = (folder, entries) => registryOf(folder, entries.map(([name, value, namespace = packageId]) => {
    const kind = { tags: 'tag', relations: 'relation', sections: 'section' }[folder]
    const full = fullName(namespace, name)
    return [kind === 'tag' ? tagKey(value.kind, full) : full, expand(value, namespace, schemaForKind(kind, schemas, value))]
  }))
  const tagMap = objects('tags', tags)
  const sectionMap = objects('sections', sections)
  const relationMap = objects('relations', relations)
  const registries = createRegistries({
    ...Object.fromEntries(Object.keys(kindSchemas(schemas)).map(kind => [kind, []])),
    level: levels,
    entry: (glossary?.entries ?? []).map((entry) => [entry.id, entry]),
    ...Object.fromEntries(Object.entries(contentObjects).filter(([kind]) => kind !== 'kind').map(([kind, values]) => [kind, Object.entries(values).map(([name, value]) => [fullName(kind === 'chapter' ? courseNamespace : packageId, name), expand(value, kind === 'chapter' ? courseNamespace : packageId, kindSchemas(schemas)[kind])])])),
    kind: [...new Set([...BUILTIN_KIND_NAMES, ...Object.keys(objectKinds ?? {})])].map(name => [name, contentObjects.kind?.[name] ?? objectKinds?.[name] ?? BUILTIN_POLICIES[name] ?? { declares: 'package', overrides: { package: ['*'], game: ['$text'] } }]),
    tag: Object.entries(tagMap), relation: Object.entries(relationMap), section: Object.entries(sectionMap),
  })
  if (!packageTarget) registries.game = { [`${courseNamespace}/config`]: game }
  registryVocabularies.set(registries, schemas)
  const objectProblems = [...declarationProblems]
  if (!existenceChecked) {
    for (const [kind, values] of Object.entries(registries)) for (const [key, value] of Object.entries(values)) {
      const name = kind === 'tag' ? tagName(key) : key
      if (name.includes('/')) objectProblems.push(...layerProblems(name.split('/')[0], kind, name, value, schemaForKind(kind, schemas, value), schemas))
    }
    const layers = new Map()
    for (const [kind, values] of Object.entries(registries)) for (const [key, value] of Object.entries(values)) {
      if (kind === 'game') continue
      const name = kind === 'tag' ? tagName(key) : key
      const namespace = name.includes('/') ? name.split('/')[0] : 'kernel'
      if (!layers.has(namespace)) layers.set(namespace, { id: namespace, config: {}, objects: [], catalogs: {} })
      layers.get(namespace).objects.push({ kind, name, value })
    }
    const selected = [...layers.keys()]
    for (const layer of layers.values()) layer.config.uses = Object.fromEntries(selected.filter(id => id !== layer.id).map(id => [id, '^1.0.0']))
    layers.set(courseNamespace, { ...(layers.get(courseNamespace) ?? { id: courseNamespace, objects: [] }), config: { ...game, packages: Object.fromEntries(selected.map(id => [id, '^1.0.0'])) } })
    // Source-free callers already carry resolved text; only source layers define catalog identities.
    const unkey = value => Array.isArray(value) ? value.map(unkey) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== '$key').map(([key, child]) => [key, unkey(child)])) : value
    objectProblems.push(...existenceProblems([...layers.values()].map(layer => ({ ...layer, objects: layer.objects.map(object => ({ ...object, value: unkey(object.value) })), config: unkey(layer.config) })), schemas))
  }
  const resolve = referenceResolver(registries, objectProblems)
  for (const [name, tag] of Object.entries(tagMap)) {
    resolve(`#${tagName(name)}`, tag.kind, `tags/${name}`)
  }
  for (const [kind, values] of Object.entries(registries)) for (const [name, value] of Object.entries(values)) objectProblems.push(...collectionProblems(value, schemaForKind(kind, schemas, value), resolve, `${kind}/${name}`))
  const refs = (value, schema) => expandReferences(value, schema, resolve, schemas)
  for (const [kind, schema] of Object.entries(kindSchemas(schemas)).filter(([kind]) => kind !== 'chapter')) for (const [name, value] of Object.entries(registries[kind])) registries[kind][name] = refs(value, schema)
  const sourceChapters = game.chapters?.map(name => ({ id: name, ...registries.chapter[name] }))
  const scheduled = new Set(packageTarget ? levels.map(([id]) => id) : (sourceChapters ?? []).flatMap((chapter) => resolve(chapter.levels, 'level', `chapters/${chapter.id}`)))
  const relationDefinitions = Object.assign({}, ...Object.values(objectKinds ?? {}).map(d => d.relations))
  for (const [name, relation] of Object.entries(relationMap)) if (!['requires', ...Object.keys(relationDefinitions)].includes(relation.kind)) objectProblems.push({ at: `relations/${name}`, says: `unknown relation ${relation.kind}` })
  const relationEdges = expandRelations(relationMap, resolve, scheduled, objectProblems, new Set(resolve(game.optional ?? [], 'level')), Object.assign({}, ...Object.values(objectKinds ?? {}).map(d => d.relations)))
  levels = levels.map(([name, value]) => [name, refs(value, schemas.level)])
  glossary = refs(glossary, GLOSSARY)
  const entryObjects = glossary?.entries ?? []
  glossary = encyclopedia(entryObjects, sectionMap, resolve, game.encyclopedia)
  game = refs(game, schemas.game)
  const eras = sourceChapters && assembleChapters(sourceChapters, { expand: resolve, relations: relationEdges, optional: game.optional, skippable: game.skippable, problems: objectProblems })
  const projections = Object.assign({}, ...meaningsOf(schemas).map(meaning => meaning.assemble?.({ registries, relationEdges, resolve, problems: objectProblems, schemas })))
  const content = {
    id, ...game, ...provenance, ...(Object.keys(objectKinds ?? {}).length && { objectKinds }), ...(packageTarget && { packageTarget }), ...(eras && { eras, sourceChapters }), ...projections,
    levels: [...levels].sort(byId).map(([levelId, level]) => ({ id: levelId, ...level })),
    tags: tagMap, relations: relationMap, sections: sectionMap, relationEdges, objectProblems, glossary,
    ...(blueprint ? { blueprint } : {}), overridden, registries,
  }
  registries.level = registryOf('level', content.levels.map((level) => [level.id, level]))
  registries.entry = registryOf('entry', entryObjects.map((entry) => [entry.id, entry]))
  contentSchemas.set(content, schemas)
  if (fromDisk) sourceContents.add(content)
  return content
}

/** The content frozen all the way down, so nothing that reads it can write into it (the checks and the dev page read
 *  it so: a domain's course read makes what it derives, never writes it onto the content). */
export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

/** File-shaped assembly inputs for publishers and pending-course validation. */
export function assemblySource(content) {
  const schemas = contentSchemas.get(content) ?? { objectKinds: content.objectKinds }
  const { objectKinds: _objectKinds, id, levels, glossary: _glossary, blueprint, overridden, registries, objectProblems: _problems, relationEdges: _edges, eras: _eras, sourceChapters: _sourceChapters, sources: _sources, overrideHistory: _history, layerOrder: _layerOrder, layerUses: _layerUses, tags = {}, relations = {}, sections = {}, ...configuration } = content
  const game = Object.fromEntries(Object.entries(configuration).filter(([key]) => !derivedFields(schemas).includes(key)))
  const sourceObjects = Object.assign({}, registries, ...meaningsOf(schemas).map(meaning => meaning.source?.({ content })))
  return {
    id, game, contentObjects: Object.fromEntries(Object.keys(kindSchemas(schemas)).map(kind => [kind, kind === 'kind' ? Object.fromEntries(Object.entries(registries?.kind ?? {}).filter(([name]) => _objectKinds?.[name])) : sourceObjects?.[kind] ?? {}])),
    glossary: { groups: [], entries: Object.entries(registries?.entry ?? {}).map(([id, entry]) => ({ id, ...entry })) }, blueprint, overridden,
    levels: levels.map(({ id, ...level }) => [id, level]),
    ...Object.fromEntries(Object.entries({ tags, relations, sections }).map(([kind, objects]) => [kind, Object.entries(objects).map(([name, object]) => [kind === 'tags' ? tagName(name) : name, object, (kind === 'tags' ? tagName(name) : name).split('/')[0]])])),
  }
}
