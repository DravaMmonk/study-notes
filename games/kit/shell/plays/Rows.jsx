import { useState } from 'react'
import { judgeFor } from '../../engine/plays.js'
import TreeEditor from '../../strip/TreeEditor.jsx'
import { useCheckOnce } from '../CheckOnce.jsx'
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
  const { results, dock, reset } = useCheckOnce({
    judge: judgeFor(play, resource.judge), work, passed: L(resource.passed), onPass: () => solve(resource.score(work)), lastRun, keepRun,
  })
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
