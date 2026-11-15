import { useState } from 'react'
import { judgeFor } from '../../engine/plays.js'
import { useCheckOnce } from '../useCheckOnce.js'
import { useRunHistory } from '../useLevelRuns.js'

/** Keep the editor's work as local state and let the play encode its saved form. */
export function useSavedWork(screen, { read, write }) {
  const { saved, save, solve } = screen
  const [work, setWork] = useState(() => read(saved))
  const history = useRunHistory(screen, work)
  const change = (next) => {
    setWork(next)
    save(write(next))
  }
  return { work, change, history, finish: (score, checked = work) => solve(score, write(checked)) }
}

/** A first-failure judge presented as a one-shot verdict. */
export function inspectWork(play, judge) {
  const check = judgeFor(play, judge)
  return (work) => {
    const failure = check(work)
    return { pass: !failure, failure }
  }
}

/** Check the saved work once, and clear that verdict whenever the work changes. */
export function useCheckedWork(screen, storage, inspect, score = () => null) {
  const { work, change, history, finish } = useSavedWork(screen, storage)
  const { verdict, check, record, reset } = useCheckOnce(history, () => inspect(work), ({ pass }, checked = work) => {
    if (pass) finish(score(checked), checked)
  })
  return {
    work, verdict, check, record,
    change(next) {
      change(next)
      reset()
    },
  }
}
