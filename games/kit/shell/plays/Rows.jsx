import TreeEditor from '../../strip/TreeEditor.jsx'
import { checkAction } from '../useCheckOnce.js'
import RunDock from '../RunDock.jsx'
import Verdict from '../Verdict.jsx'
import { L } from '../i18n.js'
import NamedLines from '../NamedLines.jsx'
import RuleRows from '../RuleRows.jsx'
import PlayLayout from './PlayLayout.jsx'
import { inspectWork, useCheckedWork } from './useWork.js'

/** Rule rows whose editable slots are tree works. The resource reads and writes their values. */
export function TreeRows({ editor, ...rows }) {
  const adapt = editor && {
    close: editor.close,
    title: (k, j) => {
      const { title, equation } = editor.slot(k, j)
      return equation ? `${L(title)} =` : L(title)
    },
    render: (k, j) => {
      const { title: _, equation: _equation, ...slot } = editor.slot(k, j)
      return <div className="ks-tree-box"><TreeEditor key={slot.scope} {...slot} /></div>
    },
  }
  return <RuleRows {...rows} editor={adapt} />
}

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
