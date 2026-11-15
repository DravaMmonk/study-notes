import { useState } from 'react'
import { keepRunMark, runKey } from './run-marks.js'

/** Run marks live in memory for one visit, across task and slot changes. */
export function useLevelRuns(task, slot) {
  const [runs, setRuns] = useState({})
  const runAt = slot == null ? null : runKey(task, slot)
  const keep = (key, mark) => setRuns((previous) => keepRunMark(previous, key, mark))
  return {
    runAt,
    run: {
      lastRun: runAt === null ? undefined : runs[runAt],
      keepRun: (mark) => { if (runAt !== null) keep(runAt, mark) },
    },
    dropRun: (no) => keep(runKey(task, no), null),
    clearRuns: () => setRuns({}),
  }
}
