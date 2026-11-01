/* global process */
// The games a command line names, checked the same way by every command (check, deps, op): each a game on the hub's
// list (../../games.js); an unknown or missing one stops the command with its usage and the known ids.
import { GAMES } from '../../games.js'

export const ALL_GAMES = GAMES.map((g) => g.id)

/** `ids` when every one is a known game (and there is at least one); otherwise the command stops. */
export function knownGames(ids, usage) {
  const bad = ids.find((id) => !ALL_GAMES.includes(id))
  if (ids.length && bad === undefined) return ids
  console.error(`${ids.length ? `no game ${bad}` : 'name a game'}\nusage: ${usage}\ngames: ${ALL_GAMES.join(', ')}`)
  process.exit(1)
}
