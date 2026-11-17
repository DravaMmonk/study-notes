import { createRequire } from 'node:module'
import { installPackageImports } from './plugin-boundaries.js'
import { createPluginKernel } from './plugins.js'
import { tagName } from './tag-identity.js'
// Read the game configuration and its content package for the build and author tools.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { assemble, combineConfiguration, contentRoots } from './content.js'
import { ENTRY } from './vocabulary.js'
import { PARTS_FILE } from './parts/schema.js'
import { OBJECT_SCHEMAS } from './objects.js'
import { BLUEPRINT } from '../pipeline/blueprint.js'
import { composeLayers, orderPackages, folders, kindForFolder } from './layers.js'
import { catalogReader } from './catalogs.js'
import { runtimeIds } from './runtime.js'
import { contentKindSchemas } from './content-kinds.js'
import { withKindDeclarations, kindSchemas } from './plugin-kinds.js'
import { vocabularyFor } from './kernel.js'

export const PROJECT_DIR = resolve(import.meta.dirname, '../../..')
export const GAMES_DIR = resolve(PROJECT_DIR, 'games')

export const contentVocabulary = (modules) => vocabularyFor(modules)
export const layerVocabulary = (layers) => {
  const levels = layers.flatMap(layer => [...layer.objects, ...(layer.overrides ?? [])].filter(o => o.kind === 'level').map(o => o.value))
  const legacy = levels.flatMap(level => (level.tasks ?? []).filter(task => !task.play || !layers.some(layer => layer.hasCore && task.play.startsWith(`${layer.id}:`))).map(task => ({ ...level, tasks: [task] })))
  const entries = kind => Object.fromEntries(layers.flatMap(layer => [...layer.objects, ...(layer.overrides ?? [])].filter(o => o.kind === kind).map(o => [`${layer.id}/${o.name}`, o.value])))
  const ids = runtimeIds({ levels: legacy, registries: { symbol: entries('symbol') }, partDefs: { parts: entries('part') } })
  const legacyModules = ids.filter(id => !layers.some(layer => layer.id === id && layer.hasCore))
  const packageCode = layers.some(layer => layer.hasCore)
  return { ...withKindDeclarations(vocabularyFor(legacyModules), layers, packageCode), legacyModules, packageCode }
}

const json = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new Error(`${file}: ${error.message}`)
  }
}

export const gameDirectory = (id, root = PROJECT_DIR) => resolve(root, 'games', id)

/** Whether a game has its own course configuration. */
export const isDataGame = (id, root = PROJECT_DIR) => existsSync(resolve(gameDirectory(id, root), 'game.json'))

const selector = (id, label) => {
  if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new Error(`game.json needs a ${label} ID with lowercase letters, digits and dashes`)
  }
  return id
}

/** Keep the package selector separate from the game's presentation. */
export function splitGameConfig({ packages, ...game }, root = PROJECT_DIR) {
  if (!Array.isArray(packages) || !packages.length) throw new Error('game.json needs a nonempty packages array')
  packages.forEach((id) => selector(id, 'package'))
  const packageId = packages[0]
  const packageDir = resolve(root, 'packages', selector(packageId, 'package'))
  return { packageId, packageDir, packageIds: packages, game }
}

/** Locations of the configuration, keyed by the logical filenames: the course in the game, the rest in its package. */
export const configPaths = (gameDir, packageDir) => ({
  'package.json': resolve(packageDir, 'package.json'),
  'course.json': resolve(gameDir, 'course.json'),
})

function configuration(paths) {
  return Object.fromEntries(Object.entries(paths).map(([file, path]) => [file, json(path)]))
}

export function readGameConfig(id, root = PROJECT_DIR) {
  const gameDir = gameDirectory(id, root)
  const { game: meta, ...location } = splitGameConfig(json(resolve(gameDir, 'game.json')), root)
  const files = { 'game.json': meta, ...configuration(configPaths(gameDir, location.packageDir)) }
  return { ...location, files, game: combineConfiguration(files) }
}

/** Named objects declared by a package or game layer, [[name, path]]. */
export function objectFiles(dir, kind) {
  const folder = resolve(dir, kind)
  if (kind === 'tags' || kind === 'tag') {
    if (!existsSync(folder)) return []
    const children = readdirSync(folder, { withFileTypes: true })
    if (children.some((entry) => entry.isFile() && entry.name.endsWith('.json'))) throw new Error(`${folder}: tags belong in <kind>/<name>.json`)
    const walk = (path, prefix = '') => readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => entry.isDirectory() ? walk(resolve(path, entry.name), `${prefix}${entry.name}/`) : entry.name.endsWith('.json') ? [[`${prefix}${entry.name.slice(0, -5)}`, resolve(path, entry.name)]] : [])
    return walk(folder)
  }
  return existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith('.json')).sort().map((f) => [f.slice(0, -5), resolve(folder, f)]) : []
}

/** Tag kind belongs to the path; source files never duplicate it. */
export function tagValue(name, value) {
  if (Object.hasOwn(value, 'kind')) throw new Error(`tags/${name}: kind belongs in the path, not the object`)
  return { ...value, kind: name.slice(0, name.lastIndexOf('/')) }
}

/** Entry identity and membership belong to filenames and tags. */
export function entryValue(name, value) {
  if (Object.hasOwn(value, 'id') || Object.hasOwn(value, 'group')) throw new Error(`entries/${name}: identity belongs in the filename and membership in entry tags`)
  return value
}

/** Games arrange package objects and cannot declare objects of their own. */
export function gameDeclarationProblems(gameDir) {
  return ['levels', 'parts', 'parts.json', 'settings', 'settings.json', 'glossary.json', 'entries', 'entries.json', 'tags', 'relations', 'sections', 'trays', 'groups', 'trays.json', ...Object.keys(contentKindSchemas).map(kind => folders[kind])]
    .filter((name) => existsSync(resolve(gameDir, name)))
    .map((name) => ({ at: name, says: 'games cannot declare objects; declare them in a package' }))
}

/** The level files of a content package, [[id, path]]. */
export function levelFiles(packageDir) {
  const folder = resolve(packageDir, 'levels')
  return (existsSync(folder) ? readdirSync(folder) : []).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -'.json'.length), resolve(folder, f)])
}

/** The locale files of a course or package, [[locale, path]]. */
export function catalogFiles(dir) {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    .map((f) => [f.slice(0, -'.json'.length), resolve(dir, f)]) : []
}

export const readCatalogs = (dir) => Object.fromEntries(catalogFiles(dir).map(([lang, path]) => [lang, json(path)]))

/** The blind sessions played on a course. */
export function readPlaytests(id, dir = GAMES_DIR) {
  const folder = resolve(dir, id, 'playtests')
  return existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith('.json')).sort().map((f) => json(resolve(folder, f))) : []
}

function readFiles(id, files, { packageDir, gameDir, courseLocales, packageLocales, vocabulary, courseNamespace, packageId = packageDir.split('/').at(-1) }) {
  const blueprint = resolve(gameDir, 'blueprint.json')
  const parts = objectFiles(packageDir, 'parts')
  const courseText = catalogReader(readCatalogs(courseLocales), courseLocales)
  const packageCatalogs = readCatalogs(packageLocales)
  const packageText = catalogReader(packageCatalogs, packageLocales)
  const schemas = vocabulary ?? layerVocabulary([readLayer(packageId, packageDir)])
  const read = (reader, path, schema) => reader(json(path), path, schema, schemas)
  const ownText = (file) => (file === 'game.json' || file === 'course.json' ? courseText : packageText)
  return assemble({
    id, packageId, courseNamespace, schemas,
    game: combineConfiguration(Object.fromEntries(Object.entries(files).map(([file, value]) => [file, ownText(file)(value, file, schemas.game, schemas)]))),
    levels: levelFiles(packageDir).map(([levelId, file]) => [levelId, read(packageText, file, schemas.level)]),
    ...Object.fromEntries(['tags', 'relations', 'sections', 'trays'].map((kind) => [kind, [
      ...objectFiles(packageDir, folders[kind] ?? kind).map(([name, file]) => [kind === 'tags' ? name.split('/').at(-1) : name, { ...read(packageText, file, OBJECT_SCHEMAS[kind]), ...(kind === 'tags' && { kind: name.slice(0, name.lastIndexOf('/')) }) }, packageId]),
    ]])),
    contentObjects: Object.fromEntries(Object.entries(contentKindSchemas).map(([kind, schema]) => [kind, Object.fromEntries(objectFiles(packageDir, folders[kind] ?? kind).map(([name, file]) => [name, read(packageText, file, schema)]))])),
    declarationProblems: gameDir === packageDir ? [] : gameDeclarationProblems(gameDir),
    glossary: { groups: [], entries: objectFiles(packageDir, 'entries').map(([id, file]) => ({ id, ...read(packageText, file, ENTRY) })) },
    partDefs: { parts: Object.fromEntries(parts.map(([name, file]) => [name, read(packageText, file, PARTS_FILE.fields.parts.of)])) },
    blueprint: existsSync(blueprint) ? read(courseText, blueprint, BLUEPRINT) : undefined,
    fromDisk: true,
  })
}

/** Read a layer in file shape; workspaces can replace this layer before assembling. */
export function readLayer(id, dir, config = json(resolve(dir, 'package.json')), declarations = {}) {
  if (id === 'kernel') throw new Error('kernel is a reserved namespace')
  if (existsSync(resolve(dir, 'settings')) || existsSync(resolve(dir, 'settings.json'))) throw new Error(`${dir}: settings belong inside parts/`)
  if (existsSync(resolve(dir, 'glossary.json'))) throw new Error(`${dir}: glossary.json has been replaced by entries/ and tags/entry/`)
  const tagReaders = []
  const core = resolve(dir, 'core/index.js')
  if (existsSync(core)) {
    installPackageImports()
    const api = createPluginKernel().forPackage(id, 'core')
    const registration = createRequire(import.meta.url)(core)
    const result = registration.register({ ...api, tag(name, member) {
      api.tag(name, member)
      tagReaders.push({ name, member, reader: id })
    } })
    if (result?.then) throw new Error(`${id}: register(kernel) must register declarations synchronously`)
  }
  const objects = levelFiles(dir).map(([name, file]) => ({ kind: 'level', name, value: json(file) }))
  for (const folder of ['tags', 'relations', 'sections', 'trays']) for (const [name, file] of objectFiles(dir, folder)) objects.push({ kind: kindForFolder[folder], name: folder === 'tags' ? name.split('/').at(-1) : name, value: folder === 'tags' ? tagValue(name, json(file)) : json(file) })
  if (existsSync(resolve(dir, 'parts.json'))) throw new Error(`${dir}: parts.json has been replaced by parts/`)
  for (const [name, file] of objectFiles(dir, 'parts')) objects.push({ kind: 'part', name, value: json(file) })
  for (const [name, file] of objectFiles(dir, 'entries')) objects.push({ kind: 'entry', name, value: entryValue(name, json(file)) })
  for (const kind of Object.keys(contentKindSchemas)) for (const [name, file] of objectFiles(dir, folders[kind])) objects.push({ kind, name, value: json(file) })
  for (const [name, file] of objectFiles(dir, 'kinds')) objects.push({ kind: 'kind', name, value: json(file) })
  for (const [kind, definition] of Object.entries(declarations)) if (!definition.extends) for (const [name, file] of objectFiles(dir, definition.folder)) objects.push({ kind, name, value: json(file) })
  const overrides = [], textOverrides = []
  const overrideDir = resolve(dir, 'overrides')
  for (const namespace of existsSync(overrideDir) ? readdirSync(overrideDir) : []) {
    for (const [kind, folder] of Object.entries({ ...folders, kind: 'kinds', ...Object.fromEntries(Object.entries(declarations).filter(([, d]) => !d.extends).map(([k, d]) => [k, d.folder])) })) for (const [name, file] of objectFiles(resolve(overrideDir, namespace), folder)) overrides.push({ kind, name: `${namespace}/${kind === 'tag' ? name.split('/').at(-1) : name}`, value: kind === 'tag' ? tagValue(name, json(file)) : json(file) })
    for (const [lang, entries] of Object.entries(readCatalogs(resolve(overrideDir, namespace, 'i18n')))) textOverrides.push({ namespace, lang, entries })
  }
  return { id, config, tagReaders, objects, overrides, textOverrides, hasCore: existsSync(resolve(dir, 'core/index.js')), hasView: existsSync(resolve(dir, 'view/index.jsx')), catalogs: readCatalogs(resolve(dir, 'i18n')) }
}

export function readPackageLayers(packageIds, root = PROJECT_DIR) {
  const layers = orderPackages(packageIds.map((id) => readLayer(id, resolve(root, 'packages', id))))
  const definitions = layerVocabulary(layers).objectKinds
  return layers.map(layer => readLayer(layer.id, resolve(root, 'packages', layer.id), layer.config, definitions))
}

/** Assemble qualified layers once, after every override has been composed. */
export function assembleLayers(id, layers, schemas, { blueprint, declarationProblems = [], packageId = null } = {}) {
  const result = composeLayers(layers, schemas)
  const { registries: r, configurations, sources, overrideHistory, layerOrder, layerUses } = result
  const game = Object.assign({}, ...configurations)
  delete game.uses
  const packageFields = Object.keys(game).filter((key) => key !== 'vocabulary')
  const entries = (kind) => Object.entries(r[kind]).map(([name, value]) => [kind === 'tag' ? tagName(name) : name, value, (kind === 'tag' ? tagName(name) : name).split('/')[0]])
  const overridden = {}
  for (const event of overrideHistory) if (event.kind === 'i18n') {
    const [lang, key] = event.name.split(':')
    const values = overridden[key] ??= {}
    values[lang] = event.before
  }
  return assemble({ id, schemas, packageId: packageId ?? layers[0].id, game, qualified: true,
    levels: entries('level'), tags: entries('tag'), relations: entries('relation'), sections: entries('section'), trays: entries('tray'),
    contentObjects: Object.fromEntries(Object.keys(kindSchemas(schemas)).map(kind => [kind, r[kind]])), partDefs: { parts: r.part }, glossary: { groups: [], entries: Object.entries(r.entry).map(([id, value]) => ({ id, ...value })) },
    blueprint, declarationProblems, overridden, fromDisk: true, objectKinds: schemas.objectKinds, ...(packageId && { packageTarget: { id: packageId, fields: packageFields } }), provenance: { sources, overrideHistory, layerOrder, layerUses },
  })
}

export function readContent(id, root = PROJECT_DIR, { overrides = true, vocabulary } = {}) {
  const { packageIds, files } = readGameConfig(id, root)
  const layers = readPackageLayers(packageIds, root)
  const gameDir = gameDirectory(id, root)
  const own = readLayer(`@${id}`, gameDir, { ...files['game.json'], ...files['course.json'] })
  if (!overrides) { own.overrides = []; own.textOverrides = [] }
  own.objects = []
  const schemas = vocabulary ?? layerVocabulary(layers)
  const blueprintPath = resolve(gameDir, 'blueprint.json')
  const blueprint = existsSync(blueprintPath) ? catalogReader(own.catalogs)(json(blueprintPath), blueprintPath, BLUEPRINT, schemas) : undefined
  const content = assembleLayers(id, [...layers, own], schemas, { blueprint, declarationProblems: gameDeclarationProblems(gameDir) })
  contentRoots.set(content, root)
  return content
}

/** Installed packages, including libraries with no game. */
export function packageIds(root = PROJECT_DIR) {
  const dir = resolve(root, 'packages')
  return existsSync(dir) ? readdirSync(dir).filter((id) => existsSync(resolve(dir, id, 'package.json'))).sort() : []
}

/** Open a package with its complete dependency closure, without requiring a game. */
export function packageLayers(id, root = PROJECT_DIR) {
  selector(id, 'package')
  const layers = new Map()
  const visit = (name) => {
    if (layers.has(name)) return
    selector(name, 'package')
    const layer = readLayer(name, resolve(root, 'packages', name))
    layers.set(name, layer)
    for (const dependency of layer.config.uses ?? []) visit(dependency)
  }
  visit(id)
  return readPackageLayers([...layers.keys()], root)
}

/** Bare names retain game precedence. Explicit package selection disambiguates a shared name. */
export function contentTargets(ids = [], root = PROJECT_DIR, { package: asPackage = false, game: asGame = false } = {}) {
  if (asPackage && asGame) throw new Error('choose --package or --game')
  const dir = resolve(root, 'games')
  const games = existsSync(dir) ? readdirSync(dir).filter((id) => isDataGame(id, root)).sort() : []
  const packages = packageIds(root)
  const target = (id) => {
    if (!asPackage && games.includes(id)) return { id, kind: 'game' }
    if (!asGame && packages.includes(id)) return { id, kind: 'package' }
    throw new Error(`no ${asPackage ? 'package' : asGame ? 'game' : 'game or package'} ${id}`)
  }
  if (ids.length) return ids.map(target)
  if (asPackage) return packages.map((id) => ({ id, kind: 'package' }))
  const played = new Set(games.flatMap((id) => readGameConfig(id, root).packageIds))
  return [...games.map((id) => ({ id, kind: 'game' })), ...(asGame ? [] : packages.filter((id) => !played.has(id)).map((id) => ({ id, kind: 'package' })))]
}

export function readPackage(id, root = PROJECT_DIR, { vocabulary } = {}) {
  const layers = packageLayers(id, root)
  const schemas = vocabulary ?? layerVocabulary(layers)
  const content = assembleLayers(id, layers, schemas, { packageId: id })
  contentRoots.set(content, root)
  return content
}

/** A domain's uninstalled starter keeps the course and package files together. */
export function readStarter(templateDir) {
  const dir = resolve(templateDir, 'starter')
  const files = { 'game.json': json(resolve(dir, 'game.json')), ...configuration(configPaths(dir, dir)) }
  return readFiles('starter', files, { vocabulary: layerVocabulary([readLayer('starter', dir)]), courseNamespace: 'starter', packageId: 'starter', packageDir: dir, gameDir: dir, courseLocales: resolve(dir, 'i18n/course'), packageLocales: resolve(dir, 'i18n/package') })
}

export { runtimeOf } from './runtime.js'
