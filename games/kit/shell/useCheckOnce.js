import { useLayoutEffect, useState } from 'react'
import { L } from './i18n.js'
import { WORDS } from './words.js'

/** Keep a mark for a completed check. Reopening inspects the saved work without firing its completion callback. */
export function useCheckOnce({ lastRun, keepRun }, inspect, onChecked) {
  const [verdict, setVerdict] = useState(null)
  useLayoutEffect(() => {
    if (lastRun) setVerdict(inspect())
  }, [])

  const record = (result) => {
    setVerdict(result)
    keepRun?.(true)
    onChecked(result)
  }
  const reset = () => {
    setVerdict(null)
    keepRun?.(null)
  }
  return { verdict, check: () => record(inspect()), record, reset }
}

export function checkAction(onClick, pass, go = L(WORDS.check), done = L(WORDS.passed)) {
  return { label: pass ? done : go, pass, onClick }
}
