import { checkAction } from '../useCheckOnce.js'
import RunDock from '../RunDock.jsx'
import Verdict from '../Verdict.jsx'
import { L } from '../i18n.js'
import NamedLines from '../NamedLines.jsx'
import PlayLayout from './PlayLayout.jsx'
import TreeRows from './TreeRows.jsx'
import { inspectWork, useCheckedWork } from './useWork.js'

export default function Rows({ screen, resource, play }) {
  const { level: entry } = screen
  const { work, verdict, check, change } = useCheckedWork(screen, { read: resource.initial, write: resource.keep }, inspectWork(play, resource.judge), resource.score)
  const results = verdict && <Verdict pass={verdict.pass} failure={verdict.failure}>{L(resource.passed)}</Verdict>
  const dock = <RunDock go={checkAction(check, Boolean(verdict?.pass))} />
  const stage = (
    <div className={play.stage}>
      <TreeRows {...resource.rows(work, change, `${entry.id}:${entry.source.task}`)} />
      {resource.lines && <NamedLines lines={resource.lines(work, L)} />}
    </div>
  )
  return <PlayLayout screen={screen} play={play} stage={stage} results={results} dock={dock} />
}
