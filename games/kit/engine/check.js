/* global process */
// npm run check [-- <game id>…] — every game (or those named) against the rules every game follows (checks.js).
import { GAMES } from '../../games.js'
import { checkGame } from './checks.js'
import { closeGames } from './games.mjs'
import { domainOf, readContent } from './content-node.js'
import { ALL_GAMES, knownGames } from './cli-args.js'
import { openGame } from './ops/workspace.js'
import { driftOf } from './ops/log.js'

let problems = 0
const asked = process.argv.slice(2)
// One game whose domain throws is reported as such; the others are still checked.
for (const id of knownGames(asked.length ? asked : ALL_GAMES, 'npm run check [-- <game>…]')) {
  let lines
  let head = id
  try {
    const content = readContent(id)
    head = `${content.title.zh} ${content.title.en}`
    lines = await checkGame(content, { domain: await domainOf(content), listed: GAMES.find((game) => game.id === id).levels })
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
