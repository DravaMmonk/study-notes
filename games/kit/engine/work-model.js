import { contentSchemas } from './content.js'
import { meaningsOf } from './kind-meanings.js'
import { courseLayout } from './course-dependencies.js'

/** Give heterogeneous readers one completed task/level progression model. */
export function readWorkSet(content, readers) {
  const meaning = meaningsOf(contentSchemas.get(content)).find(meaning => meaning.readWorks)
  if (meaning) return meaning.readWorks({ content, readers })
  const pending = readers.map(({ content, prepare }) => {
    const iterator = prepare(content)
    const first = iterator.next()
    if (first.done) throw new Error('a work reader must supply its facts before completing')
    return { iterator, facts: first.value }
  })
  const plan = courseLayout(content)
  const before = (first, second) => {
    const visit = (id, seen = new Set()) => {
      if (seen.has(id)) return false
      seen.add(id)
      return (plan.requires.get(id) ?? []).some(prior => prior === first || visit(prior, seen))
    }
    return visit(second)
  }
  const course = { plan, levels: pending.flatMap(({ facts }) => facts.levels), before, notes: content.mode === 'notes' }
  return pending.map(({ iterator }) => {
    const last = iterator.next(course)
    if (!last.done) throw new Error('a work reader must complete after receiving its course')
    return last.value
  })
}
export const readWorks = (content, prepare) => readWorkSet(content, [{ content, prepare }])[0]
