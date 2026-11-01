// The studio's server side (games/DESIGN.md 6.6), a Vite plugin for the dev server (npm run studio): the tools the
// MCP server offers (../engine/ops/tools.js) as HTTP endpoints, and the module that gives the studio's page every
// domain's game.jsx. Like the MCP server it has no logic of its own: every change is a changeset run by the operation
// set, every check npm run check's.
//
//   GET  /studio/api/              the tools: { name: { about, params } }
//   POST /studio/api/<tool>        the tool's arguments as a JSON body → its result as JSON (an error: { error })
//
// Calls are answered one at a time, in order, as the MCP server answers them: a changeset sees the files the one
// before it wrote. GAMES_ROOT points the tools at a copy of the games folder.
import { readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const PREFIX = '/studio/api/'
const DOMAINS = resolve(import.meta.dirname, '../domains')
const MODULE = 'virtual:studio-domains'

/** The bridge over `tools` (name → { about, params, run(args) }), as connect middleware. */
export function bridge(tools, lacking) {
  let queue = Promise.resolve()
  return (req, res, next) => {
    const url = new URL(req.url, 'http://localhost')
    if (!url.pathname.startsWith(PREFIX)) return next()
    const reply = (status, body) => {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(body))
    }
    const name = url.pathname.slice(PREFIX.length)
    if (!name && req.method === 'GET') return reply(200, Object.fromEntries(Object.entries(tools).map(([k, t]) => [k, { about: t.about, params: t.params }])))
    const tool = tools[name]
    if (!tool) return reply(404, { error: `no tool ${name}; the tools are ${Object.keys(tools).join(', ')}` })
    if (req.method !== 'POST') return reply(405, { error: `POST ${name}’s arguments as JSON` })
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      queue = queue.then(async () => {
        let args
        try {
          args = body ? JSON.parse(body) : {}
        } catch {
          return reply(400, { error: 'the body is not JSON' })
        }
        const absent = lacking(tool, args)
        if (absent.length) return reply(400, { error: `${name} needs ${absent.join(', ')}` })
        try {
          reply(200, await tool.run(args))
        } catch (error) {
          reply(422, { error: error.message })
        }
      })
    })
  }
}

/** The plugin: the bridge on the dev server, and `virtual:studio-domains` ({ domain: () => import(its game.jsx) }). */
export function studioApp() {
  return {
    name: 'studio',
    resolveId: (id) => (id === MODULE ? `\0${id}` : null),
    load(id) {
      if (id !== `\0${MODULE}`) return null
      const domains = readdirSync(DOMAINS).filter((d) => existsSync(resolve(DOMAINS, d, 'game.jsx')))
      return `export const DOMAINS = { ${domains.map((d) => `${JSON.stringify(d)}: () => import(${JSON.stringify(resolve(DOMAINS, d, 'game.jsx'))})`).join(', ')} }`
    },
    async configureServer(server) {
      const { TOOLS, lacking } = await import('../engine/ops/tools.js')
      const { closeGames } = await import('../engine/games.mjs')
      server.middlewares.use(bridge(TOOLS, lacking))
      server.httpServer?.on('close', closeGames)
    },
  }
}
