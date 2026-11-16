// Read the game configuration and its content package for the build and author tools.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fromSnapshot } from './vocabulary.js'
import { assemble, combineConfiguration, overridesOf } from './content.js'
import { GLOSSARY } from './vocabulary.js'
import { PARTS_FILE } from './parts/schema.js'
import { OBJECT_SCHEMAS } from './objects.js'
import { BLUEPRINT } from '../pipeline/blueprint.js'
import { catalogReader } from './catalogs.js'

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
export function splitGameConfig({ package: packageId, ...game }, root = PROJECT_DIR) {
  const packageDir = resolve(root, 'packages', selector(packageId, 'package'))
  return { packageId, packageDir, game }
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
  return readdirSync(folder).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -'.json'.length), resolve(folder, f)])
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

function readFiles(id, files, { packageDir, gameDir, courseLocales, packageLocales, overrideLocales = null, vocabulary, courseNamespace, packageId = packageDir.split('/').at(-1) }) {
  const blueprint = resolve(gameDir, 'blueprint.json')
  const parts = resolve(packageDir, 'pieces.json')
  const courseText = catalogReader(readCatalogs(courseLocales), courseLocales)
  const packageCatalogs = readCatalogs(packageLocales)
  const overrides = overrideLocales ? readCatalogs(overrideLocales) : {}
  const packageText = catalogReader(overlay(packageCatalogs, overrides), packageLocales)
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
    overridden: overridesOf(packageCatalogs, overrides),
    fromDisk: true,
  })
}

/** A game's own texts over its package's (games/<id>/overrides/<lang>.json, keyed as the package's catalog). */
function overlay(catalogs, overrides) {
  return Object.fromEntries([...new Set([...Object.keys(catalogs), ...Object.keys(overrides)])].map((lang) => [lang, { ...catalogs[lang], ...overrides[lang] }]))
}

export function readContent(id, root = PROJECT_DIR, { overrides = true, vocabulary } = {}) {
  const { files, packageDir } = readGameConfig(id, root)
  const gameDir = gameDirectory(id, root)
  return readFiles(id, files, {
    packageDir, gameDir, vocabulary, courseLocales: resolve(gameDir, 'i18n'), packageLocales: resolve(packageDir, 'i18n'),
    overrideLocales: overrides ? resolve(gameDir, 'overrides') : null,
  })
}

/** A domain's uninstalled starter keeps the course and package files together. */
export function readStarter(domainDir) {
  const dir = resolve(domainDir, 'starter')
  const files = { 'game.json': json(resolve(dir, 'game.json')), ...configuration(configPaths(dir, dir)) }
  return readFiles('starter', files, { vocabulary: vocabularyAt(domainDir), courseNamespace: 'starter', packageId: 'starter', packageDir: dir, gameDir: dir, courseLocales: resolve(dir, 'i18n/course'), packageLocales: resolve(dir, 'i18n/package') })
}

/** The domain module (../domains/<domain>/domain.js) of a content. */
export const domainOf = async (content) => (await import(`../domains/${content.domain}/domain.js`)).default
