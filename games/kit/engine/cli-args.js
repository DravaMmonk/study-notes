/* global process */
// Command targets come from the content workspace resolver. Unknown or missing
// selections stop the command with its usage and the installed game ids.
import { contentTargets } from './resolver.js'

export const ALL_GAMES = contentTargets([], undefined, { game: true }).map(game => game.id)

/** `ids` when every one is a known game (and there is at least one); otherwise the command stops. */
export function knownGames(ids, usage) {
  const bad = ids.find((id) => !ALL_GAMES.includes(id))
  if (ids.length && bad === undefined) return ids
  console.error(`${ids.length ? `no game ${bad}` : 'name a game'}\nusage: ${usage}\ngames: ${ALL_GAMES.join(', ')}`)
  process.exit(1)
}
