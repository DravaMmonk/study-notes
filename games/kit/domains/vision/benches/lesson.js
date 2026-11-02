// What every vision bench's check asks (npm run check, a model's verify): the lesson holds on these data — the
// starting setting does not pass yet, and some setting of the knobs each step opens does.
import { goalOf, judge, passingSettings, startValues } from '../../../engine/bench.js'

/** '' when the bench teaches on its data, else what is wrong. view(values) is the model's. */
export function lessonHolds(bench, view) {
  const stages = bench.stages ?? [null]
  for (const [k, stage] of stages.entries()) {
    const where = stage ? `stage ${k + 1}` : 'the bench'
    const start = startValues(bench, stage)
    if (judge(goalOf(bench, stage), { ...start, ...view(start) }).pass) return `${where}: the starting setting already passes`
    if (!passingSettings(bench, stage, view).length) return `${where}: no setting of its knobs passes`
  }
  return ''
}
