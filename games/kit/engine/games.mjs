// A game's whole definition (the shell's levels, parts box and encyclopedia), loaded under node for the checks: through
// vite and the page's own plugin (../app/vite.js virtual:game/<id>), as the build loads it, with the few browser globals
// the games touch at import time stubbed.
// Run from trace-viewer (npm run check), whose node_modules hold vite and the games' packages.
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gameApp } from '../app/vite.js'

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

const from = createRequire(resolve(process.cwd(), 'package.json'))
let server = null

/** A module through the same server, so it shares the game's module instances (a domain's play hook, say). */
export async function loadModule(file) {
  await serve()
  return server.ssrLoadModule(file)
}

/** The game `id` as the shell gets it (defineGame's result). */
export async function loadGame(id) {
  await serve()
  return (await server.ssrLoadModule(`virtual:game/${id}`)).default
}

async function serve() {
  if (!server) {
    const { createServer } = await import(pathToFileURL(from.resolve('vite')).href)
    const react = (await import(pathToFileURL(from.resolve('@vitejs/plugin-react')).href)).default
    server = await createServer({
      root: process.cwd(), configFile: false, plugins: [react(), gameApp()], appType: 'custom', logLevel: 'error',
      server: { middlewareMode: true, hmr: false, ws: false, fs: { allow: ['..'] } },
      resolve: { dedupe: ['react', 'react-dom', 'lucide-react'] }, ssr: { noExternal: ['lucide-react'] }, optimizeDeps: { noDiscovery: true, include: [] },
    })
  }
}

export const closeGames = () => server?.close()
