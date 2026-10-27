import { useLayoutEffect, useState } from 'react'

// The verdict of a screen that checks its board in one go (a truth table, a formula, a proof term…), kept across
// visits the way GameShell keeps a board's last run: the shell holds only the mark that the board was checked, and the
// screen judges it again when it opens, so it shows the same verdict without passing the level a second time.
//
//   const [verdict, setVerdict] = useKeptVerdict({ lastRun, keepRun }, judge)
//
// judge() checks the board as it stands and returns the verdict (it must not solve); setVerdict(null) as the board
// changes drops the mark.
export function useKeptVerdict({ lastRun, keepRun }, judge) {
  const [verdict, setShown] = useState(null)
  // Once, before the first paint, so the screen opens on the verdict.
  useLayoutEffect(() => {
    if (lastRun) setShown(judge())
  }, [])
  const setVerdict = (next) => {
    setShown(next)
    keepRun(next == null ? null : true)
  }
  return [verdict, setVerdict]
}
