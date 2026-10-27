import { useEffect, useMemo, useState } from 'react'
import { FlaskConical, FolderTree, Play, RotateCcw, X } from 'lucide-react'
import { Brief, PhonePage, Text, Workbench } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { playHand } from '../hand.js'
import { cut } from '../model.js'
import { ContextBar, Report, RepoView, actionText, entryText } from './views.jsx'

// A hand level of 《软件工厂》 (chapter 0, ../hand.js): no machine yet, the player is the loop. The context the model
// will read sits on top, as the bar it reads it by; the repository beside it, a file put into the context with a click;
// what happened below. Calling the model, listing the files and running the tests are the player's buttons, and the
// level is passed once a test run the player starts comes back green. The moves are the level's save.

export default function HandScreen({ game, level: entry, saved, save, solve, phone }) {
  const level = entry.source
  const [ops, setOps] = useState(() => (Array.isArray(saved) ? saved : []))
  const session = useMemo(() => playHand(level, ops), [level, ops])
  const { repo, issue } = level.test
  const view = useMemo(() => cut(session.context, level.machine.window), [session, level])
  const loop = level.machine.mode === 'loop'

  const act = (op) => {
    const next = [...ops, op]
    setOps(next)
    save(next)
  }
  const reset = () => {
    setOps([])
    save([])
  }
  useEffect(() => { if (session.green) solve({ tokens: session.tokens }) }, [session.green])

  const files = session.context.filter((e) => e.kind === 'file').map((e) => e.file)
  const brief = (
    <Brief game={game} level={entry} hint={level.hint} phone={phone}>
      <section className="ag-score">
        <div className="stat-row">
          <div className="stat"><b>{session.tokens}</b><span>{tr('token', 'tokens')}</span></div>
          <div className="stat"><b>{level.machine.window}</b><span>{tr('窗口', 'window')}</span></div>
        </div>
      </section>
    </Brief>
  )
  const stage = (
    <div className="ag-hand">
      <section className="ag-panel ag-hand-context">
        <h3 className="ag-head">{tr('模型的上下文', 'The model’s context')}</h3>
        <ContextBar call={{ ...view, tokens: view.seen.reduce((n, e) => n + e.tokens, 0) }} window={level.machine.window} list={false} />
        <ol className="ag-chips">
          {session.context.map((e, k) => (
            <li key={k} data-kind={e.kind} className={view.dropped.includes(e) ? 'is-out' : ''}>
              <span>{L(entryText(e))}</span>
              {e.kind !== 'issue' && <button type="button" aria-label={tr('拿出上下文', 'Take out of the context')} onClick={() => act(['drop', k])}><X size={13} /></button>}
            </li>
          ))}
        </ol>
        <div className="ag-hand-actions">
          <button type="button" className="ag-go" onClick={() => act(['call'])}><Play size={15} /><span>{tr('调用模型', 'Call the model')}</span></button>
          {loop && <button type="button" onClick={() => act(['list'])}><FolderTree size={15} /><span>{tr('目录', 'File list')}</span></button>}
          <button type="button" onClick={() => act(['test'])}><FlaskConical size={15} /><span>{tr('跑测试', 'Run tests')}</span></button>
          <button type="button" className="ag-quiet" onClick={reset} disabled={!ops.length}><RotateCcw size={14} /><span>{tr('重来', 'Start over')}</span></button>
        </div>
      </section>
      <section className="ag-panel">
        <h3 className="ag-head">{L(issue.title)}</h3>
        <Text game={game} className="ag-issue" text={issue.text} />
        <h3 className="ag-head">{tr('仓库', 'Repository')}</h3>
        <RepoView repo={repo} state={session.state} onAdd={(file) => act(['add', file])} added={files} />
      </section>
      <section className="ag-panel">
        <h3 className="ag-head">{tr('发生了什么', 'What happened')}</h3>
        {session.log.length ? <Log log={session.log} /> : <p className="ag-note">{tr('点仓库里的文件把它放进上下文，或者直接调用模型。', 'Click a file of the repository to put it into the context, or call the model straight away.')}</p>}
      </section>
    </div>
  )
  if (phone) return <PhonePage brief={brief} className="ag-hand-phone">{stage}</PhonePage>
  return <Workbench brief={brief} stage={stage} scroll className="ag-level" />
}

function Log({ log }) {
  return (
    <ol className="ag-log">
      {[...log].reverse().map((item, k) => (
        <li key={log.length - k} data-op={item.op}>
          {item.op === 'call' && <><b>{tr('模型', 'Model')}</b><span>{L(actionText(item.action))}</span><em>{tr(`看到 ${item.tokens} tok`, `saw ${item.tokens} tok`)}{item.dropped.length ? tr(` · 丢掉 ${item.dropped.length} 条`, ` · ${item.dropped.length} dropped`) : ''}</em></>}
          {item.op === 'add' && <><b>{tr('你', 'You')}</b><span>{tr(`放进 ${item.file}`, `Put in ${item.file}`)}</span></>}
          {item.op === 'list' && <><b>{tr('你', 'You')}</b><span>{tr('放进目录', 'Put in the file list')}</span></>}
          {item.op === 'drop' && <><b>{tr('你', 'You')}</b><span>{tr(`拿出 ${L(entryText(item.entry))}`, `Took out ${L(entryText(item.entry))}`)}</span></>}
          {item.op === 'test' && <><b>{tr('测试', 'Tests')}</b><Report report={item.report} /></>}
        </li>
      ))}
    </ol>
  )
}
