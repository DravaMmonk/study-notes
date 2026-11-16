// Read the game configuration and its content package for the build and author tools.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { assemble, combineConfiguration, overridesOf } from './content.js'
import { catalogReader } from './catalogs.js'

export const PROJECT_DIR = resolve(import.meta.dirname, '../../..')
export const GAMES_DIR = resolve(PROJECT_DIR, 'games')

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
  'trays.json': resolve(packageDir, 'trays.json'),
})

function configuration(paths) {
  return Object.fromEntries(Object.entries(paths).map(([file, path]) => [file, file === 'trays.json' && !existsSync(path) ? undefined : json(path)]))
}

export function readGameConfig(id, root = PROJECT_DIR) {
  const gameDir = gameDirectory(id, root)
  const { game: meta, ...location } = splitGameConfig(json(resolve(gameDir, 'game.json')), root)
  const files = { 'game.json': meta, ...configuration(configPaths(gameDir, location.packageDir)) }
  return { ...location, files, game: combineConfiguration(files) }
}

/** The level groups of a content package (./groups.js), [[id, path]]. */
export function groupFiles(packageDir) {
  const folder = resolve(packageDir, 'groups')
  return existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith('.json')).sort().map((f) => [f.slice(0, -'.json'.length), resolve(folder, f)]) : []
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

function readFiles(id, files, { packageDir, gameDir, courseLocales, packageLocales, overrideLocales = null }) {
  const blueprint = resolve(gameDir, 'blueprint.json')
  const parts = resolve(packageDir, 'pieces.json')
  const courseText = catalogReader(readCatalogs(courseLocales), courseLocales)
  const packageCatalogs = readCatalogs(packageLocales)
  const overrides = overrideLocales ? readCatalogs(overrideLocales) : {}
  const packageText = catalogReader(overlay(packageCatalogs, overrides), packageLocales)
  const read = (reader, path) => reader(json(path), path)
  const ownText = (file) => (file === 'game.json' || file === 'course.json' ? courseText : packageText)
  return assemble({
    id,
    game: combineConfiguration(Object.fromEntries(Object.entries(files).map(([file, value]) => [file, ownText(file)(value, file)]))),
    levels: levelFiles(packageDir).map(([levelId, file]) => [levelId, read(packageText, file)]),
    groups: groupFiles(packageDir).map(([groupId, file]) => [groupId, read(packageText, file)]),
    glossary: read(packageText, resolve(packageDir, 'glossary.json')),
    partDefs: existsSync(parts) ? read(packageText, parts) : undefined,
    blueprint: existsSync(blueprint) ? read(courseText, blueprint) : undefined,
    overridden: overridesOf(packageCatalogs, overrides),
    fromDisk: true,
  })
}

/** A game's own texts over its package's (games/<id>/overrides/<lang>.json, keyed as the package's catalog). */
function overlay(catalogs, overrides) {
  return Object.fromEntries([...new Set([...Object.keys(catalogs), ...Object.keys(overrides)])].map((lang) => [lang, { ...catalogs[lang], ...overrides[lang] }]))
}

export function readContent(id, root = PROJECT_DIR, { overrides = true } = {}) {
  const { files, packageDir } = readGameConfig(id, root)
  const gameDir = gameDirectory(id, root)
  return readFiles(id, files, {
    packageDir, gameDir, courseLocales: resolve(gameDir, 'i18n'), packageLocales: resolve(packageDir, 'i18n'),
    overrideLocales: overrides ? resolve(gameDir, 'overrides') : null,
  })
}

/** A domain's uninstalled starter keeps the course and package files together. */
export function readStarter(domainDir) {
  const dir = resolve(domainDir, 'starter')
  const files = { 'game.json': json(resolve(dir, 'game.json')), ...configuration(configPaths(dir, dir)) }
  return readFiles('starter', files, { packageDir: dir, gameDir: dir, courseLocales: resolve(dir, 'i18n/course'), packageLocales: resolve(dir, 'i18n/package') })
}

/** The domain module (../domains/<domain>/domain.js) of a content. */
export const domainOf = async (content) => (await import(`../domains/${content.domain}/domain.js`)).default
