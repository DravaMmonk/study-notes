// The game workspace's course edits (GameStudio.jsx), on the chapters as course.json writes them (`eras`, groups not
// expanded) and as pure functions, each giving the new chapters: an entry (a level, or a whole group: ../engine/groups.js)
// put in a chapter, taken out of the course, moved to another chapter; a chapter added, removed, moved; a chapter's map
// (rows) with a level moved to another place, an empty place put in or taken out. The studio sends the result as
// game.set operations.
import { groupLevels } from '../engine/groups.js'

/** An entry's name: a level's id, or a group's. */
export const entryKey = (entry) => entry.group ?? entry.id
const clone = (value) => structuredClone(value)

/** Every level a course places, by itself or in a whole group, and every group it places. */
export function placed(eras, groups) {
  const levels = new Set(), wholes = new Set()
  for (const era of eras) for (const entry of era.levels) {
    if (entry.group === undefined) levels.add(entry.id)
    else {
      wholes.add(entry.group)
      for (const id of groupLevels(groups[entry.group])) levels.add(id)
    }
  }
  return { levels, groups: wholes }
}

/** The levels an entry brings into its chapter. */
export const entryLevels = (entry, groups) => (entry.group === undefined ? [entry.id] : groupLevels(groups[entry.group]))

const dropRows = (era, ids) => {
  if (!era.rows) return
  const rows = era.rows.map((row) => row.filter((x) => !ids.includes(x))).filter((row) => row.some((x) => x !== null))
  if (rows.length) era.rows = rows
  else delete era.rows
}
const setLinks = (era, links) => {
  if (links.length) era.links = links
  else delete era.links
}

/** The course with `entry` put at the end of chapter `e`. */
export function addEntry(eras, e, entry) {
  const next = clone(eras)
  next[e].levels.push(entry)
  return next
}

/** The course without the entry named `key`: its links, and its levels on the map, go with it. */
export function removeEntry(eras, key, groups) {
  const next = clone(eras)
  for (const era of next) {
    const at = era.levels.findIndex((entry) => entryKey(entry) === key)
    if (at >= 0) dropRows(era, entryLevels(era.levels[at], groups))
    if (at >= 0) era.levels.splice(at, 1)
    setLinks(era, (era.links ?? []).filter(({ fromGame, from, to }) => (fromGame || from !== key) && to !== key))
  }
  return next
}

/** The course with the entry named `key` moved to the end of chapter `into`; the links into it go along, and it leaves the old chapter's map. */
export function moveEntry(eras, key, into, groups) {
  const from = eras.findIndex((era) => era.levels.some((entry) => entryKey(entry) === key))
  if (from < 0 || from === into) return eras
  const next = clone(eras)
  const at = next[from].levels.findIndex((entry) => entryKey(entry) === key)
  const [entry] = next[from].levels.splice(at, 1)
  dropRows(next[from], entryLevels(entry, groups))
  const incoming = (next[from].links ?? []).filter((link) => link.to === key)
  setLinks(next[from], (next[from].links ?? []).filter((link) => link.to !== key))
  next[into].levels.push(entry)
  setLinks(next[into], [...(next[into].links ?? []), ...incoming])
  return next
}

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
  const { levels: _, links: __, rows: ___, id: ____, ...fields } = like
  return { id, ...blankText(fields), levels: [] }
}

/**
 * A chapter's map, `rows` as the map lays it out now (../course.js mapRows), with level `id` moved: `to` is
 * { row, slot } (into row `row` before place `slot`; slot past the end: at its end) or { row, new: true } (a row of its
 * own put in before row `row`). Rows left without a level go; a row holds at most three places.
 */
export function moveOnMap(rows, id, to) {
  const next = rows.map((row) => [...row])
  const from = next.findIndex((row) => row.includes(id))
  const at = from >= 0 ? next[from].indexOf(id) : -1
  if (from >= 0) next[from].splice(at, 1, undefined)
  if (to.new) next.splice(to.row, 0, [id])
  else {
    const row = next[to.row]
    if (!row || (row.filter((x) => x !== undefined).length >= 3 && to.row !== from)) return rows
    row.splice(Math.min(to.slot, row.length), 0, id)
  }
  return tidy(next.map((row) => row.filter((x) => x !== undefined)))
}

/** The map with an empty place added at the end of row `row`, or the empty place `slot` of it taken away. */
export function emptyPlace(rows, row, slot = null) {
  const next = rows.map((r) => [...r])
  if (slot === null) { if (next[row].length < 3) next[row].push(null) }
  else if (next[row][slot] === null) next[row].splice(slot, 1)
  return tidy(next)
}

const tidy = (rows) => rows.filter((row) => row.some((x) => x !== null))
