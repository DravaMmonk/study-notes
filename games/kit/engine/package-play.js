// A single-level runtime shell. It is never authored, persisted or checked as a course.
import { contentRoots, contentSchemas } from './content.js'
import { meaningsOf } from './kind-meanings.js'
import { layout } from '../course.js'
import { relationOrder } from './objects.js'

/** Open one qualified level from assembled package content, retaining declarations as read-only support. */
export function packageLevel(content, level) {
  if (!content.packageTarget) throw new Error('single-level play needs package content')
  const selected = content.levels.find(({ id }) => id === level)
  if (!selected) throw new Error(`${content.id} has no level ${level}`)
  const shell = {
    ...content, title: selected.title, levels: [selected], libraryLevels: content.levels,
    standalone: { level }, eras: [],
    ...Object.assign({}, ...meaningsOf(contentSchemas.get(content)).map(meaning => meaning.packageConfiguration?.({ content }))),
  }
  if (content.resolvedDependencies) Object.defineProperty(shell, 'resolvedDependencies', { value: content.resolvedDependencies })
  if (contentRoots.has(content)) contentRoots.set(shell, contentRoots.get(content))
  if (contentSchemas.has(content)) contentSchemas.set(shell, contentSchemas.get(content))
  return shell
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

/** Authoring order uses relations directly; it does not construct a route or unlock graph. */
export function packageLevelOrder(content) {
  const ids = content.levels.map(level => level.id)
  const edges = content.relationEdges
  return relationOrder(ids, (edges?.requires ?? []).filter(edge => !edge.game))
}
