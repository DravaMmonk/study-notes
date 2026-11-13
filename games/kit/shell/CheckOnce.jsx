import RunDock from './RunDock.jsx'
import Verdict from './Verdict.jsx'
import { useKeptVerdict } from './useKeptVerdict.js'
import { L } from './i18n.js'
import { WORDS } from './words.js'

// A thing checked in one go, the same in every game: a Check button, and under the play area the verdict, why it
// fails or that it passed; the verdict is kept across visits (useKeptVerdict.js) and dropped when the thing changes.
// What is checked against stays out of sight: only the first thing wrong is said. 《证明完毕》's declaration on the rule
// board and its definition are checked this way.
//
//   judge(work) → null | { why, … }: the work as it stands, judged
//   work       the current editor value
//   passed     what the verdict says when it passes      onPass(verdict)   the level is solved
//   lastRun, keepRun   the screen's (GameShell)
// Returns { results, dock, reset }: the verdict and the run bar to place; reset() as the thing changes.

export function useCheckOnce({ judge, work, passed, onPass, lastRun, keepRun }) {
  const inspect = () => {
    const fail = judge(work)
    return { pass: !fail, fail }
  }
  const [verdict, setVerdict] = useKeptVerdict({ lastRun, keepRun }, inspect)
  const check = () => {
    const next = inspect()
    setVerdict(next)
    if (next.pass) onPass(next)
  }
  return {
    results: verdict ? <Verdict pass={verdict.pass} failure={verdict.fail}>{passed}</Verdict> : null,
    dock: <RunDock go={{ label: verdict?.pass ? L(WORDS.passed) : L(WORDS.check), pass: Boolean(verdict?.pass), onClick: check }} />,
    reset: () => setVerdict(null),
  }
}
