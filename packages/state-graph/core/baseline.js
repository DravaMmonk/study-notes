import { handExamples, judgeHand } from './model/hand-verdict.js'
import { robotReport } from './model/verdict.js'
const examples = (task, run, reference = task.solution, naive = task.naive) => ({
 reference: reference === undefined ? { absent: true } : { work: reference, report: run(reference) },
 naive: naive == null ? { absent: true } : { work: naive, report: run(naive) },
})
export function tableReports({ spec }) {
 if (!spec.table) return null
 const works = spec.table
 return spec.levels.flatMap(level => (works.played?.get(level.id) ?? level.tasks).map(task => {
  const report = task.play === 'state-graph:circuit' ? examples(task, work => robotReport(works.model.runCircuit, task, work, { traced: true })) : (() => {
   const sample = handExamples(task)
   return examples(task, work => judgeHand(task, work), sample.reference, sample.naive)
  })()
  return { level: level.id, task: task.taskId ?? task.key ?? task.id, kind: task.play, report }
 }))
}
