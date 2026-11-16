// Pure chapter edits of the arrange workspace (games/PACKAGES.md 5): the chapters' order, a new chapter, and levels
// imported into one with what they need.
import { importLevelOrder } from '../engine/objects.js'
/** The course with chapter `e` moved by `by` places (-1 earlier, 1 later). */
export function moveChapter(eras, e, by) {
  const to = e + by
  if (to < 0 || to >= eras.length) return eras
  const next = [...eras]
  const [era] = next.splice(e, 1)
  next.splice(to, 0, era)
  return next
}

/** A new chapter shaped like `like` (its own fields, no levels, no links, no map), with an id no chapter has. */
export function blankChapter(eras, like, blankText) {
  const ids = eras.map((era) => era.id)
  const numbered = ids.every((id) => typeof id === 'number')
  let id = numbered ? Math.max(0, ...ids) + 1 : `chapter-${eras.length + 1}`
  for (let k = eras.length + 2; ids.includes(id); k++) id = numbered ? id + 1 : `chapter-${k}`
  const { levels: _, rows: __, id: ___, ...fields } = like
  return { id, ...blankText(fields), levels: [] }
}

/**
 * A chapter's levels with `picked` imported (a level, or `#tag`: its levels) by the kernel's import order: with the
 * package prerequisites they need, ordered by them and the package's display order; those a chapter already places
 * (`placed`) stay where they are.
 */
export function importLevels(content, levels, picked, placed = new Set()) {
  const have = new Set([...levels, ...placed])
  return [...levels, ...importLevelOrder(content, [picked]).filter((id) => !have.has(id))]
}

/** The first prerequisite a chapter order `levels` breaks, as the check says it, or null. */
export function chapterOrderRefusal(content, levels) {
  const at = new Map(levels.map((id, k) => [id, k]))
  const edge = (content?.relationEdges?.requires ?? []).find((e) => !e.game && at.has(e.from) && at.has(e.to) && at.get(e.from) >= at.get(e.to))
  return edge ? `${edge.from} must precede ${edge.to} in chapter order` : null
}
