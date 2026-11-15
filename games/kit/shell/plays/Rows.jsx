import { useState } from 'react'
import { judgeFor } from '../../engine/plays.js'
import TreeEditor from '../../strip/TreeEditor.jsx'
import { checkAction, useCheckOnce } from '../useCheckOnce.js'
import RunDock from '../RunDock.jsx'
import Verdict from '../Verdict.jsx'
import { L } from '../i18n.js'
import { Brief, Level } from '../Layout.jsx'
import NamedLines from '../NamedLines.jsx'
import RuleRows from '../RuleRows.jsx'

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
  const { game, level: entry, saved, save, solve, lastRun, keepRun, phone } = screen
  const level = entry.source
  const [work, setWork] = useState(() => resource.initial(saved))
  const judge = judgeFor(play, resource.judge)
  const { verdict, check, reset } = useCheckOnce({ lastRun, keepRun }, () => {
    const failure = judge(work)
    return { pass: !failure, failure }
  }, ({ pass }) => { if (pass) solve(resource.score(work)) })
  const results = verdict && <Verdict pass={verdict.pass} failure={verdict.failure}>{L(resource.passed)}</Verdict>
  const dock = <RunDock go={checkAction(check, Boolean(verdict?.pass))} />
  const change = (next) => {
    setWork(next)
    save(resource.keep(next))
    reset()
  }
  const stage = (
    <div className={play.stage}>
      <TreeRows {...resource.rows(work, change, `${entry.id}:${level.task}`)} />
      {resource.lines && <NamedLines lines={resource.lines(work, L)} />}
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  return <Level phone={phone} className={play.layout} brief={brief} stage={stage} results={results} dock={dock} />
}
