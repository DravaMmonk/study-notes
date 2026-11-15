// The pieces of a game as the studio's parts list groups them (games/DESIGN.md 6.7): one group a tray of game.json
// (`trays`, in its order; a piece in several goes in the first), then one of the pieces no tray holds; in a group, the
// order the course gives them in. A game without trays has one group, in that order. Domain-free: only the content
// and where the course first gives each piece.
import { readItem } from '../course.js'

/**
 * [{ tray (null: none), types: [type] }]. `types` the pieces of pieces.json; `trays` game.json's; `at(type)` the level
 * that first gives a piece (null: the course does not); `order` the levels in play order; `primitives` game.json's,
 * at hand from the start.
 */
export function pieceGroups(types, { trays = null, at = () => null, order = [], primitives = [] } = {}) {
  const rank = (type) => (primitives.includes(type) ? -1 : at(type) === null || !order.includes(at(type)) ? order.length : order.indexOf(at(type)))
  const sorted = (list) => list.map((type, k) => [type, k]).sort(([a, j], [b, k]) => rank(a) - rank(b) || j - k).map(([type]) => type)
  if (!trays || !Object.keys(trays).length) return [{ tray: null, types: sorted(types) }]
  const placed = new Set()
  const groups = Object.entries(trays).map(([tray, items]) => {
    const own = [...new Set(items.map((item) => readItem(item).part))].filter((type) => types.includes(type) && !placed.has(type))
    own.forEach((type) => placed.add(type))
    return { tray, types: sorted(own) }
  })
  const rest = types.filter((type) => !placed.has(type))
  return rest.length ? [...groups, { tray: null, types: sorted(rest) }] : groups
}
