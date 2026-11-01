/* global process */
// npm run op -- … — the operation set (operations.js) from the command line, through a changeset (changeset.js):
//
//   npm run op -- list                                     the operations and their arguments
//   npm run op -- <game> <op> key=value…                   one operation (a value is read as JSON when it is JSON)
//   npm run op -- <game> --file changeset.json             a changeset { why?, ops: [{ op, …args }] }
//   npm run op -- <game> undo                              undo the last change in the game's change log
//   npm run op -- <game> log                               the change log
//
// --dry-run prints the diff and the save migration and writes nothing; --why "…" says why (a save step keeps it where
// the game's schema has room for it); --json prints the result as JSON. A changeset that fails any check is never
// written, and the command exits 1. GAMES_ROOT points it at a copy of the games folder.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { OPERATIONS } from './operations.js'
import { openGame } from './workspace.js'
import { readLog, runChangeset, undo } from './changeset.js'
import { knownGames } from '../cli-args.js'
import { GAMES_DIR } from '../content-node.js'
import { closeGames } from '../games.mjs'

const USAGE = 'npm run op -- <game> (<op> key=value… | --file changeset.json | undo | log) [--dry-run] [--why "…"] [--json]  ·  npm run op -- list'
const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
const words = argv.filter((a, k) => !a.startsWith('--') && !['--file', '--why'].includes(argv[k - 1]))
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
  for (const e of readLog(ws)) console.log(`#${e.seq} ${e.at}${e.undoes ? ` (undoes #${e.undoes})` : ''}  ${e.why ?? ''}\n  ${e.ops.map((o) => o.op).join(', ')}  →  ${e.files.join(', ')}${e.step ? `  ·  save version ${e.step.version}` : ''}`)
  process.exit(0)
}
// A changeset file is read from where the command was started (npm sets INIT_CWD there), not from trace-viewer.
const changeset = option('--file') ? JSON.parse(readFileSync(resolve(process.env.INIT_CWD ?? '.', option('--file')), 'utf8')) : what && what !== 'undo' ? { ops: [{ op: what, ...Object.fromEntries(rest.map((kv) => [kv.slice(0, kv.indexOf('=')), value(kv.slice(kv.indexOf('=') + 1))])) }] } : null
if (!changeset && what !== 'undo') {
  console.error(`usage: ${USAGE}`)
  process.exit(1)
}
if (option('--why') && changeset) changeset.why = option('--why')
const options = { write: !flag('--dry-run') }
const result = what === 'undo' ? await undo(ws, options) : await runChangeset(ws, changeset, options)
await closeGames()

if (flag('--json')) console.log(JSON.stringify(result, null, 2))
else {
  for (const line of result.says) console.log(line)
  for (const note of result.notes) console.log(`note: ${note}`)
  for (const p of result.problems) console.log(`FAIL ${p}`)
  console.log(`save migration: ${result.step ? JSON.stringify(result.step) : 'none'}`)
  if (flag('--dry-run') || !result.ok) console.log(result.diff)
  console.log(result.ok ? (options.write ? `written: ${result.files.join(', ') || 'nothing changed'}` : 'dry run: nothing written') : 'refused: nothing written')
}
process.exit(result.ok ? 0 : 1)
