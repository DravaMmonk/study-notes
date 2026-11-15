import { useRef } from 'react'
import TreeEditor from '../../strip/TreeEditor.jsx'
import { L } from '../i18n.js'
import { Markup } from '../Markup.jsx'
import RunDock from '../RunDock.jsx'
import Verdict from '../Verdict.jsx'
import { checkAction } from '../useCheckOnce.js'
import PlayLayout from './PlayLayout.jsx'
import { inspectWork, useCheckedWork } from './useWork.js'
import WorkGoal from './WorkGoal.jsx'

function TextLines({ lines }) {
  return (
    <div className="tree-description">
      {lines.map(({ text, strong, muted }, k) => (
        <p key={k} className={muted ? 'is-muted' : ''}>{L(text)}{strong && <b>{L(strong)}</b>}</p>
      ))}
    </div>
  )
}

function Examples({ examples }) {
  return (
    <div className="tree-examples">
      {examples.map(({ title, lines }, k) => (
        <details key={k} open={k === 0}>
          <summary>{L(title)}</summary>
          <TextLines lines={lines} />
        </details>
      ))}
    </div>
  )
}

export default function TreeWork({ screen, resource, play }) {
  const { level: entry } = screen
  const { work: tree, verdict, check, change } = useCheckedWork(screen, {
    read: (saved) => saved?.tree ?? resource.initial ?? null,
    write: (tree) => ({ tree }),
  }, inspectWork(play, resource.judge))
  const editor = useRef(null)
  const stage = (
    <div className={play.stage}>
      {resource.prompt && <p className="fo-say fo-prompt"><Markup text={resource.prompt} /></p>}
      {resource.goal && <WorkGoal premises={resource.premises} goal={resource.goal} />}
      {play.checks === 'shown' && resource.examples && <Examples examples={resource.examples} />}
      <TreeEditor tree={tree} onChange={change} chips={resource.chips(tree)} language={resource.language} scope={`${entry.id}:${entry.source.task}`} ref={editor} />
    </div>
  )
  const { failure } = verdict ?? {}
  let results = null
  if (verdict?.pass) results = <Verdict pass compact>{L(resource.passed)}</Verdict>
  else if (failure?.lines) results = <div className="tree-evidence"><p>{L(failure.why)}</p>{failure.lines.length > 0 && <TextLines lines={failure.lines} />}</div>
  else if (failure && resource.goal) results = <Verdict compact>{L(failure.why)}</Verdict>
  else if (failure) results = <p className="lg-error">{L(failure.why)}</p>
  const dock = <RunDock go={checkAction(() => {
    editor.current?.clearSelection()
    check()
  }, Boolean(verdict?.pass))} />
  return <PlayLayout screen={screen} play={play} stage={stage} results={results} dock={dock} />
}
