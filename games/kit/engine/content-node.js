// A data game's content read from disk under node (npm run check, the tests): content.js assemble over games/<id>/, and
// the records of the blind sessions played on it.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { assemble } from './content.js'

export const GAMES_DIR = resolve(import.meta.dirname, '../..')

const json = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new Error(`${file}: ${error.message}`)
  }
}

/** Whether games/<id>/ is a data game (it has a game.json). */
export const isDataGame = (id, dir = GAMES_DIR) => existsSync(resolve(dir, id, 'game.json'))

/** The level files of a data game, [[id, path]]. */
export const levelFiles = (id, dir = GAMES_DIR) => {
  const folder = resolve(dir, id, 'levels')
  return readdirSync(folder).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -'.json'.length), resolve(folder, f)])
}

/** The records of every blind session a game has played (games/<id>/playtests/*.json, ./play/session.js). */
export function readPlaytests(id, dir = GAMES_DIR) {
  const folder = resolve(dir, id, 'playtests')
  return existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith('.json')).sort().map((f) => json(resolve(folder, f))) : []
}

/** games/<id>/ assembled into one content. */
export function readContent(id, dir = GAMES_DIR) {
  const blueprint = resolve(dir, id, 'blueprint.json')
  const parts = resolve(dir, id, 'parts.json')
  return assemble({
    id,
    game: json(resolve(dir, id, 'game.json')),
    levels: levelFiles(id, dir).map(([levelId, file]) => [levelId, json(file)]),
    glossary: json(resolve(dir, id, 'glossary.json')),
    partDefs: existsSync(parts) ? json(parts) : undefined,
    blueprint: existsSync(blueprint) ? json(blueprint) : undefined,
  })
}

/** The domain module (../domains/<domain>/domain.js) of a content. */
export const domainOf = async (content) => (await import(`../domains/${content.domain}/domain.js`)).default
