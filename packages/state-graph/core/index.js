import { S } from 'kernel'
import { extendVocabulary, fitted, blank } from 'table'
import { vocabulary, gameSchema } from './vocabulary.js'
import { levelSchema } from './level-schema.js'
import { tableReports } from './baseline.js'
import { tableWorks } from './work.js'
import { robotReport } from './model/verdict.js'
import { createRobotCircuits } from './circuits.js'
import { wiring } from 'table'
import { robotBlueprint } from 'table'
import { WORLDS } from './model/worlds.js'
import { judgeHand } from './model/hand-verdict.js'
import { plays } from './plays.js'
import { play } from './play.js'
import runtime from './runtime.js'
export { tableWorks, prepareTableWorks } from './work.js'
export { default as runtime } from './runtime.js'

export function tableContext({ content, task, progress }) {
 const works = tableWorks(content)
 if (progress) works.syncOwn(progress.built)
 const name = task.taskId ?? task.id
 const prepared = [...works.played.values()].flat().find(task => task.taskId === name || task.key === name)
 if (!prepared) throw new Error(`unknown table task ${name}`)
 return { task: prepared, works }
}
const meaning = {
 type: 'level', read: value => value, baselineReports: tableReports,
 configuration: { borrow: 'course.json' },
 vocabulary(base) {
  const projected = extendVocabulary(base, vocabulary)
  const fields = { ...base.level?.fields, ...levelSchema.fields }
  if (base.level) for (const key of Object.keys(levelSchema.fields).filter(key => key !== 'tasks')) {
   const previous = base.level.fields[key]
   if (!previous) fields[key] = S.opt(fields[key])
   else { const alternatives = S.either(previous, fields[key]); fields[key] = previous.optional || fields[key].optional ? S.opt(alternatives) : alternatives }
  }
  const level = base.level ? S.obj({ ...fields, tasks: S.list(S.either(levelSchema.fields.tasks.of, base.level.fields.tasks.of), { min: 1 }) }) : levelSchema
  const game = { ...base.game.fields }
  for (const [key, field] of Object.entries(gameSchema.fields)) game[key] = game[key] ? S.opt(S.either(game[key], field)) : S.opt(field)
  return { ...projected, level, game: S.obj(game) }
 },
}
export function register(kernel) {
 kernel.kind('state-graph:level', meaning)
 for (const name of Object.keys(plays)) {
  const circuit = name === 'state-graph:circuit'
  kernel.play(name, {
   initial(context) { return circuit ? fitted(blank(), tableContext(context).task.given) : {} },
   read(work, context) {
    if (!circuit || !Array.isArray(work)) return work
    const { task, works } = tableContext(context)
    return robotBlueprint(works.model, task.given, WORLDS[task.world]).read(work)
   },
   write: work => work, normalize: work => work,
   run(work, context) { const { task, works } = tableContext(context); return circuit ? robotReport(works.model.runCircuit, task, work) : judgeHand(task, work) },
   judge: report => ({ pass: report.pass, score: report.pass ? 1 : 0 }), runtime,
  })
  kernel.agent(name, {
   observe(context) { return play.open(textContext(context)) },
   act(context, work) { return play.attempt(textContext(context), work) },
  })
 }
 kernel.check('state-graph:levels', ({ content }) => content.levels.some(level => level.tasks.some(task => task.play?.startsWith('state-graph:'))) ? runtime.validate(runtime.spec(content)) : [])
}
function textContext(context) {
 const { task, works } = tableContext(context)
 return { game: { table: works, circuit: createRobotCircuits(works, { wire: wiring, place: board => board }) }, level: { ...task, source: task }, flags: context.flags ?? new Set(context.progress?.flags ?? []), progress: context.progress ?? { built: {}, passed: [], data: {}, solved: [] } }
}
