/* global process */
// npm run mcp — the games' MCP server (Model Context Protocol, stdio transport): JSON-RPC 2.0, one message a line on
// stdin and stdout. It offers the tools of tools.js and nothing else. Anything else the kernel prints goes to stderr,
// so stdout carries only the protocol.
import { createInterface } from 'node:readline'
import { TOOLS } from './tools.js'
import { closeGames } from '../games.mjs'

const PROTOCOL = '2025-06-18'
const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05']
const out = process.stdout.write.bind(process.stdout)
for (const k of ['log', 'info', 'warn', 'debug']) console[k] = (...args) => console.error(...args)

const send = (message) => out(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`)
const typeOf = (spec) => spec.replace(/\?$/, '')
const inputSchema = (params) => ({
  type: 'object',
  properties: Object.fromEntries(Object.entries(params).map(([k, spec]) => [k, { type: typeOf(spec) }])),
  required: Object.entries(params).filter(([, spec]) => !spec.endsWith('?')).map(([k]) => k),
  additionalProperties: false,
})
const missing = (params, args) => Object.entries(params).filter(([k, spec]) => !spec.endsWith('?') && args?.[k] === undefined).map(([k]) => k)

const METHODS = {
  initialize: ({ protocolVersion }) => ({
    protocolVersion: SUPPORTED.includes(protocolVersion) ? protocolVersion : PROTOCOL,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: 'study-notes-games', version: '1.0.0' },
    instructions: 'Tools over the Turing-Complete-style games in games/: read a game’s vocabulary first; every change is a changeset (modify), checked as a whole and written only when it passes, with its save migration generated.',
  }),
  ping: () => ({}),
  'tools/list': () => ({ tools: Object.entries(TOOLS).map(([name, tool]) => ({ name, description: tool.about, inputSchema: inputSchema(tool.params) })) }),
  'tools/call': async ({ name, arguments: args = {} }) => {
    const tool = TOOLS[name]
    if (!tool) throw Object.assign(new Error(`no tool ${name}`), { code: -32602 })
    const lacking = missing(tool.params, args)
    if (lacking.length) return { isError: true, content: [{ type: 'text', text: `${name} needs ${lacking.join(', ')}` }] }
    try {
      const result = await tool.run(args)
      // A changeset refused or an audit that fails is still an answer: isError is for a call that could not run.
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error.message }] }
    }
  },
}

// Calls are answered one at a time, in order: a changeset sees the files the one before it wrote.
let queue = Promise.resolve()
async function handle(line) {
  let message
  try {
    message = JSON.parse(line)
  } catch {
    return send({ id: null, error: { code: -32700, message: 'parse error' } })
  }
  const { id, method, params } = message
  const notification = id === undefined
  const run = METHODS[method]
  if (!run) return notification ? undefined : send({ id, error: { code: -32601, message: `no method ${method}` } })
  try {
    const result = await run(params ?? {})
    if (!notification) send({ id, result })
  } catch (error) {
    if (!notification) send({ id, error: { code: error.code ?? -32603, message: error.message } })
  }
}

const lines = createInterface({ input: process.stdin })
lines.on('line', (line) => {
  if (line.trim()) queue = queue.then(() => handle(line))
})
lines.on('close', () => queue.then(closeGames).then(() => process.exit(0)))
