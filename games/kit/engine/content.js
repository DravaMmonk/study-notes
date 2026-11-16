import { encyclopedia } from './encyclopedia.js'
import { PARTS_FILE } from './parts/schema.js'
import { GLOSSARY } from './vocabulary.js'
import { createRegistries, expandNames, fullName, registryOf } from './names.js'
import { referenceName, qualifyObject, referenceResolver, expandReferences, expandRelations, assembleChapters, relationOrder } from './objects.js'

const sourceContents = new WeakSet()
export const hasCatalogSource = (content) => sourceContents.has(content)

const gameFields = new Set(['title', 'kicker', 'lede'])
const courseFields = new Set(['chapters', 'optional', 'skippable', 'mode', 'open', 'primitives', 'views', 'borrow', 'words'])

/** The owner of a field in the assembled game configuration. */
export function contentFileFor([field]) {
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
      if (contentFileFor([field]) !== file) throw new Error(`${file}: ${field} belongs in ${contentFileFor([field])}`)
      configuration[field] = data
    }
  }
  return configuration
}

export const courseLevelCount = (configuration, total, tags = configuration.tags ?? {}) => configuration.chapters
  ? configuration.chapters.reduce((count, chapter) => count + referenceResolver({ tag: tags, level: {}, piece: {}, entry: {} })(chapter.levels, 'level').length, 0)
  : total

/** One content from a game's files. `levels` and named objects: [[id, value, namespace?]] in any order (they are kept sorted by id). */
export function assemble({ id, packageId = id, schemas, courseNamespace = `@${id}`, game, levels, tags = [], relations = [], layouts = [], declarationProblems = [], glossary, partDefs, blueprint, overridden = {}, fromDisk = false, qualified = false, provenance = {}, packagePreview = null }) {
  if (!schemas) throw new Error('content assembly needs the domain vocabulary')
  const pieces = new Set(Object.keys(partDefs?.parts ?? {})
    .filter((name) => !name.includes('/') || name.startsWith(`${packageId}/`))
    .map((name) => name.includes('/') ? name.slice(name.indexOf('/') + 1) : name))
  const pieceRules = new Set(Object.entries(partDefs?.parts ?? {}).filter(([, piece]) => piece.inside && ['logic:family-lemma', 'logic:family-rule'].includes(piece.family)).map(([name]) => name))
  const expand = (value, namespace, schema, context = '') => qualified ? value : expandNames(value, namespace, { pieces, pieceRules, schema, vocabulary: schemas, context })
  game = Object.fromEntries(Object.entries(configurationFiles(game)).flatMap(([file, value]) => {
    const namespace = file === 'game.json' || file === 'course.json' ? courseNamespace : packageId
    return Object.entries(expand(value, namespace, schemas.game, 'configuration'))
  }))
  levels = levels.map(([name, value]) => [fullName(packageId, name), expand(value, packageId, schemas?.level)])
  glossary = expand(glossary, packageId, GLOSSARY)
  if (partDefs) partDefs = Object.fromEntries(Object.entries(partDefs).map(([kind, values]) => [kind,
    registryOf('piece', Object.entries(values).map(([name, value]) => [fullName(packageId, name), expand(value, packageId, PARTS_FILE.fields[kind]?.of)])),
  ]))
  blueprint = expand(blueprint, `@${id}`)
  overridden = Object.fromEntries(Object.entries(overridden).map(([key, value]) => [fullName(packageId, key), value]))
  const byId = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)
  const objects = (kind, entries) => registryOf(kind, entries.map(([name, value, namespace = packageId]) => {
    const endpoints = [...(value.edges ?? []).flatMap((edge) => [edge.from, edge.to]), ...(value.sequence ?? [])]
    const endpoint = endpoints.find((ref) => ref.startsWith('#')) ?? endpoints[0]
    const endpointName = endpoint && referenceName(namespace, endpoint)
    const taggedKind = endpoint?.startsWith('#') && tags.find(([id, , ns = packageId]) => fullName(ns, id) === endpointName.slice(1))?.[1].kind
    const objectKind = levels.some(([id]) => id === endpointName) ? 'level'
      : glossary?.entries?.some(({ id }) => id === endpointName) ? 'entry' : 'item'
    const relationKind = value.of ?? (taggedKind || objectKind)
    const item = kind === 'tags' ? value.kind === 'item' : kind === 'relations' && (value.kind === 'replaces' || value.kind === 'order' && relationKind === 'item')
    const ref = (ns, v) => item && typeof v === 'string' && !v.startsWith('#') && schemas.kinds?.part?.[v.split('.')[0]] && !pieces.has(v.split('.')[0]) ? v : referenceName(ns, v)
    return [fullName(namespace, name), qualifyObject(kind, value, namespace, (v) => expand(v, namespace, { type: 'text' }), ref)]
  }))
  const tagMap = objects('tags', tags)
  let layoutMap = objects('layouts', layouts)
  const relationMap = objects('relations', relations)
  const registries = createRegistries({
    level: levels, piece: Object.entries({ ...schemas.kinds?.part, ...partDefs?.parts }),
    entry: (glossary?.entries ?? []).map((entry) => [entry.id, entry]),
    tag: Object.entries(tagMap), relation: Object.entries(relationMap), layout: Object.entries(layoutMap),
  })
  const objectProblems = [...declarationProblems]
  for (const [kind, entries] of Object.entries({ tags, relations, layouts })) for (const [name, , namespace = packageId] of entries) {
    if (namespace.startsWith('@') || name.startsWith('@')) objectProblems.push({ at: `${kind}/${name}`, says: 'games cannot declare objects; declare them in a package' })
  }
  const resolve = referenceResolver(registries, objectProblems)
  for (const [name, tag] of Object.entries(tagMap)) {
    resolve(`#${name}`, tag.kind, `tags/${name}`)
    if (tag.concept && tag.kind !== 'item') objectProblems.push({ at: `tags/${name}`, says: 'concept tags must contain items' })
  }
  const concepts = new Map()
  for (const [name, tag] of Object.entries(tagMap)) if (tag.concept && tag.kind === 'item') {
    for (const item of resolve(`#${name}`, 'item')) {
      if (concepts.has(item) && concepts.get(item) !== name) objectProblems.push({ at: `tags/${name}`, says: `${item} belongs to multiple concepts: ${concepts.get(item)}, ${name}` })
      concepts.set(item, name)
    }
  }
  const refs = (value, schema) => expandReferences(value, schema, resolve, schemas)
  const sourceChapters = game.chapters
  const scheduled = new Set((sourceChapters ?? []).flatMap((chapter) => resolve(chapter.levels, 'level', `chapters/${chapter.id}`)))
  const relationEdges = expandRelations(relationMap, resolve, scheduled, objectProblems, new Set(resolve(game.optional ?? [], 'level')))
  resolve.order = relationEdges.order
  layoutMap = Object.fromEntries(Object.entries(layoutMap).map(([name, value]) => [name, { ...value, rows: refs(value.rows, { type: 'list', of: { type: 'list', of: { type: 'level' } } }) }]))
  registries.layout = layoutMap
  levels = levels.map(([name, value]) => [name, refs(value, schemas.level)])
  glossary = refs(glossary, GLOSSARY)
  const entryEdges = relationEdges.order.filter((edge) => edge.of === 'entry')
  if (glossary?.entries) {
    const entries = new Map(glossary.entries.map((entry) => [entry.id, entry]))
    glossary = { ...glossary, entries: relationOrder([...entries.keys()], entryEdges, 'entry').map((id) => entries.get(id)) }
  }
  const entryObjects = glossary?.entries ?? []
  glossary = encyclopedia(entryObjects, tagMap, relationMap, resolve, relationEdges.order)
  game = refs(game, schemas.game)
  const eras = sourceChapters && assembleChapters(game.chapters, { expand: resolve, relations: relationEdges, layouts: layoutMap, optional: game.optional, skippable: game.skippable, problems: objectProblems })
  const replaces = {}
  for (const { from, to } of relationEdges.replaces) (replaces[from] ??= []).push(to)
  const trays = {}
  const nested = new Set(Object.values(tagMap).flatMap((tag) => tag.values.filter((v) => v.startsWith('#')).map((v) => v.slice(1))))
  const namedTrays = new Set(levels.flatMap(([, value]) => [value, ...(value.tasks ?? [])].flatMap((v) => v.tray ? [v.tray].flat().map((v) => v.replace(/^#/, '')) : [])))
  for (const [name, tag] of Object.entries(tagMap)) if (tag.kind === 'item' && (!nested.has(name) || namedTrays.has(name))) {
    const ids = relationOrder(resolve(`#${name}`, 'item'), relationEdges.order, 'item')
    const menus = tag.values.filter((v) => v.startsWith('#')).map((v) => {
      const child = tagMap[v.slice(1)]
      return { id: v.slice(1), title: child?.title, items: relationOrder(resolve(v, 'item'), relationEdges.order, 'item') }
    })
    const used = new Set()
    trays[name] = { name: tag.title, desc: tag.desc, ...(tag.workshop !== undefined && { workshop: tag.workshop }), items: ids.flatMap((id) => {
      const menu = menus.find((m) => m.items.includes(id))
      if (!menu) return [id]
      if (used.has(menu.id)) return []
      used.add(menu.id); return [menu]
    }) }
  }
  const stripTray = (v) => ({ ...v, ...(v.tray && { tray: Array.isArray(v.tray) ? v.tray.map((n) => n.replace(/^#/, '')) : v.tray.replace(/^#/, '') }), ...(v.tasks && { tasks: v.tasks.map(stripTray) }) })
  const content = {
    id, ...game, ...provenance, ...(packagePreview && { packagePreview }), ...(eras && { eras, sourceChapters }), trays, replaces,
    levels: [...levels].sort(byId).map(([levelId, level]) => ({ id: levelId, ...stripTray(level) })),
    tags: tagMap, relations: relationMap, layouts: layoutMap, relationEdges, objectProblems, glossary,
    ...(partDefs ? { partDefs } : {}), ...(blueprint ? { blueprint } : {}), overridden, registries,
  }
  registries.level = registryOf('level', content.levels.map((level) => [level.id, level]))
  registries.entry = registryOf('entry', entryObjects.map((entry) => [entry.id, entry]))
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
  const { id, levels, glossary: _glossary, partDefs, blueprint, overridden, registries: _registries, objectProblems: _problems, relationEdges: _edges, eras: _eras, sourceChapters, sources: _sources, overrideHistory: _history, layerOrder: _layerOrder, layerUses: _layerUses, tags = {}, relations = {}, layouts = {}, trays: _trays, replaces: _replaces, ...game } = content
  if (sourceChapters) game.chapters = sourceChapters
  return {
    id, game, glossary: { groups: [], entries: Object.entries(_registries?.entry ?? {}).map(([id, entry]) => ({ id, ...entry })) }, partDefs, blueprint, overridden,
    levels: levels.map(({ id, ...level }) => [id, level]),
    ...Object.fromEntries(Object.entries({ tags, relations, layouts }).map(([kind, objects]) => [kind, Object.entries(objects).map(([name, object]) => [name, object, name.split('/')[0]])])),
  }
}
