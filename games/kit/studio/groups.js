// The package's level groups (../engine/groups.js) as the package workspace reads them: which group holds a level, the
// tree of groups (each group's levels in its order, then the levels in no group) with the places a dragged level can
// go, and the operations that put levels there.
import { sameJson } from '../engine/json-value.js'

/** The group holding `level`, or null. */
export const groupOf = (content, level) => Object.entries(content.groups ?? {}).find(([, group]) => group.levels.some(({ id }) => id === level))?.[0] ?? null

/**
 * The tree's sections (`order`: the levels in play order, for those in no group): [{ key, group (null: the levels in no group), levels: [{ id, optional?, skippable? }], slots }],
 * slots[k] the place before the k-th level and at the end ({ group, at: 0 } / { group, after } / { out: true }; null: none).
 */
export function groupTree(content, order = []) {
  const grouped = new Set()
  const sections = Object.entries(content.groups ?? {}).map(([id, group]) => {
    for (const { id: level } of group.levels) grouped.add(level)
    return { key: id, group: id, levels: group.levels, slots: [{ group: id, at: 0 }, ...group.levels.map(({ id: level }) => ({ group: id, after: level }))] }
  })
  // The levels in no group, in the order the game plays them.
  const rank = new Map(order.map((id, k) => [id, k]))
  const loose = content.levels.filter(({ id }) => !grouped.has(id)).map(({ id }) => ({ id }))
    .sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity))
  sections.push({ key: '', group: null, levels: loose, slots: [{ out: true }, ...loose.map(() => null)] })
  return { sections }
}

/** Whether dropping `level` at `to` leaves it where it is. */
export function stays(tree, level, to) {
  if (to.after === level || to.before === level) return true
  return tree.sections.some(({ levels, slots }) => {
    const index = levels.findIndex(({ id }) => id === level)
    return index >= 0 && (sameJson(slots[index], to) || (to.out && slots[0]?.out))
  })
}

/** Levels put together at a place of the tree, in the order given: each group.place after the one before. */
export function groupMoves(levels, to) {
  if (to.out) return levels.map((level) => ({ op: 'group.place', level }))
  return levels.map((level, k) => ({ op: 'group.place', level, to: k === 0 ? to : { group: to.group, after: levels[k - 1] } }))
}
