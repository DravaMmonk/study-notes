import { board } from './mechanism/board.js'
import { circuitWorks } from './mechanism/work.js'
import { runLevel } from './mechanism/run.js'
import { primitivesOnly } from './board-cards.js'

/** Resolve the authored task and its circuit resources through the same reader as native module consumers. */
export function boardContext(context) {
  if (!context.content) return { task: context.task, view: primitivesOnly(board, context.parts ?? {}) }
  const works = circuitWorks(context.content)
  const name = context.task.taskId ?? context.task.id
  const task = [...works.played.values()].flat().find(task => task.taskId === name)
  if (!task) throw new Error(`unknown circuit task ${name}`)
  return { task, works, view: works.forTask(task) }
}

export const boardPlay = {
  initial(context) {
    const { task, view } = boardContext(context)
    return Array.isArray(task.starter) ? board.fromText(task.starter, task, view) : board.startBoard(task)
  },
  read(work, context) {
    const { task, view } = boardContext(context)
    return Array.isArray(work) ? board.fromText(work, task, view) : work
  },
  write: work => work,
  normalize: work => work,
  run(work, context) {
    const { task, view } = boardContext(context)
    return runLevel({ ...task, tests: [...task.tests, ...(task.hidden ?? [])] }, work, view.partOf)
  },
  judge: report => ({ pass: report.pass, score: report.pass ? 1 : 0 }),
}

/** Check authored reference and naive works using the public play contract. */
export function boardChecks({ content }) {
  return content.levels.flatMap(level => level.tasks.filter(task => task.play === 'circuit:board').map(task => {
    const context = { content, task }
    try {
      const passed = work => boardPlay.judge(boardPlay.run(boardPlay.read(work, context), context)).pass
      const pass = passed(task.solution) && (!task.naive || !passed(task.naive))
      return { level: level.id, fail: !pass, text: `${task.id}: circuit reference and naive ${pass ? 'PASS' : 'FAIL'}` }
    } catch (error) { return { level: level.id, fail: true, text: `${task.id}: ${error.message}` } }
  }))
}
