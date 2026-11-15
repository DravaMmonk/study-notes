import { useMemo, useState } from 'react'
import { keepRunMark, markForWork, runKey, runWorkKey } from './run-marks.js'

/** Bind a slot's run history to the work that this editor actually judges. */
export function useRunHistory({ lastRun, keepRun }, work) {
  const workKey = useMemo(() => runWorkKey(work), [work])
  return {
    lastRun: markForWork(lastRun, workKey),
    keepRun: (mark, judged = work) => keepRun?.(mark && { workKey: judged === work ? workKey : runWorkKey(judged), mark }),
  }
}

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
