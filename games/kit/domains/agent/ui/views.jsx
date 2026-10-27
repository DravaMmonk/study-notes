// What the agent domain shows besides its boards: an action and an entry in words, a context as a bar of its entries
// against the window, the repository with what has been done to it, and the issue.
import { L, tr } from '../../../shell/i18n.js'
import { segOf, fileOf, tokensOf } from '../world.js'

const T = (zh, en) => ({ zh, en })

/** An action in words. */
export function actionText(action) {
  if (!action) return T('—', '—')
  if (action.type === 'read') return T(`读 ${action.file}`, `Read ${action.file}`)
  if (action.type === 'list') return T('要目录', 'Ask for the file list')
  if (action.type === 'test') return T('要跑测试', 'Ask for the tests')
  if (action.type === 'done') return action.why === 'no-issue' ? T('做完了（看不到任务）', 'Done (no task in view)') : T('做完了', 'Done')
  const madeup = action.edits.filter((e) => e.how === 'madeup').length
  const names = action.edits.map((e) => segOf(e.at)).join(', ')
  return madeup ? T(`写 ${names}（编了 ${madeup} 处）`, `Write ${names} (${madeup} made up)`) : T(`写 ${names}`, `Write ${names}`)
}

/** An entry of a context in a few words. */
export function entryText(entry) {
  if (entry.kind === 'issue') return T(`issue：${L(entry.issue.title)}`, `issue: ${L(entry.issue.title)}`)
  if (entry.kind === 'file') return entry.missing ? T(`${entry.file}（不存在）`, `${entry.file} (no such file)`) : T(entry.file, entry.file)
  if (entry.kind === 'list') return T(`目录（${entry.files.length} 个文件）`, `File list (${entry.files.length} files)`)
  if (entry.kind === 'report') return entry.green ? T('测试：全部通过', 'Tests: all pass') : T(`测试：${entry.fails.length} 处失败`, `Tests: ${entry.fails.length} failing`)
  return actionText(entry.action)
}

const WHY = { missing: T('没改', 'not changed'), wrong: T('改错了', 'wrong'), madeup: T('调用了不存在的函数', 'calls a function that does not exist') }
export const whyText = (why) => WHY[why]

/** A context's value on a card: how many entries and tokens, and the last few. */
export function ContextValue({ value }) {
  if (!value.length) return <span className="ag-empty">{tr('空', 'empty')}</span>
  return (
    <span className="ag-ctx">
      <b>{tr(`${value.length} 条 · ${tokensOf(value)} tok`, `${value.length} · ${tokensOf(value)} tok`)}</b>
      {value.slice(-3).map((e, k) => <small key={k} data-kind={e.kind}>{L(entryText(e))}</small>)}
    </span>
  )
}

/**
 * The context one model call read, as a bar: each entry a block as wide as its tokens, the window marked, what fell
 * out of it grey. Below it, the entries in order.
 */
export function ContextBar({ call, window, list = true }) {
  if (!call) return <p className="ag-note">{tr('这一轮没有调用模型。', 'No model call this turn.')}</p>
  const all = [...call.dropped.map((e) => ({ e, out: true })), ...call.seen.map((e) => ({ e, out: false }))]
  const total = Math.max(window, tokensOf(all.map((x) => x.e)))
  return (
    <div className="ag-bar-wrap">
      <div className="ag-bar" style={{ '--window': `${(window / total) * 100}%` }} role="img" aria-label={tr(`模型看到 ${call.tokens} / ${window} tok`, `The model sees ${call.tokens} of ${window} tokens`)}>
        {all.map(({ e, out }, k) => <i key={k} data-kind={e.kind} className={out ? 'is-out' : ''} style={{ width: `calc(${(e.tokens / total) * 100}% - 2px)` }} title={`${L(entryText(e))} · ${e.tokens} tok`} />)}
      </div>
      <p className="ag-bar-meta">
        <span>{tr(`看到 ${call.tokens} tok`, `Sees ${call.tokens} tok`)}</span>
        <span>{tr(`窗口 ${window}`, `Window ${window}`)}</span>
        {call.dropped.length > 0 && <span className="is-out">{tr(`丢掉 ${call.dropped.length} 条`, `${call.dropped.length} dropped`)}</span>}
      </p>
      {list && (
      <ol className="ag-entries">
        {all.map(({ e, out }, k) => (
          <li key={k} data-kind={e.kind} className={out ? 'is-out' : ''}>
            <span>{L(entryText(e))}</span>
            <em>{e.tokens}</em>
          </li>
        ))}
      </ol>
      )}
    </div>
  )
}

/** The repository: each file with its tokens and functions, a function marked with what has been written to it. */
export function RepoView({ repo, state, onAdd, added = [] }) {
  return (
    <ul className="ag-repo">
      {Object.entries(repo.files).map(([file, f]) => (
        <li key={file} className={added.includes(file) ? 'is-added' : ''}>
          <span className="ag-file">
            {onAdd ? <button type="button" onClick={() => onAdd(file)}>{file}</button> : <b>{file}</b>}
            <em>{f.tokens} tok</em>
          </span>
          <span className="ag-segs">
            {f.segs.map((s) => {
              const how = state[`${file}#${s}`]
              return <code key={s} className={how ? `is-${how}` : ''} title={how ? L({ right: T('改对了', 'right'), wrong: T('改错了', 'wrong'), madeup: T('编造', 'made up') }[how]) : undefined}>{s}</code>
            })}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** A test report's lines. */
export function Report({ report }) {
  if (report.green) return <p className="ag-report is-pass">{tr('测试全部通过。', 'All tests pass.')}</p>
  return (
    <ul className="ag-report is-fail">
      {report.fails.map((f, k) => <li key={k}><code>{fileOf(f.at)} · {segOf(f.at)}</code>{L(whyText(f.why))}</li>)}
    </ul>
  )
}
