// What every vision bench task's check asks (npm run check, validate.js): the lesson holds on these data —
//   the starting setting of each step does not pass yet, and some setting of the knobs it opens does;
//   every wrong strategy the task names (`naive`: a setting a player is likely to try, and why it is wrong) fails its
//   step's goal;
//   every setting that passes a step meets the task's `holds` limits too: the relation the bench teaches, so the
//   goal cannot be met some other way. The settings are every value of the step's open knobs (engine/bench.js).
import { goalOf, judge, knobValues, openKnobs, startValues } from '../../../engine/bench.js'

/** Every setting of a step's open knobs, the others at its start. */
function settings(bench, stage) {
  let all = [startValues(bench, stage)]
  for (const name of openKnobs(bench, stage)) all = all.flatMap((v) => knobValues(bench.knobs[name]).map((x) => ({ ...v, [name]: x })))
  return all
}

/** The problems with a bench task's lesson ([] when it holds). view(values) is the model's. */
export function lessonProblems(task, view) {
  const { bench, naive = [], holds = [] } = task
  const stages = bench.stages ?? [null]
  const passes = (stage, v) => judge(goalOf(bench, stage), { ...v, ...view(v) }).pass
  const write = (v) => Object.entries(v).map(([k, x]) => `${k}=${x}`).join(', ')
  const problems = []
  for (const [k, stage] of stages.entries()) {
    const where = stage ? `step ${k + 1}` : 'the bench'
    if (passes(stage, startValues(bench, stage))) problems.push(`${where}: the starting setting already passes`)
    const passing = settings(bench, stage).filter((v) => passes(stage, v))
    if (!passing.length) problems.push(`${where}: no setting of its knobs passes`)
    const off = passing.find((v) => !judge(holds, { ...v, ...view(v) }).pass)
    if (off) problems.push(`${where}: ${write(off)} passes without what the bench teaches (holds)`)
  }
  for (const n of naive) {
    const stage = stages[(n.step ?? 1) - 1]
    if (stage === undefined) problems.push(`a naive setting is on step ${n.step}, which the bench does not have`)
    else if (passes(stage, { ...startValues(bench, stage), ...n.set })) problems.push(`the naive setting ${write(n.set)} passes`)
  }
  return problems
}
