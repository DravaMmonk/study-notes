/* global process */
// npm run check [-- <game id>…] — every game (or those named) against the rules every game follows (checks.js).
// --mutants adds, for each task of a circuit game, how many mutants of its answer the tests tell from it (mutate.js).
// The domain's checks of a level that has not changed are read from the game's kept checks (check-cache.js); --fresh
// runs them all.
import { GAMES } from '../../games.js'
import { checkGame } from './checks.js'
import { closeGames } from './games.mjs'
import { domainOf, readContent } from './content-node.js'
import { deepFreeze } from './content.js'
import { ALL_GAMES, knownGames } from './cli-args.js'
import { openGame } from './ops/workspace.js'
import { driftOf } from './ops/log.js'
import { checkCache } from './check-cache.js'

let problems = 0
const mutants = process.argv.includes('--mutants')
const fresh = process.argv.includes('--fresh')
const asked = process.argv.slice(2).filter((arg) => arg !== '--mutants' && arg !== '--fresh')
// One game whose domain throws is reported as such; the others are still checked.
for (const id of knownGames(asked.length ? asked : ALL_GAMES, 'npm run check [-- <game>… --mutants --fresh]')) {
  let lines
  let head = id
  try {
    // Read frozen: nothing that checks a game may write into its content.
    const content = deepFreeze(readContent(id))
    head = `${content.title.zh ?? content.title} (${id})`
    lines = await checkGame(content, { domain: await domainOf(content), listed: GAMES.find((game) => game.id === id).levels, mutants, cache: checkCache(id, { fresh }) })
    // Files changed outside the operation set since its log last says: noted, not failed (adopt takes them).
    const ws = openGame(id)
    const drift = driftOf(ws, ws.onDisk())
    if (drift.length) lines.push({ text: `OPEN log: changed outside the operation set: ${drift.join(', ')} (npm run op -- ${id} adopt --why "…")` })
  } catch (error) {
    lines = [{ fail: true, text: `the check threw: ${error.stack}` }]
  }
  problems += lines.filter((l) => l.fail).length
  console.log(`\n${head}`)
  for (const line of lines) console.log(`  ${line.fail ? 'FAIL ' : ''}${line.text}`)
}

console.log(problems ? `\n${problems} problem(s)` : '\nall games ok')
await closeGames()
process.exit(problems ? 1 : 0)
