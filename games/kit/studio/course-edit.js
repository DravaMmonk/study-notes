// Pure chapter edits of the arrange workspace (games/MODULES.md 5.3.1): a chapter is a game-layer object
// (`games/<game>/chapters/<name>.json`, full name `@<game>/<name>`) with its `levels` list and route map `rows`; the
// game's `chapters` list orders them. The chapters' order, a new chapter, and levels imported into one with what they need.
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

/** A chapter's short name, the one its operations take: `paper` for `@qed/paper`. */
export const chapterName = (full) => String(full).slice(String(full).indexOf('/') + 1)

/** The operation that sets a field of chapter `full`. */
export const chapterSet = (full, path, value) => ({ op: 'chapter.set', chapter: chapterName(full), path, value })

/** The operation that takes a field out of chapter `chapter` (as the course lists it: { id, …fields }). */
export function chapterUnset(chapter, key) {
  const { id, [key]: _, ...data } = chapter
  return { op: 'chapter.put', chapter: chapterName(id), data }
}

/** The game's chapter order written: their full names. */
export const chaptersOrder = (chapters) => ({ op: 'game.set', path: ['chapters'], value: chapters.map((chapter) => chapter.id) })

/** A free short name for a new chapter of game `game`: `chapter-<n>`. */
export function newChapterName(chapters) {
  const taken = new Set(chapters.map((chapter) => chapterName(chapter.id)))
  let k = chapters.length + 1
  while (taken.has(`chapter-${k}`)) k += 1
  return `chapter-${k}`
}
