import { pluginSource, packageApp } from './package-vite.js'
import { contentLayers } from '../engine/resolver.js'
// The Vite plugin that makes trace-viewer/game.html every game's page. `virtual:game` gives the page its game: in a
// build the one named by GAME, on the dev server whichever /game/<id>/ the address names. A game's page is code
// only — its domain (`virtual:game/<id>`: the domain's game.js and vocabulary) — and reads the game's content when
// it opens: content.json beside the page (games/DESIGN.md 6.1: the selected course and its package, assembled by
// ../engine/content.js). A build writes content.json next to the page; the dev server reads
// it off the files on every request. So content changes without a build. The page's title, description and tab icon
// come from the hub's list (../../games.js).
import { resolve } from 'node:path'
import { GAMES } from '../../games.js'
import { isDataGame, readContent } from '../engine/resolver.js'
import { gameModule as domainEntry } from '../engine/game-module.js'
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
  const hasCode = layers.some(layer => layer.hasCore || layer.hasView)
  const pluginIds = runtimeIds(content).filter(id => layers.some(layer => layer.id === id && layer.hasCore))
  const modules = runtimeIds(content).filter(id => !pluginIds.includes(id))
  return [
    ...(hasCode ? [pluginSource(layers)] : []),
    ...modules.flatMap((id, index) => [
      `import define${index} from ${q(domainEntry(resolve(KIT, 'modules'), id))}`,
      `import { ${({ logic: 'prepareLogicWorks', image: 'prepareImageWorks', table: 'prepareTableWorks', rows: 'prepare' })[id] ?? 'prepareWorks'} as prepare${index} } from ${q(resolve(KIT, 'modules', id, id === 'rows' ? 'runtime.js' : 'work.js'))}`,
    ]),
    `import { composeGame } from ${q(resolve(KIT, 'app/compose-game.js'))}`,
    `const define = content => composeGame(content, [${modules.map((id, index) => `{ id: ${q(id)}, define: define${index}, runtime: { prepare: prepare${index} } }`).join(', ')}${modules.length && pluginIds.length ? ',' : ''}${pluginIds.map(id => `pluginGame(${q(id)}, kernel, vocabulary)`).join(', ')}])`,
    ...(!hasCode ? [`import { vocabularyFor } from ${q(resolve(KIT, 'engine/kernel.js'))}`, `const vocabulary = { ...vocabularyFor(${q(modules)}), legacyModules: ${q(modules)}, packageCode: false }`] : []),
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
        const [, id, asset] = req.url?.match(/\/game\/([^/?#]+)\/(content\.json|i18n\/(?:course|package)\/[a-zA-Z0-9.-]+\.json)(?:\?|$)/) ?? []
        if (!id || !isDataGame(id)) return next()
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
    transformIndexHtml(html, ctx) {
      const id = game ?? idOfUrl(ctx.originalUrl) ?? GAMES[0].id
      const g = GAMES.find((x) => x.id === id)
      if (!g || !html.includes('%GAME_')) return html
      return html.replaceAll('%GAME_TITLE%', g.title).replaceAll('%GAME_EN%', g.en).replaceAll('%GAME_DESCRIPTION%', g.page.description).replaceAll('%GAME_ICON%', g.page.icon)
    },
  }
}
