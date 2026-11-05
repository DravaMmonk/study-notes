// npm run publish:content [-- <game>…] — each game's content written beside its built page (dist-games/<id>/
// content.json), checked first as npm run check checks it: a game whose content fails is not published. The pages
// read their content when they open (./main.jsx), so this alone puts new content live; code needs a build.
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { GAMES } from '../../games.js'
import { checkGame } from '../engine/checks.js'
import { closeGames } from '../engine/games.mjs'
import { domainOf, readContent } from '../engine/content-node.js'
import { ALL_GAMES, knownGames } from '../engine/cli-args.js'

const DIST = resolve(import.meta.dirname, '../../../trace-viewer/dist-games')
const asked = process.argv.slice(2)
let refused = 0
for (const id of knownGames(asked.length ? asked : ALL_GAMES, 'npm run publish:content [-- <game>…]')) {
  const page = resolve(DIST, id)
  if (!existsSync(resolve(page, 'index.html'))) {
    console.log(`${id}: no built page (npm run build:games first)`)
    refused += 1
    continue
  }
  const content = readContent(id)
  const failed = (await checkGame(content, { domain: await domainOf(content), listed: GAMES.find((g) => g.id === id).levels })).filter((l) => l.fail)
  if (failed.length) {
    console.log(`${id}: not published, ${failed.length} problem(s) (npm run check -- ${id})`)
    refused += 1
    continue
  }
  writeFileSync(resolve(page, 'content.json'), JSON.stringify(content))
  console.log(`${id}: published`)
}
await closeGames()
process.exit(refused ? 1 : 0)
