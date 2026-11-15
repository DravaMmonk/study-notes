// The same route slots are used by the sidebar tree and the course arrangement tab.
import { sameJson } from '../engine/json-value.js'

const slotsFor = (levels) => [{ before: levels[0] }, ...levels.map((id) => ({ after: id }))]

export function courseTree(eras) {
  return {
    eras: eras.map((era, at) => ({
      era, at,
      items: era.path.map((item) => typeof item === 'string'
        ? { level: item }
        : { parallel: item.parallel.map((levels) => ({ levels, slots: slotsFor(levels) })) }),
      slots: [{ era: era.id, on: 'path', at: 0 }, ...era.path.map((item) => ({ after: typeof item === 'string' ? item : item.parallel.at(-1).at(-1), on: 'path' }))],
      branches: (era.branches ?? []).map((branch) => ({ ...branch, slots: slotsFor(branch.levels) })),
    })),
  }
}

/** Whether dropping a level at this slot leaves it where it is. */
export function stays(tree, level, to) {
  if (to.after === level || to.before === level) return true
  for (const era of tree.eras) {
    const k = era.items.findIndex((item) => item.level === level)
    if (k >= 0 && sameJson(era.slots[k], to)) return true
    const lanes = [...era.items.flatMap((item) => item.parallel ?? []), ...era.branches]
    for (const { levels, slots } of lanes) {
      const i = levels.indexOf(level)
      if (i >= 0 && sameJson(slots[i], to)) return true
    }
  }
  return false
}
