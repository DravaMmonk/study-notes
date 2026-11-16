import { robotReport } from '../model/verdict.js'

/** A cell's probes use circuit source ids, so the shared editor can read them directly. */
export function probeValues(probe) {
  return new Map(Object.entries(probe).map(([key, value]) => [key.startsWith('out:') ? key.slice(4) : key, value]))
}

/** Wire colours follow the same signal values in a running task and an experiment. */
export const wireStateOf = (values) => (wire) => {
  const value = values.get(wire.from)
  if (value === undefined) return null
  return value === null || value === false ? 'dead' : 'live'
}

export function robotRun(model, task, board, options) {
  const report = robotReport(model.runCircuit, task, board, options)
  return {
    ...report,
    runs: report.runs.map((run) => ({
      ...run,
      ticks: run.report.res.steps.slice(0, run.report.stop).map((step, at) => ({
        values: probeValues(step.probe),
        errors: new Map(),
        trace: run.report.res.traces?.[at],
      })),
    })),
  }
}
