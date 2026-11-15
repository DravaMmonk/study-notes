import { useState } from 'react'
import { judgeFor } from '../../engine/plays.js'
import { useCheckOnce } from '../useCheckOnce.js'

/** Keep the editor's work as local state and let the play encode its saved form. */
export function useSavedWork({ saved, save }, { read, write }) {
  const [work, setWork] = useState(() => read(saved))
  const change = (next) => {
    setWork(next)
    save(write(next))
  }
  return { work, change }
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
  const { work, change } = useSavedWork(screen, storage)
  const { verdict, check, record, reset } = useCheckOnce(screen, () => inspect(work), ({ pass }) => {
    if (pass) screen.solve(score(work))
  })
  return {
    work, verdict, check, record,
    change(next) {
      change(next)
      reset()
    },
  }
}
