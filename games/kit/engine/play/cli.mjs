/* global process */
// npm run play -- <game> [level] [options] — play a game blind (games/DESIGN.md 6.6), one command a step, the session
// kept in games/<game>/playtests/<session>.json between commands:
//
//   (no action)            print the level played now (or `level`, when it is open): what the player sees of it
//   --attempt <file | ->   try a board (blueprint text, or the domain's own answer) from a file or stdin
//   --hint                 open the next hint
//   --explain <text>       after a pass: what you worked out on that level, in the field's terms
//   --give-up              give the level up and move on
//   --status               where the session stands
//   --usage k=v,…          note what the whole session cost (tokens, seconds, cost), as the runner knows it
//
//   --session <name>       the session (default: cli)
//   a new session also takes --lang en|zh (default en), --attempts N (a level's limit, default 8), --levels N (how many
//   levels it plays), --player kind[:model] (llm, human, script)
import { readFileSync } from 'node:fs'
import { closeGames } from '../games.mjs'
import { openSession } from './node.mjs'

const args = process.argv.slice(2)
const flags = {}
const plain = []
for (let k = 0; k < args.length; k++) {
  const a = args[k]
  if (!a.startsWith('--')) { plain.push(a); continue }
  const key = a.slice(2)
  const takes = ['session', 'lang', 'attempts', 'levels', 'player', 'attempt', 'usage', 'explain'].includes(key)
  flags[key] = takes ? args[++k] : true
}
const [game, level = null] = plain
if (!game) {
  console.error('usage: npm run play -- <game> [level] [--session name] [--attempt file|-] [--explain text] [--hint] [--give-up] [--status]')
  process.exit(2)
}

const [kind, model] = String(flags.player ?? 'llm').split(':')
const { play, record, save } = await openSession(game, flags.session ?? 'cli', {
  lang: flags.lang,
  attempts: flags.attempts ? Number(flags.attempts) : undefined,
  levels: flags.levels ? Number(flags.levels) : undefined,
  player: { kind, ...(model ? { model } : {}) },
})

let out
if (flags.attempt) out = play.attempt(flags.attempt === '-' ? readFileSync(0, 'utf8') : readFileSync(flags.attempt, 'utf8'))
else if (flags.explain) out = play.explain(flags.explain)
else if (flags.hint) out = play.hint()
else if (flags['give-up']) out = play.giveUp()
else if (flags.status) out = play.status()
else if (flags.usage) {
  record.usage = Object.fromEntries(String(flags.usage).split(',').map((kv) => kv.split('=')).map(([k, v]) => [k, Number(v)]))
  out = play.status()
} else out = play.view(level)
save()
console.log(out.text)
await closeGames()
process.exit(0)
