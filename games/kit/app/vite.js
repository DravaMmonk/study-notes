// The Vite plugin that makes trace-viewer/game.html every game's page. `virtual:game` gives the page its game: in a
// build the one named by GAME (games/<id>/game.js or game.jsx), on the dev server whichever /game/<id>/ the address
// names. The page's title, description and tab icon come from the hub's list (../../games.js).
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { GAMES } from '../../games.js'

const GAMES_DIR = resolve(import.meta.dirname, '../..')
const entryOf = (id) => ['game.jsx', 'game.js'].map((f) => resolve(GAMES_DIR, id, f)).find(existsSync)
const idOfUrl = (url = '') => url.match(/\/game\/([^/?#]+)\//)?.[1]

export function gameApp({ game = null } = {}) {
  return {
    name: 'game-app',
    resolveId: (id) => (id === 'virtual:game' ? '\0virtual:game' : null),
    load(id) {
      if (id !== '\0virtual:game') return null
      if (game) return `export const loadGame = async () => (await import(${JSON.stringify(entryOf(game))})).default`
      const loaders = GAMES.filter((g) => entryOf(g.id)).map((g) => `${JSON.stringify(g.id)}: () => import(${JSON.stringify(entryOf(g.id))})`)
      return `const GAMES = { ${loaders.join(', ')} }
export const loadGame = async () => (await GAMES[location.pathname.match(/\\/game\\/([^/]+)\\//)?.[1] ?? ${JSON.stringify(GAMES[0].id)}]()).default`
    },
    transformIndexHtml(html, ctx) {
      const id = game ?? idOfUrl(ctx.originalUrl) ?? GAMES[0].id
      const g = GAMES.find((x) => x.id === id)
      if (!g || !html.includes('%GAME_')) return html
      return html.replaceAll('%GAME_TITLE%', g.title).replaceAll('%GAME_EN%', g.en).replaceAll('%GAME_DESCRIPTION%', g.page.description).replaceAll('%GAME_ICON%', g.page.icon)
    },
  }
}
