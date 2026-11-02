/* global process */
// The play interface as a small stdio JSON tool (games/DESIGN.md 6.6), for an agent or an MCP server to wrap: one
// request a line on stdin, one response a line on stdout. Run from trace-viewer: node ../games/kit/engine/play/tool.mjs.
//
//   { "id": 1, "tool": "play_view",    "args": { "game": "bus", "session": "s1", "level"?: "1-2" } }
//   { "id": 2, "tool": "play_attempt", "args": { "game": "bus", "session": "s1", "text": "bit <- line" } }
//   { "id": 3, "tool": "play_hint",    "args": { "game": "bus", "session": "s1" } }
//   { "id": 4, "tool": "play_explain", "args": { "game": "bus", "session": "s1", "text": "a register keeps…" } }
//   { "id": 4, "tool": "play_give_up", "args": { "game": "bus", "session": "s1" } }
//   { "id": 5, "tool": "play_status",  "args": { "game": "bus", "session": "s1" } }
//   → { "id": 1, "result": { "text": "…", "level"?, "task"?, "pass"? } }   or   { "id": 1, "error": "…" }
//
// A new session also takes "lang" (en | zh), "attempts", "levels" and "player" ({ kind, model? }) in its first
// request's args. Every request is saved to the session's record (games/<game>/playtests/<session>.json) before it
// answers. One process plays in one language (the shell's, chosen when the first game loads).
import { createInterface } from 'node:readline'
import { closeGames } from '../games.mjs'
import { openSession } from './node.mjs'

export const TOOLS = {
  play_view: (play, args) => play.view(args.level ?? null),
  play_attempt: (play, args) => play.attempt(String(args.text ?? '')),
  play_hint: (play) => play.hint(),
  play_explain: (play, args) => play.explain(String(args.text ?? '')),
  play_give_up: (play) => play.giveUp(),
  play_status: (play) => play.status(),
}

const lines = createInterface({ input: process.stdin })
for await (const line of lines) {
  if (!line.trim()) continue
  let id = null
  try {
    const request = JSON.parse(line)
    id = request.id ?? null
    const tool = TOOLS[request.tool]
    if (!tool) throw new Error(`no tool ${request.tool}; the tools are ${Object.keys(TOOLS).join(', ')}`)
    const { game, session, lang, attempts, levels, player } = request.args ?? {}
    if (!game || !session) throw new Error('args.game and args.session are required')
    const { play, save } = await openSession(game, session, { lang, attempts, levels, player })
    const result = tool(play, request.args)
    save()
    process.stdout.write(`${JSON.stringify({ id, result })}\n`)
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ id, error: String(error.message ?? error) })}\n`)
  }
}
await closeGames()
