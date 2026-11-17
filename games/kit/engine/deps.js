/* global process */
// Render the dependency graph provided by installed object meanings.
import { pathToFileURL } from 'node:url'
import { contentSchemas } from './content.js'
import { meaningsOf } from './kind-meanings.js'
import { runtimeOf, readContent } from './resolver.js'
import { knownGames } from './cli-args.js'

/** A game's dependency graph from its content, as Mermaid or (`dot`) DOT text. */
export async function drawDeps(content, { dot: asDot = false, levels = false } = {}) {
  const meaning = meaningsOf(contentSchemas.get(content)).find(meaning => meaning.dependencyGraph)
  if (!meaning) throw new Error('the loaded object kinds do not provide a dependency graph')
  return meaning.dependencyGraph({ course: (await runtimeOf(content)).spec(content).course, dot: asDot, levels })
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  if (['lock', 'upgrade'].includes(args[0])) {
    const { lockTarget, upgradeTarget } = await import('./releases.js')
    const { contentTargets, contentRoot } = await import('./resolver.js')
    const [action, ...selectors] = args
    const positional = selectors.filter(arg => !arg.startsWith('--'))
    const [target] = contentTargets([positional[0]], contentRoot(), { package: selectors.includes('--package'), game: selectors.includes('--game') })
    console.log(JSON.stringify(action === 'lock' ? lockTarget(target) : upgradeTarget(target, positional[1]), null, 2))
  } else {
    const [game] = knownGames(args.filter((a) => !a.startsWith('--')).slice(0, 1), 'npm run deps -- <game> [--dot] [--levels]')
    console.log(await drawDeps(readContent(game), { dot: args.includes('--dot'), levels: args.includes('--levels') }))
  }
}
