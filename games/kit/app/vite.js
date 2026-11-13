// The Vite plugin that makes trace-viewer/game.html every game's page. `virtual:game` gives the page its game: in a
// build the one named by GAME, on the dev server whichever /game/<id>/ the address names. A game's page is code
// only — its domain (`virtual:game/<id>`: the domain's game.js and vocabulary) — and reads the game's content when
// it opens: content.json beside the page (games/DESIGN.md 6.1: games/<id>/game.json, levels/*.json, glossary.json,
// parts.json, assembled by ../engine/content.js). A build writes content.json next to the page; the dev server reads
// it off the files on every request. So content changes without a build. The page's title, description and tab icon
// come from the hub's list (../../games.js).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GAMES } from '../../games.js'
import { isDataGame, readContent } from '../engine/content-node.js'
import { gameModule as domainEntry } from '../engine/game-module.js'

const GAMES_DIR = resolve(import.meta.dirname, '../..')
const KIT = resolve(import.meta.dirname, '..')
const idOfUrl = (url = '') => url.match(/\/game\/([^/?#]+)\//)?.[1]
const PREFIX = 'virtual:game/'
const CONTENT = 'content.json'
const q = JSON.stringify

/** The module that is game `id`'s domain as the page takes it: { define (its game.js), vocabulary }. */
function gameModule(id) {
  const { domain } = JSON.parse(readFileSync(resolve(GAMES_DIR, id, 'game.json'), 'utf8'))
  return [
    `import define from ${q(domainEntry(resolve(KIT, 'domains'), domain))}`,
    `import { vocabulary } from ${q(resolve(KIT, 'domains', domain, 'vocabulary.js'))}`,
    'export default { define, vocabulary }',
  ].join('\n')
}

/** Game `id`'s content as the page reads it. */
const contentText = (id) => JSON.stringify(readContent(id))

export function gameApp({ game = null } = {}) {
  return {
    name: 'game-app',
    resolveId: (id) => (id === 'virtual:game' || id.startsWith(PREFIX) ? `\0${id}` : null),
    load(id) {
      if (id.startsWith(`\0${PREFIX}`)) return gameModule(id.slice(PREFIX.length + 1))
      if (id !== '\0virtual:game') return null
      if (game) return `export const loadDomain = async () => (await import(${q(PREFIX + game)})).default`
      const loaders = GAMES.filter((g) => isDataGame(g.id)).map((g) => `${q(g.id)}: () => import(${q(PREFIX + g.id)})`)
      return `const GAMES = { ${loaders.join(', ')} }
export const loadDomain = async () => (await GAMES[location.pathname.match(/\\/game\\/([^/]+)\\//)?.[1] ?? ${q(GAMES[0].id)}]()).default`
    },
    // The dev server: a game's content read off its files on every request.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const id = req.url?.match(/\/game\/([^/?#]+)\/content\.json(?:\?|$)/)?.[1]
        if (!id || !isDataGame(id)) return next()
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(contentText(id))
      })
    },
    // A build: the game's content beside its page.
    generateBundle() {
      if (game) this.emitFile({ type: 'asset', fileName: CONTENT, source: contentText(game) })
    },
    transformIndexHtml(html, ctx) {
      const id = game ?? idOfUrl(ctx.originalUrl) ?? GAMES[0].id
      const g = GAMES.find((x) => x.id === id)
      if (!g || !html.includes('%GAME_')) return html
      return html.replaceAll('%GAME_TITLE%', g.title).replaceAll('%GAME_EN%', g.en).replaceAll('%GAME_DESCRIPTION%', g.page.description).replaceAll('%GAME_ICON%', g.page.icon)
    },
  }
}
