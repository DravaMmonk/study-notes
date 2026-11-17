import { circuitPlay, definedSettings } from "../play.js"
import { runLevel, show } from "./run.js"

/** Expose the same single-evaluation circuit used by the screen and author checks. */
export const play = circuitPlay({
  key: ({ game }, type) => game.circuit.BUILT[type] ? type : `part:${type}`,
  settings: ({ game }, type) => { const def = game.defined.of(type); return def ? definedSettings(def) : [] },
  tests: ({ level }) => level.source.tests.map((test) => ({ label: test.label, text: [
    ...Object.entries(test.inputs).map(([name, value]) => `${name}: ${show(value)}`),
    ...Object.entries(test.expect).map(([name, value]) => `${name} = ${show(value)}`),
  ].join('\n') })),
  run(ctx, board) {
    const task = ctx.level.source
    const view = ctx.game.circuit.forTask(task)
    const { runs, pass } = runLevel({ ...task, tests: [...task.tests, ...task.hidden] }, board, view.partOf)
    return { pass, tests: runs.slice(0, task.tests.length).map((run, index) => ({ label: task.tests[index].label, pass: !run.fail && !run.error })),
      hidden: { count: task.hidden.length, failed: runs.slice(task.tests.length).filter((run) => run.fail || run.error).length } }
  },
})
