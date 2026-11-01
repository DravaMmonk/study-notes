/* global process */
// npm run check [-- <game id>…] — every game (or those named) against the rules every game follows (checks.js).
import { GAMES } from '../../games.js'
import { checkGame } from './checks.js'
import { closeGames } from './games.mjs'
import { domainOf, readContent, readPlaytests } from './content-node.js'
import { ALL_GAMES, knownGames } from './cli-args.js'

let problems = 0
const asked = process.argv.slice(2)
for (const id of knownGames(asked.length ? asked : ALL_GAMES, 'npm run check [-- <game>…]')) {
  const content = readContent(id)
  const lines = await checkGame(content, { domain: await domainOf(content), listed: GAMES.find((game) => game.id === id).levels, playtests: readPlaytests(id) })
  problems += lines.filter((l) => l.fail).length
  console.log(`\n${content.title.zh} ${content.title.en}`)
  for (const line of lines) console.log(`  ${line.fail ? 'FAIL ' : ''}${line.text}`)
}

console.log(problems ? `\n${problems} problem(s)` : '\nall games ok')
await closeGames()
process.exit(problems ? 1 : 0)
