import runtime from './runtime.js'
import { meaning } from './vocabulary.js'
import { board } from './board.js'
import { tickBusWorks } from './work.js'
import { runLevel } from './run.js'
import { primitivesOnly } from 'circuit'
import { play } from './play.js'

export { board } from './board.js'
export { tickBusWorks, prepareWorks } from './work.js'
export { runLevel, runTest, entries } from './run.js'
export { bitsOf, lineOf, sayer } from './line.js'
export { wantOf } from './wants.js'
export { default as runtime } from './runtime.js'

export function boardContext({ content, task, parts = {} }) {
  if (!content) return { task, view: primitivesOnly(board, parts) }
  const works = tickBusWorks(content)
  const name = task.taskId ?? task.id
  const prepared = [...works.played.values()].flat().find(task => task.taskId === name)
  if (!prepared) throw new Error(`unknown tick-bus task ${name}`)
  return { task: prepared, works, view: works.forTask(prepared) }
}

export const busPlay = {
  initial(context) { const { task } = boardContext(context); return board.startBoard(task) },
  read(work, context) { const { task, view } = boardContext(context); return Array.isArray(work) ? board.fromText(work, task, view) : work },
  write: work => work,
  normalize: work => work,
  run(work, context) { const { task, view } = boardContext(context); return runLevel({ ...task, tests: [...task.tests, ...(task.hidden ?? [])] }, work, view.partOf) },
  judge: report => ({ pass: report.pass, score: report.pass ? 1 : 0 }),
  runtime,
}

export function register(kernel) {
  kernel.kind('tick-bus:board', meaning)
  kernel.play('tick-bus:board', busPlay)
  kernel.check('tick-bus:boards', ({ content }) => runtime.validate(runtime.spec(content)))
  kernel.agent('tick-bus:board', {
    observe(context) { const { task, works } = boardContext(context); return play.open(textContext(task, works)) },
    act(context, text) { const { task, works } = boardContext(context); return play.attempt(textContext(task, works), text) },
  })
}

function textContext(task, works) {
  const all = Object.entries(works.defs).map(([type, def]) => ({ key: `part:${type}`, part: type, name: def.name, desc: def.desc }))
  return { level: { ...task, source: task }, game: { circuit: works, parts: { all }, defined: { of: type => works.defs[type] } }, progress: {}, flags: new Set() }
}
