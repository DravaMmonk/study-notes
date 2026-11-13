import { useRef, useState } from 'react'
import { judgeFor } from '../../engine/plays.js'
import TreeEditor from '../../strip/TreeEditor.jsx'
import { L } from '../i18n.js'
import { Brief, Level } from '../Layout.jsx'
import { Markup } from '../Markup.jsx'
import RunDock from '../RunDock.jsx'
import { useKeptVerdict } from '../useKeptVerdict.js'
import { WORDS } from '../words.js'

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
  const { game, level: entry, saved, save, solve, lastRun, keepRun, phone } = screen
  const [tree, setTree] = useState(() => saved?.tree ?? resource.initial ?? null)
  const judge = judgeFor(play, resource.judge)
  const inspect = () => {
    const failure = judge(tree)
    return { pass: !failure, failure }
  }
  const [verdict, setVerdict] = useKeptVerdict({ lastRun, keepRun }, inspect)
  const editor = useRef(null)
  const change = (next) => {
    setTree(next)
    save({ tree: next })
    setVerdict(null)
  }
  const check = () => {
    editor.current?.clearSelection()
    const result = inspect()
    setVerdict(result)
    if (result.pass) solve(null)
  }
  const stage = (
    <div className={play.stage}>
      <p className="fo-say fo-prompt"><Markup text={resource.prompt} /></p>
      {play.checks === 'shown' && resource.examples && <Examples examples={resource.examples} />}
      <TreeEditor tree={tree} onChange={change} chips={resource.chips(tree)} language={resource.language} scope={`${entry.id}:${entry.source.task}`} ref={editor} />
    </div>
  )
  const { failure } = verdict ?? {}
  const results = verdict?.pass ? <p className="lg-verdict is-pass" role="status">{L(resource.passed)}</p>
    : failure?.lines ? <div className="tree-evidence"><p>{L(failure.why)}</p>{failure.lines.length > 0 && <TextLines lines={failure.lines} />}</div>
      : failure && <p className="lg-error">{L(failure.why)}</p>
  const dock = <RunDock go={{ label: verdict?.pass ? L(WORDS.passed) : L(WORDS.check), pass: Boolean(verdict?.pass), onClick: check }} />
  const brief = <Brief game={game} level={entry} hint={entry.source.hint} phone={phone} />
  return <Level phone={phone} className={play.layout} brief={brief} stage={stage} results={results} dock={dock} />
}
