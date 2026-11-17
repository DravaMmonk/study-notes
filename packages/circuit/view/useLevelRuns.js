import { useMemo, useState } from 'react'
import { workSignature } from 'kernel/view'

import { keepRunMark, markForWork, runKey } from 'kernel/view'


/** Bind a slot's run history to the work that this editor actually judges. */
export function useRunHistory({ lastRun, keepRun }, work, signature) {
  const workKey = useMemo(() => signature ?? workSignature(work), [work, signature])
  return {
    lastRun: markForWork(lastRun, workKey),
    keepRun: (mark, judged = work) => keepRun?.(mark && { workKey: judged === work ? workKey : workSignature(judged), mark }),
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
