// Read the game configuration and its content package for the build and author tools.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fromSnapshot } from './vocabulary.js'
import { assemble, combineConfiguration } from './content.js'
import { GLOSSARY } from './vocabulary.js'
import { PARTS_FILE } from './parts/schema.js'
import { OBJECT_SCHEMAS } from './objects.js'
import { BLUEPRINT } from '../pipeline/blueprint.js'
import { composeLayers, orderPackages, folders, kindForFolder } from './layers.js'
import { catalogReader } from './catalogs.js'
import { packageCourse } from './package-course.js'

export const PROJECT_DIR = resolve(import.meta.dirname, '../../..')
export const GAMES_DIR = resolve(PROJECT_DIR, 'games')

/** Read the published schema alongside a domain. Author tools can supply a vocabulary for an uninstalled test domain. */
export function vocabularyAt(dir) {
  const versions = resolve(dir, 'versions')
  if (!existsSync(versions)) return undefined
  const latest = Math.max(...readdirSync(versions).filter((name) => /^\d+\.json$/.test(name)).map((name) => Number(name.slice(0, -5))))
  return Number.isFinite(latest) ? fromSnapshot(json(resolve(versions, `${latest}.json`))) : undefined
}
export const contentVocabulary = (domain) => vocabularyAt(resolve(PROJECT_DIR, 'games/kit/domains', domain))

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
  return existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith('.json')).sort().map((f) => [f.slice(0, -5), resolve(folder, f)]) : []
}

/** Games arrange package objects and cannot declare objects of their own. */
export function gameDeclarationProblems(gameDir) {
  return ['levels', 'pieces', 'pieces.json', 'settings', 'settings.json', 'glossary.json', 'entries', 'entries.json', 'tags', 'relations', 'layouts', 'groups', 'trays.json']
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
  const parts = resolve(packageDir, 'pieces.json')
  const courseText = catalogReader(readCatalogs(courseLocales), courseLocales)
  const packageCatalogs = readCatalogs(packageLocales)
  const packageText = catalogReader(packageCatalogs, packageLocales)
  const schemas = vocabulary ?? contentVocabulary(files['package.json'].domain)
  const read = (reader, path, schema) => reader(json(path), path, schema, schemas)
  const ownText = (file) => (file === 'game.json' || file === 'course.json' ? courseText : packageText)
  return assemble({
    id, packageId, courseNamespace, schemas,
    game: combineConfiguration(Object.fromEntries(Object.entries(files).map(([file, value]) => [file, ownText(file)(value, file, schemas.game, schemas)]))),
    levels: levelFiles(packageDir).map(([levelId, file]) => [levelId, read(packageText, file, schemas.level)]),
    ...Object.fromEntries(['tags', 'relations', 'layouts'].map((kind) => [kind, [
      ...objectFiles(packageDir, kind).map(([name, file]) => [name, read(packageText, file, OBJECT_SCHEMAS[kind]), packageId]),
    ]])),
    declarationProblems: gameDir === packageDir ? [] : gameDeclarationProblems(gameDir),
    glossary: read(packageText, resolve(packageDir, 'glossary.json'), GLOSSARY),
    partDefs: existsSync(parts) ? read(packageText, parts, PARTS_FILE) : undefined,
    blueprint: existsSync(blueprint) ? read(courseText, blueprint, BLUEPRINT) : undefined,
    fromDisk: true,
  })
}

/** Read a layer in file shape; workspaces can replace this layer before assembling. */
export function readLayer(id, dir, config = json(resolve(dir, 'package.json'))) {
  const objects = levelFiles(dir).map(([name, file]) => ({ kind: 'level', name, value: json(file) }))
  for (const folder of ['tags', 'relations', 'layouts']) for (const [name, file] of objectFiles(dir, folder)) objects.push({ kind: kindForFolder[folder], name, value: json(file) })
  const parts = resolve(dir, 'pieces.json'), glossary = resolve(dir, 'glossary.json')
  if (existsSync(parts)) for (const [field, kind] of [['parts', 'piece'], ['settings', 'setting']]) for (const [name, value] of Object.entries(json(parts)[field] ?? {})) objects.push({ kind, name, value })
  const glossaryValue = existsSync(glossary) ? json(glossary) : { groups: [], entries: [] }
  for (const { id: name, ...value } of glossaryValue.entries) objects.push({ kind: 'entry', name, value })
  const overrides = [], textOverrides = []
  const overrideDir = resolve(dir, 'overrides')
  for (const namespace of existsSync(overrideDir) ? readdirSync(overrideDir) : []) {
    for (const [kind, folder] of Object.entries(folders)) for (const [name, file] of objectFiles(resolve(overrideDir, namespace), folder)) overrides.push({ kind, name: `${namespace}/${name}`, value: json(file) })
    for (const [lang, entries] of Object.entries(readCatalogs(resolve(overrideDir, namespace, 'i18n')))) textOverrides.push({ namespace, lang, entries })
  }
  return { id, config, objects, overrides, textOverrides, catalogs: readCatalogs(resolve(dir, 'i18n')), glossary: glossaryValue }
}

export function readPackageLayers(packageIds, root = PROJECT_DIR) {
  return orderPackages(packageIds.map((id) => readLayer(id, resolve(root, 'packages', id))))
}

/** Assemble qualified layers once, after every override has been composed. */
export function assembleLayers(id, layers, schemas, { blueprint, declarationProblems = [], packageId = null } = {}) {
  const result = composeLayers(layers, schemas)
  const { registries: r, configurations, sources, overrideHistory, layerOrder, layerUses, groups } = result
  let game = Object.assign({}, ...configurations)
  delete game.uses
  const packageFields = Object.keys(game).filter((key) => !['domain', 'vocabulary'].includes(key))
  if (packageId) game = packageCourse(packageId, r, game, schemas)
  const entries = (kind) => Object.entries(r[kind]).map(([name, value]) => [name, value, name.split('/')[0]])
  const overridden = {}
  for (const event of overrideHistory) if (event.kind === 'i18n') {
    const [lang, key] = event.name.split(':')
    const values = overridden[key] ??= {}
    values[lang] = event.before
  }
  // Glossary groups remain package metadata until the later glossary migration.
  return assemble({ id, schemas, packageId: packageId ?? layers[0].id, game, qualified: true,
    levels: entries('level'), tags: entries('tag'), relations: entries('relation'), layouts: entries('layout'),
    partDefs: { parts: r.piece, settings: r.setting }, glossary: { groups, entries: Object.entries(r.entry).map(([id, value]) => ({ id, ...value })) },
    blueprint, declarationProblems, overridden, fromDisk: true, ...(packageId && { packagePreview: { id: packageId, fields: packageFields } }), provenance: { sources, overrideHistory, layerOrder, layerUses },
  })
}

export function readContent(id, root = PROJECT_DIR, { overrides = true, vocabulary } = {}) {
  const { packageIds, files } = readGameConfig(id, root)
  const layers = readPackageLayers(packageIds, root)
  const gameDir = gameDirectory(id, root)
  const own = readLayer(`@${id}`, gameDir, { ...files['game.json'], ...files['course.json'] })
  if (!overrides) { own.overrides = []; own.textOverrides = [] }
  own.objects = []
  const schemas = vocabulary ?? contentVocabulary(layers[0].config.domain)
  const blueprintPath = resolve(gameDir, 'blueprint.json')
  const blueprint = existsSync(blueprintPath) ? catalogReader(own.catalogs)(json(blueprintPath), blueprintPath, BLUEPRINT, schemas) : undefined
  return assembleLayers(id, [...layers, own], schemas, { blueprint, declarationProblems: gameDeclarationProblems(gameDir) })
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
  return orderPackages([...layers.values()])
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
  const schemas = vocabulary ?? contentVocabulary(layers.find((layer) => layer.id === id).config.domain)
  return assembleLayers(id, layers, schemas, { packageId: id })
}

/** A domain's uninstalled starter keeps the course and package files together. */
export function readStarter(domainDir) {
  const dir = resolve(domainDir, 'starter')
  const files = { 'game.json': json(resolve(dir, 'game.json')), ...configuration(configPaths(dir, dir)) }
  return readFiles('starter', files, { vocabulary: vocabularyAt(domainDir), courseNamespace: 'starter', packageId: 'starter', packageDir: dir, gameDir: dir, courseLocales: resolve(dir, 'i18n/course'), packageLocales: resolve(dir, 'i18n/package') })
}

/** The domain module (../domains/<domain>/domain.js) of a content. */
export const domainOf = async (content) => (await import(`../domains/${content.domain}/domain.js`)).default
