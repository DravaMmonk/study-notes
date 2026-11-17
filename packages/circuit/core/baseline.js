import { runLevel } from './mechanism/run.js'
import { withHidden } from 'kernel'
import { usable, offer, holds } from './course.js'

export function availabilityRecords({ fragment }) {
  const records = []
        for (const level of fragment.levels) {
          const works = fragment.table ?? fragment.image ?? fragment.logic ?? fragment.circuit ?? {}
          const tasks = works.played?.get(level.id) ?? level.tasks
          for (const task of tasks) {
            const at = { id: level.id, task: task.task }
            const course = fragment.course
            const ancestors = course.levels.filter(prior => course.before(prior.id, level.id))
            const flags = new Set(ancestors.flatMap(prior => [...(prior.unlocks ?? []), ...course.opens(prior), ...course.awards(prior)]))
            for (const flag of [...course.opens(at), ...course.awards(at)]) flags.add(flag)
            const holding = holds(course, at, flags)
            records.push({ level: level.id, task: task.taskId ?? task.key ?? task.id, availability: {
              usable: usable(course, at, flags), emptyProgress: usable(course, at, new Set()), gives: course.gives(at), opens: course.opens(at), awards: course.awards(at),
              tray: offer(course, at, flags),
              definitions: Object.fromEntries(usable(course, at, flags).map(type => [type, holding.definition(type)])),
            } })
          }
        }
  return records
}

export function circuitReports({ spec }) {
  if (!spec.circuit) return null
  const works = spec.circuit
  return spec.levels.flatMap(level => (works.played?.get(level.id) ?? level.tasks).map(task => {
    const run = work => runLevel(withHidden(task), work, works.forTask(task).partOf, { traced: true })
    return { level: level.id, task: task.taskId ?? task.key ?? task.id, kind: task.mode ?? task.kind, report: {
      reference: task.solution === undefined ? { absent: true } : { work: task.solution, report: run(task.solution) },
      naive: task.naive == null ? { absent: true } : { work: task.naive, report: run(task.naive) },
    } }
  }))
}
