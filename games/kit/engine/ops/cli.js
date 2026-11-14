/* global process */
// npm run op -- … — the operation set (operations.js) from the command line, through a changeset (changeset.js):
//
//   npm run op -- list                                     the operations and their arguments
//   npm run op -- <game> <op> key=value…                   one operation (a value is read as JSON when it is JSON)
//   npm run op -- <game> --file changeset.json             a changeset { why?, ops: [{ op, …args }] }
//   npm run op -- <game> undo                              undo the last change in the game's change log
//   npm run op -- <game> log                               the change log, and the files changed outside it
//   npm run op -- <game> adopt --why <text>                take the files as they are into the log
//
// --dry-run prints the diff and writes nothing; --fresh checks every level again (../check-cache.js); --why "…" says why (the change log keeps it); --json prints the result
// as JSON. A changeset that fails any check is never written, and the command exits 1. GAMES_ROOT points it at a copy
// of the games folder.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { OPERATIONS } from './operations.js'
import { openGame } from './workspace.js'
import { adopt, readLog, runChangeset, undo } from './changeset.js'
import { authorship, driftOf } from './log.js'
import { checkCache } from '../check-cache.js'
import { knownGames } from '../cli-args.js'
import { GAMES_DIR } from '../content-node.js'
import { closeGames } from '../games.mjs'

const USAGE = 'npm run op -- <game> (<op> key=value… | --file changeset.json | undo | log) [--dry-run] [--fresh] [--why "…"] [--json]  ·  npm run op -- list'
const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
const words = argv.filter((a, k) => !a.startsWith('--') && !['--file', '--why', '--by'].includes(argv[k - 1]))
const value = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

if (words[0] === 'list') {
  for (const [name, op] of Object.entries(OPERATIONS)) console.log(`${name}  ${op.about.en}\n  ${Object.entries(op.params.fields).map(([k, s]) => `${k}${s.optional ? '?' : ''}: ${s.type}`).join(', ')}`)
  process.exit(0)
}

const [game] = knownGames(words.slice(0, 1), USAGE)
const ws = openGame(game, process.env.GAMES_ROOT ?? GAMES_DIR)
const [what, ...rest] = words.slice(1)
if (what === 'log') {
  for (const e of readLog(ws)) console.log(`#${e.seq} ${e.at}${e.by ? ` ${e.by}` : ''}${e.undoes ? ` (undoes #${e.undoes})` : ''}  ${e.why ?? ''}\n  ${e.adopt ? 'adopted the files as they are' : e.ops.map((o) => o.op).join(', ')}  →  ${e.files.map((f) => f.file).join(', ')}`)
  for (const a of authorship(readLog(ws))) console.log(`${a.by}: ${a.changes} change(s), ${a.files} file(s)${a.by.startsWith('agent:') ? `, ${a.revised} later changed by a person` : ''}`)
  const drift = driftOf(ws, ws.onDisk())
  if (drift.length) console.log(`changed outside the log: ${drift.join(', ')} (adopt --why "…" takes them as they are)`)
  process.exit(0)
}
if (what === 'adopt') {
  if (!option('--why')) {
    console.error('usage: … <game> adopt --why "what changed outside the operation set"')
    process.exit(1)
  }
  console.log(`#${adopt(ws, option('--why'))}: the files of ${game} taken as they are`)
  process.exit(0)
}
// A changeset file is read from where the command was started (npm sets INIT_CWD there), not from trace-viewer.
const changeset = option('--file') ? JSON.parse(readFileSync(resolve(process.env.INIT_CWD ?? '.', option('--file')), 'utf8')) : what && what !== 'undo' ? { ops: [{ op: what, ...Object.fromEntries(rest.map((kv) => [kv.slice(0, kv.indexOf('=')), value(kv.slice(kv.indexOf('=') + 1))])) }] } : null
if (!changeset && what !== 'undo') {
  console.error(`usage: ${USAGE}`)
  process.exit(1)
}
if (option('--why') && changeset) changeset.why = option('--why')
// Who: --by, or what the caller's environment says (an agent's ./op, ../../pipeline/pipeline.mjs), or this command line.
if (changeset && !changeset.by) changeset.by = option('--by') ?? process.env.GAMES_BY ?? 'cli'
// The repository's games keep their checks between runs (../check-cache.js); --fresh, or a copy (GAMES_ROOT), checks afresh.
const options = { write: !flag('--dry-run'), cache: flag('--fresh') || process.env.GAMES_ROOT ? null : checkCache(game) }
const result = what === 'undo' ? await undo(ws, options) : await runChangeset(ws, changeset, options)
await closeGames()

if (flag('--json')) console.log(JSON.stringify(result, null, 2))
else {
  for (const line of result.says) console.log(line)
  for (const p of result.problems) console.log(`FAIL ${p}`)
  if (flag('--dry-run') || !result.ok) console.log(result.diff)
  console.log(result.ok ? (options.write ? `written: ${result.files.join(', ') || 'nothing changed'}` : 'dry run: nothing written') : 'refused: nothing written')
}
process.exit(result.ok ? 0 : 1)
