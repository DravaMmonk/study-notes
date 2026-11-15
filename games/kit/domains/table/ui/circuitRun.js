import { reportRuns } from '../../../engine/test-run.js'
import { lazy, tr } from '../lang.js'
import { signal } from '../model/format.js'
import { inspectRobotCase, robotConstraint, testLabel, whyFailed } from '../model/verdict.js'
import { WORLDS } from '../model/worlds.js'

/** A cell's probes use circuit source ids, so the shared editor can read them directly. */
export function probeValues(probe) {
  return new Map(Object.entries(probe).map(([key, value]) => [key.startsWith('out:') ? key.slice(4) : key, value]))
}

export function robotRun(model, task, board, workshopParts) {
  const run = (world, test, graph, options) => model.runCircuit(world, test, graph, { ...options, workshopParts })
  const world = WORLDS[task.world]
  const runs = task.tests.map((test, k) => {
    const report = inspectRobotCase(run, task, board, k, { traced: true })
    const ticks = report.res.steps.slice(0, report.stop).map((step, at) => ({
      values: probeValues(step.probe),
      errors: new Map(),
      trace: report.res.traces[at],
    }))
    const failure = report.ok ? null : whyFailed({ L: task, V: world, opt: task, label: (t) => testLabel(task, world, t), expected: task.expected }, k, test, report.res, report.mm)
    return { ticks, outputs: {}, report, failure, fail: failure && { why: failure.head } }
  })
  return reportRuns(runs, { constraint: robotConstraint(task, board) })
}

export const testName = (task, test, k) => lazy(() => `${tr('测试', 'Test')} ${k + 1} · ${testLabel(task, WORLDS[task.world], test)}`)

export function tutorialFailure(task, k, result, solve, next) {
  const at = { test: k + 1, want: signal(task.expected[k]), got: signal(result.value) }
  return {
    head: task.onFail.head,
    body: lazy(() => String(task.onFail.body).replace(/\{(test|want|got)\}/g, (_, key) => at[key])),
    cta: { label: task.onFail.next, fn: () => { solve(null); next(task.task + 1) } },
    hint: null,
  }
}
