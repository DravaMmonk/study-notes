import { workSignature } from '../core/stamp.js'
import { useMemo } from 'react'


import { markForWork } from 'kernel/view'


/** Bind a slot's run history to the work that this editor actually judges. */
export function useRunHistory({ lastRun, keepRun }, work, signature) {
  const workKey = useMemo(() => signature ?? workSignature(work), [work, signature])
  return {
    lastRun: markForWork(lastRun, workKey),
    keepRun: (mark, judged = work) => keepRun?.(mark && { workKey: judged === work ? workKey : workSignature(judged), mark }),
  }
}
