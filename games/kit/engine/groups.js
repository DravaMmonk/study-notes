// Level groups (games/DESIGN.md 2.9). A package's levels are designed a group at a time: a group is a set of levels that
// teaches one knowledge point thoroughly (or gathers simple ones, as "the basics"), with a recommended arrangement of
// its own: its levels in order and the prerequisites between them. That arrangement is no game's course. A game's
// course (games/<id>/course.json) places a whole group in a chapter as one entry, `{ group }`, which brings its
// levels and its links in as they are, and links to and from the group as a whole; or it places single levels, the
// group's ones included, and arranges them itself.
//
//   packages/<package>/groups/<id>.json   { title, levels: [{ id, optional?, skippable? }], links?: [{ from, to, required? }] }
//
// expandEras turns a course's chapters into the ones the game plays: every group entry becomes its levels, the
// group's links join the chapter's, and a link to a group goes to each of its entry levels (no prerequisite inside the
// group), one from a group from each of its exit levels (nothing inside the group comes after it; the required ones
// when the group has any).
import { S } from './schema.js'
import { T as t } from '../shell/i18n.js'

export const GROUP_ID = '^(?:@?[a-z][a-z0-9-]*/)?[a-z][a-z0-9-]*$'

/** A group's file: its name, its levels in order and the prerequisites between them. */
export const GROUP = S.obj({
  title: S.text({ about: t('这一组教的知识点', 'the knowledge point the group teaches') }),
  levels: S.list(S.obj({ id: S.level(), optional: S.opt(S.bool()), skippable: S.opt(S.bool()) })),
  links: S.opt(S.list(S.obj({ from: S.level(), to: S.level(), required: S.opt(S.bool()) }))),
})

export const groupLevels = (group) => (group?.levels ?? []).map(({ id }) => id)

/** The levels of a group that nothing inside it comes before (entries), and those nothing inside it comes after (exits). */
export function groupEnds(group) {
  const ids = groupLevels(group)
  const links = group.links ?? []
  const entries = ids.filter((id) => !links.some(({ to, from }) => to === id && ids.includes(from)))
  const sinks = ids.filter((id) => !links.some(({ from, to }) => from === id && ids.includes(to)))
  const optional = new Set((group.levels ?? []).filter((entry) => entry.optional).map(({ id }) => id))
  const required = sinks.filter((id) => !optional.has(id))
  return { entries, exits: required.length ? required : sinks }
}

const endpoint = (groups, id, side) => (Object.hasOwn(groups, id) ? groupEnds(groups[id])[side] : [id])

/** The chapters a course plays: group entries in place of their levels, links to and from groups in place of the level links they stand for. */
export function expandEras(eras, groups = {}) {
  return eras.map((era) => {
    const levels = []
    const links = []
    for (const entry of era.levels ?? []) {
      if (entry.group === undefined) { levels.push(entry); continue }
      const group = groups[entry.group]
      if (!group) continue
      for (const level of group.levels) levels.push({ ...level, ...(entry.optional && { optional: true }) })
      links.push(...(group.links ?? []))
    }
    for (const link of era.links ?? []) {
      if (link.fromGame) { links.push(link); continue }
      const { from, to, ...rest } = link
      for (const f of endpoint(groups, from, 'exits')) for (const t of endpoint(groups, to, 'entries')) links.push({ ...rest, from: f, to: t })
    }
    const seen = new Set()
    const unique = links.filter((link) => {
      const key = JSON.stringify([link.fromGame, link.from, link.to])
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    const { links: _, ...rest } = era
    return { ...rest, levels, ...(unique.length && { links: unique }) }
  })
}

/** Where a course places each group: group id → the index of its chapter. */
export function groupPlaces(eras) {
  const places = new Map()
  for (const [index, era] of eras.entries()) for (const entry of era.levels ?? []) if (entry.group !== undefined && !places.has(entry.group)) places.set(entry.group, index)
  return places
}

/** What is wrong with a package's groups, as [{ at, says }]: a level in two groups, a group named as a level, a link leaving its group, a loop. */
export function groupProblems(groups, levelIds) {
  const out = []
  const owner = new Map()
  for (const [id, group] of Object.entries(groups)) {
    const at = `groups/${id}.json`
    if (!new RegExp(GROUP_ID).test(id)) out.push({ at, says: `a group id is lowercase letters, digits and dashes: ${id}` })
    const inside = new Set()
    for (const [k, { id: level }] of (group.levels ?? []).entries()) {
      if (inside.has(level)) out.push({ at: `${at}.levels[${k}]`, says: `${level} is in the group twice` })
      else if (owner.has(level)) out.push({ at: `${at}.levels[${k}]`, says: `${level} is in the group ${owner.get(level)} already` })
      inside.add(level)
      if (!owner.has(level)) owner.set(level, id)
    }
    for (const [k, { from, to }] of (group.links ?? []).entries()) {
      if (!inside.has(from) || !inside.has(to)) out.push({ at: `${at}.links[${k}]`, says: 'a group links only its own levels' })
    }
    const requires = new Map([...inside].map((level) => [level, (group.links ?? []).filter((link) => link.to === level).map(({ from }) => from)]))
    const done = new Set(), active = new Set()
    const visit = (level) => {
      if (active.has(level)) return true
      if (done.has(level)) return false
      active.add(level)
      const loop = (requires.get(level) ?? []).some(visit)
      active.delete(level)
      done.add(level)
      return loop
    }
    if ([...inside].some(visit)) out.push({ at, says: 'the group\'s links go round in a loop' })
  }
  return out
}
