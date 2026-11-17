import { contentRoot } from './resolver.js'
import { contentRoots, contentSchemas } from './content.js'
import { packageApp } from '../app/package-vite.js'
// A game's whole definition (the shell's levels, parts box and encyclopedia), made under node for the checks from its
// content (content.js): its domain's game.js loaded through vite, as the build loads it, with the few browser globals
// the games touch at import time stubbed. vite and the games' packages are trace-viewer's, wherever node runs from.
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gameModule } from './game-module.js'
import { runtimeIds } from './runtime.js'

const ROOT = resolve(import.meta.dirname, '../../../trace-viewer')
const KIT_DIR = resolve(import.meta.dirname, '..')
const DOMAINS = resolve(import.meta.dirname, '../modules')

const noop = () => {}
const memory = new Map()
const stubs = {
  window: globalThis, addEventListener: noop, removeEventListener: noop, requestAnimationFrame: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
  localStorage: { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: (k) => memory.delete(k) },
  document: { documentElement: { dataset: {}, lang: 'zh' }, querySelectorAll: () => [], querySelector: () => null, addEventListener: noop, createElement: () => ({ style: {} }), head: { appendChild: noop } },
  customElements: { get: () => true, define: noop }, HTMLElement: class {},
}
for (const [k, v] of Object.entries(stubs)) if (!(k in globalThis)) globalThis[k] = v

const from = createRequire(resolve(ROOT, 'package.json'))
let server = null

/** A module through the same server, so it shares the game's module instances (a domain's play hook, say). */
export async function loadModule(file) {
  await serve()
  return server.ssrLoadModule(file)
}

/** The game made from `content` as the shell gets it (its domain's game.js over it). */
export async function gameOf(content, { view = false } = {}) {
  await serve()
  const root = contentRoots.get(content) ?? contentRoot()
  const plugins = (await import('./plugin-node.js')).loadPlugins
  const kernel = await plugins(content, root, file => server.ssrLoadModule(file), view)
  const { pluginGame } = await server.ssrLoadModule(resolve(KIT_DIR, 'app/plugin-game.jsx'))
  const vocabulary = contentSchemas.get(content)
  const pluginIds = new Set([...kernel.tables.play.keys()].map(name => name.split(':')[0]).filter(id => id !== 'circuit'))
  const modules = await Promise.all(runtimeIds(content).map(async id => pluginIds.has(id) ? pluginGame(id, kernel, vocabulary, { view }) : ({
    id, define: (await server.ssrLoadModule(gameModule(DOMAINS, id))).default,
    runtime: id === 'circuit' ? (await server.ssrLoadModule(resolve(DOMAINS, '../../../../packages/circuit/core/index.js'))).runtime : (await server.ssrLoadModule(resolve(DOMAINS, id, 'runtime.js'))).default,
  })))
  const { composeGame } = await server.ssrLoadModule(resolve(KIT_DIR, 'app/compose-game.js'))
  return composeGame(content, modules)
}

async function serve() {
  if (!server) {
    const { createServer } = await import(pathToFileURL(from.resolve('vite')).href)
    const react = (await import(pathToFileURL(from.resolve('@vitejs/plugin-react')).href)).default
    server = await createServer({
      root: ROOT, configFile: false, plugins: [react(), packageApp(contentRoot())], appType: 'custom', logLevel: 'error',
      server: { middlewareMode: true, hmr: false, ws: false, fs: { allow: ['..'] } },
      resolve: { dedupe: ['react', 'react-dom', 'lucide-react', 'katex'] }, ssr: { noExternal: ['lucide-react', 'katex'] }, optimizeDeps: { noDiscovery: true, include: [] },
    })
  }
}

export async function closeGames() {
  const open = server
  server = null
  await open?.close()
}
