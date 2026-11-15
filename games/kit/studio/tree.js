// Sidebar order and reorder slots share the chapter's numbered level list.
import { sameJson } from '../engine/json-value.js'

export function courseTree(eras) {
  return {
    eras: eras.map((era, at) => ({
      era, at,
      slots: [{ era: era.id, at: 0 }, ...era.levels.map(({ id }) => ({ after: id }))],
    })),
  }
}

export function stays(tree, level, to) {
  if (to.after === level || to.before === level) return true
  return tree.eras.some(({ era, slots }) => {
    const index = era.levels.findIndex(({ id }) => id === level)
    return index >= 0 && sameJson(slots[index], to)
  })
}

export function courseGroups(order, entries = []) {
  const membership = new Map(entries.flatMap((group, i) => group.levels.map((id) => [id, i])))
  const groups = entries.map(({ id, title, code }) => ({ id, title, code, levels: [] }))
  const loose = []
  for (const id of order) (groups[membership.get(id)]?.levels ?? loose).push(id)
  return [...groups.filter((group) => group.levels.length), ...(loose.length ? [{ levels: loose }] : [])]
}
