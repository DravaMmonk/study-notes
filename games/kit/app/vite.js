import { pluginSource, packageApp } from './package-vite.js'
import { contentLayers } from '../engine/resolver.js'
// The Vite plugin that makes trace-viewer/game.html every game's page. `virtual:game` gives the page its game: in a
// build the one named by GAME, on the dev server whichever /game/<id>/ the address names. A game's page is code
// only — its domain (`virtual:game/<id>`: the domain's game.js and vocabulary) — and reads the game's content when
// it opens: content.json beside the page (games/DESIGN.md 6.1: the selected course and its package, assembled by
// ../engine/content.js). A build writes content.json next to the page; the dev server reads
// it off the files on every request. So content changes without a build. The page's title, description and tab icon
// come from the content workspace's optional presentation catalog.
import { resolve } from 'node:path'
import { firstText } from '../engine/i18n.js'
import { contentTargets, gameCatalog, readContent } from '../engine/resolver.js'
import { runtimeIds } from '../engine/runtime.js'
import { CONTENT_FILE, contentAssets } from './content-assets.js'

const KIT = resolve(import.meta.dirname, '..')
const idOfUrl = (url = '') => url.match(/\/game\/([^/?#]+)\//)?.[1]
const PREFIX = 'virtual:game/'
const q = JSON.stringify

/** The module that is game `id`'s domain as the page takes it: { define (its game.js), vocabulary }. */
function gameModule(id) {
  const content = readContent(id)
  const layers = contentLayers(content).filter(layer => !layer.id.startsWith('@'))
  const pluginIds = runtimeIds(content).filter(id => layers.some(layer => layer.id === id && layer.hasCore))
  return [
    pluginSource(layers),
    `import { composeGame } from ${q(resolve(KIT, 'app/compose-game.js'))}`,
    `const define = content => { const game = composeGame(content, [${pluginIds.map(id => `pluginGame(${q(id)}, kernel, vocabulary)`).join(', ')}]); game.pluginKernel = kernel; return game }`,
    'export default { define, vocabulary }',
  ].join('\n')
}

/** Game `id`'s content and locale assets as the page reads them. */
const assetsOf = (id) => contentAssets(readContent(id))

export function gameApp({ game = null } = {}) {
  const packages = packageApp()
  return {
    name: 'game-app',
    resolveId: (id) => (id === 'virtual:game' || id.startsWith(PREFIX) ? `\0${id}` : packages.resolveId(id)),
    async load(id) {
      if (id.startsWith(`\0${PREFIX}`)) return gameModule(id.slice(PREFIX.length + 1))
      if (id !== '\0virtual:game') return packages.load(id)
      if (game) return `export const loadDomain = async () => (await import(${q(PREFIX + game)})).default`
      const games = contentTargets([], undefined, { game: true })
      const first = (await gameCatalog()).find(entry => games.some(game => game.id === entry.id))?.id ?? games[0]?.id ?? null
      const loaders = games.map((g) => `${q(g.id)}: () => import(${q(PREFIX + g.id)})`)
      return `const GAMES = { ${loaders.join(', ')} }
export const loadDomain = async () => (await GAMES[location.pathname.match(/\\/game\\/([^/]+)\\//)?.[1] ?? ${q(first)}]()).default`
    },
    // The dev server: a game's content read off its files on every request.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const [, id, asset] = req.url?.match(/\/game\/([^/?#]+)\/(content\.json|i18n\/(?:course|package)\/[a-zA-Z0-9.-]+\.json)(?:\?|$)/) ?? []
        if (!id || !contentTargets([], undefined, { game: true }).some(game => game.id === id)) return next()
        const text = assetsOf(id).get(asset)
        if (text === undefined) return next()
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', asset === CONTENT_FILE ? 'no-store' : 'public, max-age=31536000, immutable')
        res.end(text)
      })
    },
    // A build: the game's content beside its page.
    generateBundle() {
      if (game) for (const [fileName, source] of assetsOf(game)) this.emitFile({ type: 'asset', fileName, source })
    },
    async transformIndexHtml(html, ctx) {
      if (!html.includes('%GAME_')) return html
      const id = game ?? idOfUrl(ctx.originalUrl) ?? contentTargets([], undefined, { game: true })[0]?.id
      if (!id) return html
      const content = readContent(id)
      const entry = (await gameCatalog()).find(entry => entry.id === id)
      return html.replaceAll('%GAME_TITLE%', entry?.title ?? firstText(content.title) ?? id).replaceAll('%GAME_EN%', entry?.en ?? content.title?.en ?? firstText(content.title) ?? id).replaceAll('%GAME_DESCRIPTION%', entry?.page?.description ?? firstText(content.lede) ?? '').replaceAll('%GAME_ICON%', entry?.page?.icon ?? '')
    },
  }
}
