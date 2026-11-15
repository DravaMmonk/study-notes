// Read the game configuration and its content package for the build and author tools.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { assemble, combineConfiguration } from './content.js'
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

/** Keep the two selectors separate from the game's presentation. */
export function splitGameConfig({ package: packageId, course: courseId, ...game }, root = PROJECT_DIR) {
  const packageDir = resolve(root, 'packages', selector(packageId, 'package'))
  return { packageId, packageDir, courseId: selector(courseId, 'course'), game }
}

/** Locations within a package, keyed by the logical configuration filenames. */
export const packageConfigPaths = (dir, course) => ({
  'package.json': resolve(dir, 'package.json'),
  'course.json': resolve(dir, 'courses', `${course}.json`),
  'trays.json': resolve(dir, 'trays.json'),
})

function packageConfiguration(packageDir, courseId) {
  const paths = packageConfigPaths(packageDir, courseId)
  return Object.fromEntries(Object.entries(paths).map(([file, path]) => [file, file === 'trays.json' && !existsSync(path) ? undefined : json(path)]))
}

export function readGameConfig(id, root = PROJECT_DIR) {
  const { game: meta, ...location } = splitGameConfig(json(resolve(gameDirectory(id, root), 'game.json')), root)
  const files = { 'game.json': meta, ...packageConfiguration(location.packageDir, location.courseId) }
  return { ...location, files, game: combineConfiguration(files) }
}

/** Every named course in the package, including courses without a game selector. */
export function readPackageCourses(packageDir) {
  const folder = resolve(packageDir, 'courses')
  return readdirSync(folder).filter((name) => name.endsWith('.json')).sort()
    .map((name) => [name.slice(0, -'.json'.length), json(resolve(folder, name))])
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

function readFiles(id, files, packageDir, gameDir, courseLocales, packageLocales) {
  const blueprint = resolve(gameDir, 'blueprint.json')
  const parts = resolve(packageDir, 'pieces.json')
  const courseText = catalogReader(readCatalogs(courseLocales), courseLocales)
  const packageText = catalogReader(readCatalogs(packageLocales), packageLocales)
  const read = (reader, path) => reader(json(path), path)
  return assemble({
    id,
    game: combineConfiguration(Object.fromEntries(Object.entries(files).map(([file, value]) => [
      file, (file === 'game.json' ? courseText : packageText)(value, file),
    ]))),
    levels: levelFiles(packageDir).map(([levelId, file]) => [levelId, read(packageText, file)]),
    glossary: read(packageText, resolve(packageDir, 'glossary.json')),
    partDefs: existsSync(parts) ? read(packageText, parts) : undefined,
    blueprint: existsSync(blueprint) ? read(courseText, blueprint) : undefined,
    fromDisk: true,
  })
}

export function readContent(id, root = PROJECT_DIR) {
  const { files, packageDir } = readGameConfig(id, root)
  const gameDir = gameDirectory(id, root)
  return readFiles(id, files, packageDir, gameDir, resolve(gameDir, 'i18n'), resolve(packageDir, 'i18n'))
}

/** A domain's uninstalled starter keeps the course and package files together. */
export function readStarter(domainDir) {
  const dir = resolve(domainDir, 'starter')
  const { course, ...game } = json(resolve(dir, 'game.json'))
  const files = { 'game.json': game, ...packageConfiguration(dir, selector(course, 'course')) }
  return readFiles('starter', files, dir, dir, resolve(dir, 'i18n/course'), resolve(dir, 'i18n/package'))
}

/** The domain module (../domains/<domain>/domain.js) of a content. */
export const domainOf = async (content) => (await import(`../domains/${content.domain}/domain.js`)).default
