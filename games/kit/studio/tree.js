// The course tree as the studio edits it (games/DESIGN.md 6.6): a game's eras (game.json, ../course.js) read as the map
// lays them out — each era's main path (foundation, then practice) with its sets of parallel branches, its topics and
// its challenges — with a drop slot between every two levels, each slot the place (../engine/ops/place.js) a level
// dropped there moves to by level.move.
//
//   { eras: [{ era, at, paths: [{ path, items: [Item], slots }], topics: [{ topic, levels, slots }], challenges }] }
//   Item: { level } | { parallel: [{ branch, levels, slots }] }
//   slots: one more than the levels or items they sit between, slots[k] the place before the k-th (the last: the end)
import { PATHS } from '../engine/ops/place.js'

const levelsOfItem = (item) => (typeof item === 'string' ? [item] : item.parallel.flatMap((b) => b.levels))

/** The tree of `eras`. */
export function courseTree(eras) {
  return {
    eras: eras.map((era, at) => {
      const paths = PATHS.filter((path) => era[path] || path === 'foundation').map((path) => {
        const list = era[path] ?? []
        const items = list.map((item) => (typeof item === 'string'
          ? { level: item }
          : { parallel: item.parallel.map((b) => ({ branch: b, levels: b.levels, slots: listSlots(b.levels, { branch: b.id, era: era.id }) })) }))
        // On the main path: before an item is after the one before it (a set: after any of its levels), on the path.
        const slots = [{ era: era.id, path, at: 0 }, ...list.map((item) => ({ after: levelsOfItem(item).at(-1), on: 'path' }))]
        return { path, items, slots }
      })
      const topics = (era.topics ?? []).map((t) => ({ topic: t, levels: t.levels, slots: listSlots(t.levels, { topic: t.id, era: era.id }) }))
      const challenges = (era.challenges ?? []).map((c) => c.level)
      return { era, at, paths, topics, challenges, challengeSlot: { era: era.id, challenge: true } }
    }),
  }
}

/** The slots of a list of levels (a branch, a topic): its start, then after each level. */
const listSlots = (levels, start) => [{ ...start, at: 0 }, ...levels.map((id) => ({ after: id }))]

/** Whether dropping `level` at slot `to` leaves it where it is (the slot right before or after it). */
export function stays(tree, level, to) {
  if (to.after === level) return true
  for (const era of tree.eras) {
    for (const p of era.paths) {
      const k = p.items.findIndex((item) => item.level === level)
      if (k >= 0 && same(p.slots[k], to)) return true
      for (const item of p.items) for (const b of item.parallel ?? []) {
        const j = b.levels.indexOf(level)
        if (j >= 0 && same(b.slots[j], to)) return true
      }
    }
    for (const t of era.topics) {
      const j = t.levels.indexOf(level)
      if (j >= 0 && same(t.slots[j], to)) return true
    }
  }
  return false
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
