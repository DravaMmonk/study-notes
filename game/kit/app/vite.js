// The Vite plugin that makes trace-viewer/game.html every game's page. `virtual:game` gives the page its game: in a
// build the one named by GAME, on the dev server whichever /game/<id>/ the address names. `virtual:game/<id>` is one
// game as the shell takes it: a data game (games/DESIGN.md 6.1: games/<id>/game.json, levels/*.json,
// glossary.json) assembled (../engine/content.js) and handed to its domain's game.jsx; a game not yet moved to data,
// its games/<id>/game.js(x). The page's title, description and tab icon come from the hub's list (../../games.js).
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GAMES } from '../../games.js'
import { isDataGame, levelFiles } from '../engine/content-node.js'

const GAMES_DIR = resolve(import.meta.dirname, '../..')
const KIT = resolve(import.meta.dirname, '..')
const legacyEntry = (id) => ['game.jsx', 'game.js'].map((f) => resolve(GAMES_DIR, id, f)).find(existsSync)
const playable = (id) => isDataGame(id) || Boolean(legacyEntry(id))
const idOfUrl = (url = '') => url.match(/\/game\/([^/?#]+)\//)?.[1]
const PREFIX = 'virtual:game/'
const q = JSON.stringify

/** The module that is game `id` as the shell takes it. */
function gameModule(id) {
  if (!isDataGame(id)) return `export { default } from ${q(legacyEntry(id))}`
  const dir = resolve(GAMES_DIR, id)
  const { domain } = JSON.parse(readFileSync(resolve(dir, 'game.json'), 'utf8'))
  const levels = levelFiles(id)
  return [
    `import { assemble } from ${q(resolve(KIT, 'engine/content.js'))}`,
    `import defineGame from ${q(resolve(KIT, 'domains', domain, 'game.jsx'))}`,
    `import game from ${q(resolve(dir, 'game.json'))}`,
    `import glossary from ${q(resolve(dir, 'glossary.json'))}`,
    ...levels.map(([, file], k) => `import level${k} from ${q(file)}`),
    `export default defineGame(assemble({ id: ${q(id)}, game, glossary, levels: [${levels.map(([levelId], k) => `[${q(levelId)}, level${k}]`).join(', ')}] }))`,
  ].join('\n')
}

export function gameApp({ game = null } = {}) {
  return {
    name: 'game-app',
    resolveId: (id) => (id === 'virtual:game' || id.startsWith(PREFIX) ? `\0${id}` : null),
    load(id) {
      if (id.startsWith(`\0${PREFIX}`)) return gameModule(id.slice(PREFIX.length + 1))
      if (id !== '\0virtual:game') return null
      if (game) return `export const loadGame = async () => (await import(${q(PREFIX + game)})).default`
      const loaders = GAMES.filter((g) => playable(g.id)).map((g) => `${q(g.id)}: () => import(${q(PREFIX + g.id)})`)
      return `const GAMES = { ${loaders.join(', ')} }
export const loadGame = async () => (await GAMES[location.pathname.match(/\\/game\\/([^/]+)\\//)?.[1] ?? ${q(GAMES[0].id)}]()).default`
    },
    transformIndexHtml(html, ctx) {
      const id = game ?? idOfUrl(ctx.originalUrl) ?? GAMES[0].id
      const g = GAMES.find((x) => x.id === id)
      if (!g || !html.includes('%GAME_')) return html
      return html.replaceAll('%GAME_TITLE%', g.title).replaceAll('%GAME_EN%', g.en).replaceAll('%GAME_DESCRIPTION%', g.page.description).replaceAll('%GAME_ICON%', g.page.icon)
    },
  }
}
