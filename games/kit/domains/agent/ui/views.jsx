// What the agent domain shows besides its boards: a context as a bar of its entries against the window, the repository
// with what has been done to it, and a test report.
import { L, tr, T } from '../../../shell/i18n.js'
import Entries from '../../../shell/Entries.jsx'
import { fileOf, segOf, tokensOf } from '../world.js'
import { entryText, whyText } from '../words.js'


/** A context's value on a card: its entries in order (the kit's Entries), then how many and how many tokens. */
export function ContextValue({ value }) {
  if (!value.length) return <span className="ag-empty">{tr('空', 'empty')}</span>
  return (
    <Entries className="ag-ctx" count={tr(`共 ${value.length} 条 · ${tokensOf(value)} tok`, `${value.length} entr${value.length === 1 ? 'y' : 'ies'} · ${tokensOf(value)} tok`)}>
      {value.map((e, k) => <small key={k} data-kind={e.kind}>{L(entryText(e))}</small>)}
    </Entries>
  )
}

/**
 * The context one model call read, as a bar: each entry a block as wide as its tokens, placed where its tokens fall (so
 * the blocks never run past the bar), the window marked at the end the model reads from, what fell out of it grey. Below it, the entries in order.
 */
export function ContextBar({ call, window, list = true }) {
  if (!call) return <p className="ag-note">{tr('这一轮没有调用模型。', 'No model call this turn.')}</p>
  const all = [...call.dropped.map((e) => ({ e, out: true })), ...call.seen.map((e) => ({ e, out: false }))]
  const total = Math.max(window, tokensOf(all.map((x) => x.e)))
  return (
    <div className="ag-bar-wrap">
      <div className="ag-bar" style={{ '--window': `${(window / total) * 100}%` }} role="img" aria-label={tr(`模型看到 ${call.tokens} / ${window} tok`, `Model sees ${call.tokens} of ${window} tokens`)}>
        {all.map(({ e, out }, k) => {
          // Each entry where its tokens fall along the bar, so the blocks always add up to the bar.
          const left = (all.slice(0, k).reduce((n, x) => n + x.e.tokens, 0) / total) * 100
          return <i key={k} data-kind={e.kind} className={out ? 'is-out' : ''} style={{ left: `${left}%`, width: `${(e.tokens / total) * 100}%` }} title={`${L(entryText(e))} · ${e.tokens} tok`} />
        })}
      </div>
      <p className="ag-bar-meta">
        <span>{tr(`看到 ${call.tokens} tok`, `Sees ${call.tokens} tok`)}</span>
        <span>{tr(`窗口 ${window}`, `Window ${window}`)}</span>
        {call.dropped.length > 0 && <span className="is-out">{tr(`丢弃 ${call.dropped.length} 条`, `${call.dropped.length} dropped`)}</span>}
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
