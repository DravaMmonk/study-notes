// A single-level runtime shell. It is never authored, persisted or checked as a course.
import { layout, readItem } from '../course.js'
import { relationOrder } from './objects.js'

/** Open one qualified level from assembled package content, retaining declarations as read-only support. */
export function packageLevel(content, level) {
  if (!content.packageTarget) throw new Error('single-level play needs package content')
  const selected = content.levels.find(({ id }) => id === level)
  if (!selected) throw new Error(`${content.id} has no level ${level}`)
  return {
    ...content, title: selected.title, levels: [selected], libraryLevels: content.levels,
    standalone: { level }, eras: [], primitives: Object.keys(content.registries.piece),
    words: Object.keys(content.registries.wordset ?? {}),
    ...Object.fromEntries(['power', 'box'].flatMap(kind => {
      const name = Object.keys(content.registries[kind] ?? {}).sort()[0]
      return name ? [[kind, name]] : []
    })),
  }
}

/** No chapters, prerequisites or progress: only a task-addressable work reader plan. */
export function standalonePlan(content) {
  const plan = layout([])
  for (const { id } of content.levels) {
    plan.order.push(id)
    plan.place.set(id, {})
    plan.requires.set(id, [])
    plan.required.set(id, [])
  }
  return plan
}

/** Omitted trays mean all pieces, even when the package happens to declare only one tray. */
export function standaloneItems(content, at) {
  const level = content.levels.find(({ id }) => id === at.id)
  const named = level?.tasks?.[at.task]?.tray ?? level?.tray
  if (!named) return Object.keys(content.registries.piece)
  return [...new Set([named].flat().flatMap(name => (content.trays[name]?.items ?? [])
    .flatMap(item => typeof item === 'string' ? [item] : item.items)))]
}

export const standalonePieces = (content, at) => [...new Set(standaloneItems(content, at).map(item => readItem(item).part))]

/** Authoring order uses relations directly; it does not construct a route or unlock graph. */
export function packageLevelOrder(content) {
  const ids = content.levels.map(level => level.id)
  const edges = content.relationEdges
  return relationOrder(ids, [...(edges?.order ?? []), ...(edges?.requires ?? []).filter(edge => !edge.game)])
}
