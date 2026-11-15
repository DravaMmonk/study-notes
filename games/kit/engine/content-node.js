// Read the game configuration and its content package for the build and author tools.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { assemble } from './content.js'

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

/** Keep the package selector separate from the domain's course configuration. */
export function splitGameConfig({ package: packageId, ...game }, root = PROJECT_DIR) {
  if (typeof packageId !== 'string' || !/^[a-z][a-z0-9-]*$/.test(packageId)) {
    throw new Error('game.json needs a package ID with lowercase letters, digits and dashes')
  }
  return { packageId, packageDir: resolve(root, 'packages', packageId), game }
}

export function readGameConfig(id, root = PROJECT_DIR) {
  return splitGameConfig(json(resolve(gameDirectory(id, root), 'game.json')), root)
}

/** The level files of a content package, [[id, path]]. */
export function levelFiles(packageDir) {
  const folder = resolve(packageDir, 'levels')
  return readdirSync(folder).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -'.json'.length), resolve(folder, f)])
}

/** The blind sessions played on a course. */
export function readPlaytests(id, dir = GAMES_DIR) {
  const folder = resolve(dir, id, 'playtests')
  return existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith('.json')).sort().map((f) => json(resolve(folder, f))) : []
}

function readFiles(id, game, packageDir, gameDir) {
  const blueprint = resolve(gameDir, 'blueprint.json')
  const parts = resolve(packageDir, 'pieces.json')
  return assemble({
    id,
    game,
    levels: levelFiles(packageDir).map(([levelId, file]) => [levelId, json(file)]),
    glossary: json(resolve(packageDir, 'glossary.json')),
    partDefs: existsSync(parts) ? json(parts) : undefined,
    blueprint: existsSync(blueprint) ? json(blueprint) : undefined,
  })
}

export function readContent(id, root = PROJECT_DIR) {
  const { game, packageDir } = readGameConfig(id, root)
  return readFiles(id, game, packageDir, gameDirectory(id, root))
}

/** A domain's uninstalled starter keeps the course and package files together. */
export function readStarter(domainDir) {
  const dir = resolve(domainDir, 'starter')
  return readFiles('starter', json(resolve(dir, 'game.json')), dir, dir)
}

/** The domain module (../domains/<domain>/domain.js) of a content. */
export const domainOf = async (content) => (await import(`../domains/${content.domain}/domain.js`)).default
