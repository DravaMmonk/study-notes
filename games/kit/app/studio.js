// The studio's server side (games/DESIGN.md 6.7), a Vite plugin for the dev server (npm run studio): the tools the
// MCP server offers (../engine/ops/tools.js) as HTTP endpoints, and the module that gives the studio's page every
// domain's game.jsx. Like the MCP server it has no logic of its own: every change is a changeset run by the operation
// set, every check npm run check's.
//
//   GET  /studio/api/              the tools: { name: { about, params } }
//   POST /studio/api/<tool>        the tool's arguments as a JSON body → its result as JSON (an error: { error })
//
// Calls are answered one at a time, in order, as the MCP server answers them: a changeset sees the files the one
// before it wrote. The slow ones — a whole check (preview with check, which runs every reference of a big game for
// seconds), a run of a level's tests — go to a second lane, a worker thread with its own copy of the tools, so a quick
// preview never waits behind them; a call that writes waits for both lanes. GAMES_ROOT points the tools at a copy of
// the games folder.
import { readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { Worker } from 'node:worker_threads'

const PREFIX = '/studio/api/'
const DOMAINS = resolve(import.meta.dirname, '../domains')
const MODULE = 'virtual:studio-domains'

/** Whether a call is a slow read (it goes to the second lane), and whether it writes (it waits for both). */
export const slow = (name, args) => (name === 'preview' && args.check !== false) || name === 'run_tests'
const writes = (name, args) => (['modify', 'undo'].includes(name) && !args.dryRun) || (name === 'blueprint' && args.text !== undefined && !args.dryRun)

/** The second lane: the tools in a worker thread. run(name, args) → the result, or throws the tool's error. */
export function worker() {
  const thread = new Worker(new URL('./studio-worker.js', import.meta.url))
  const waiting = new Map()
  let next = 0
  thread.on('message', ({ id, result, error }) => {
    const call = waiting.get(id)
    waiting.delete(id)
    if (error !== undefined) call.reject(new Error(error))
    else call.resolve(result)
  })
  // A thread that dies fails what it was asked; the next call meets the error too, never a hang.
  thread.on('error', (error) => {
    for (const call of waiting.values()) call.reject(error)
    waiting.clear()
  })
  return {
    run: (name, args) => new Promise((done, fail) => {
      next += 1
      waiting.set(next, { resolve: done, reject: fail })
      thread.postMessage({ id: next, name, args })
    }),
    close: () => thread.terminate(),
  }
}

/** The bridge over `tools` (name → { about, params, run(args) }), as connect middleware; `aside`: the second lane. */
export function bridge(tools, lacking, aside = null) {
  let queue = Promise.resolve()
  let side = Promise.resolve()
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
      let args
      try {
        args = body ? JSON.parse(body) : {}
      } catch {
        return reply(400, { error: 'the body is not JSON' })
      }
      const absent = lacking(tool, args)
      if (absent.length) return reply(400, { error: `${name} needs ${absent.join(', ')}` })
      const answer = async (run) => {
        try {
          reply(200, await run())
        } catch (error) {
          reply(422, { error: error.message })
        }
      }
      if (aside && slow(name, args)) {
        side = Promise.all([side, queue]).then(() => answer(() => aside.run(name, args)))
        return
      }
      const before = writes(name, args) ? Promise.all([queue, side]) : queue
      queue = before.then(() => answer(() => tool.run(args)))
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
      const lane = worker()
      server.middlewares.use(bridge(TOOLS, lacking, lane))
      server.httpServer?.on('close', () => {
        lane.close()
        closeGames()
      })
    },
  }
}
