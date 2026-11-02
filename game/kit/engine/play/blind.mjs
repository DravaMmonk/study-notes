/* global process */
// npm run blind -- <game> <session> [levels] [attempts] [model] — one blind player (games/DESIGN.md 6.6): a fresh
// `claude -p` in an empty scratch directory whose only tool is Bash allowed to run ./play there (this game's CLI, the
// session fixed), so it sees the game only as a player does. It plays from the first level until the session's bound
// (levels; default 12) with `attempts` a level (default 6). Afterwards the run's tokens, time and cost go into the
// session's record, the transcript stays in the scratch directory, and every command the player ran is checked to be
// ./play. Needs the `claude` CLI, signed in.
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const [game, session, levels = '12', attempts = '6', model = 'claude-sonnet-5-5'] = process.argv.slice(2)
if (!game || !session) {
  console.error('usage: npm run blind -- <game> <session> [levels] [attempts] [model]')
  process.exit(2)
}
const viewer = process.cwd()
const dir = mkdtempSync(resolve(tmpdir(), `blind-${game}-${session}-`))
const cli = (args) => `cd ${JSON.stringify(viewer)} && exec node ../games/kit/engine/play/cli.mjs ${game} --session ${session} --levels ${levels} --attempts ${attempts} --player llm:${model} ${args}`
writeFileSync(resolve(dir, 'play'), `#!/bin/sh\n${cli('"$@"')}\n`)
chmodSync(resolve(dir, 'play'), 0o755)

const PROMPT = `You are playing a puzzle game blind, as a new player would. The game is a "Turing Complete"-style learning game: each level gives you a task, an introduction, a tray of parts and some tests, and you build an answer (usually a circuit board written as text).

Your ONLY way to see and play the game is the command ./play in the current directory:
  ./play                         show the level you are on now (read it carefully: intro, task, parts, tests, how to write the answer)
  ./play --attempt - <<'END'     submit an answer (the lines up to END); the game tells you what passed or failed
  ...your answer lines...
  END
  ./play --explain "…"           after passing a level: what you worked out on it, in the field's own terms
  ./play --hint                  open the next hint of this level (use it when you are stuck; hints are counted)
  ./play --give-up               give the level up and go on to the next one
  ./play --status                how the session stands

Rules: do not try to read any file, source code, level data, or answers; do not run any command other than ./play (others are blocked). Play from the first level in order. On each level, think about the task, then attempt; read the feedback and try again. A level has at most ${attempts} attempts; after that the game moves on by itself. Ask for a hint only when you are genuinely stuck. Each time a level is passed, say what you worked out on it with ./play --explain "…": one or two sentences in the field's own terms, what you now understand, not what you wired. Keep going until ./play says the session is over (it will end after ${levels} levels). Then reply with a short note: which levels were hard and why, and anything in the game's words that confused you.`

const start = Date.now()
const run = spawnSync('claude', ['-p', PROMPT, '--model', model, '--tools', 'Bash', '--allowedTools', 'Bash(./play:*)', '--permission-mode', 'dontAsk', '--strict-mcp-config', '--setting-sources', '', '--no-session-persistence', '--max-turns', '400', '--output-format', 'stream-json', '--verbose'], { cwd: dir, encoding: 'utf8', maxBuffer: 1 << 28 })
writeFileSync(resolve(dir, 'transcript.jsonl'), run.stdout ?? '')
const events = (run.stdout ?? '').split('\n').filter(Boolean).flatMap((line) => { try { return [JSON.parse(line)] } catch { return [] } })
const result = events.find((e) => e.type === 'result') ?? {}
const usage = result.usage ?? {}
const tokens = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'].reduce((n, k) => n + (usage[k] ?? 0), 0)
spawnSync('sh', ['-c', cli(`--usage tokens=${tokens},seconds=${Math.round((Date.now() - start) / 1000)},cost=${result.total_cost_usd ?? 0}`)], { encoding: 'utf8' })
// What the player ran: every Bash command must start with ./play.
const commands = events.filter((e) => e.type === 'assistant').flatMap((e) => e.message.content.filter((c) => c.type === 'tool_use').map((c) => c.input?.command ?? `${c.name} ${JSON.stringify(c.input)}`))
const strays = commands.filter((c) => !c.trim().startsWith('./play'))
console.log(`${game} ${session}: ${commands.length} commands, ${strays.length} not ./play; ${tokens} tokens; transcript ${resolve(dir, 'transcript.jsonl')}`)
for (const c of strays) console.log(`  not ./play: ${c.slice(0, 120)}`)
console.log(result.result ?? '')
