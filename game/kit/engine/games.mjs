// A game's whole definition (the shell's levels, parts box and encyclopedia), made under node for the checks from its
// content (content.js): its domain's game.jsx loaded through vite, as the build loads it, with the few browser globals
// the games touch at import time stubbed. vite and the games' packages are trace-viewer's, wherever node runs from.
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(import.meta.dirname, '../../../trace-viewer')
const DOMAINS = resolve(import.meta.dirname, '../domains')

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

/** The game made from `content` as the shell gets it (its domain's game.jsx over it). */
export async function gameOf(content) {
  await serve()
  const defineGame = (await server.ssrLoadModule(resolve(DOMAINS, content.domain, 'game.jsx'))).default
  return defineGame(content)
}

async function serve() {
  if (!server) {
    const { createServer } = await import(pathToFileURL(from.resolve('vite')).href)
    const react = (await import(pathToFileURL(from.resolve('@vitejs/plugin-react')).href)).default
    server = await createServer({
      root: ROOT, configFile: false, plugins: [react()], appType: 'custom', logLevel: 'error',
      server: { middlewareMode: true, hmr: false, ws: false, fs: { allow: ['..'] } },
      resolve: { dedupe: ['react', 'react-dom', 'lucide-react'] }, ssr: { noExternal: ['lucide-react'] }, optimizeDeps: { noDiscovery: true, include: [] },
    })
  }
}

export async function closeGames() {
  const open = server
  server = null
  await open?.close()
}
