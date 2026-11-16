/* global process */
// npm run check [-- <game or package>…] checks games and unplayed packages by default.
// --package and --game disambiguate shared names. GAMES_ROOT selects an isolated content project.
// --mutants adds, for each task of a circuit game, how many mutants of its answer the tests tell from it (mutate.js).
// The domain's checks of a level that has not changed are read from the game's kept checks (check-cache.js); --fresh
// runs them all.
import { firstText } from './i18n.js'
import { checkGame } from './checks.js'
import { closeGames } from './games.mjs'
import { PROJECT_DIR, domainOf, readContent, readPackage, contentTargets } from './content-node.js'
import { deepFreeze } from './content.js'
import { hubCount, openGame, openPackage } from './ops/workspace.js'
import { driftOf } from './ops/log.js'
import { checkCache } from './check-cache.js'

const root = process.env.GAMES_ROOT ?? PROJECT_DIR
let problems = 0
const mutants = process.argv.includes('--mutants')
const fresh = process.argv.includes('--fresh')
const asked = process.argv.slice(2).filter((arg) => !['--mutants', '--fresh', '--package', '--game'].includes(arg))
// One game whose domain throws is reported as such; the others are still checked.
for (const { id, kind } of contentTargets(asked, root, { package: process.argv.includes('--package'), game: process.argv.includes('--game') })) {
  const packaged = kind === 'package'
  let lines
  let head = id
  try {
    // Read frozen: nothing that checks a game may write into its content.
    const ws = (packaged ? openPackage : openGame)(id, root)
    const content = deepFreeze((packaged ? readPackage : readContent)(id, root))
    head = `${firstText(content.title)} (${id})`
    lines = await checkGame(content, { domain: await domainOf(content), listed: packaged ? null : hubCount(ws.hub, id), mutants, cache: packaged || process.env.GAMES_ROOT ? null : checkCache(id, { fresh }), root })
    // Files changed outside the operation set since its log last says: noted, not failed (adopt takes them).
    const drift = driftOf(ws, ws.onDisk())
    if (drift.length) lines.push({ text: `OPEN log: changed outside the operation set: ${drift.join(', ')} (npm run op -- ${packaged ? `--package ${id}` : id} adopt --why "…")` })
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
