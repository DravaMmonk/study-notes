// Two values read field by field (diff.js fieldDiff): a text pair side by side with the words that changed marked, a
// board line by line, any other value before and after. The changeset review and the comparison of two levels both
// show their differences this way.
import { lineDiff } from '../engine/ops/diff.js'
import { showPath } from '../engine/ops/edit.js'
import { tr } from '../shell/i18n.js'

export function DiffFields({ rows, onPath = null }) {
  return (
    <div className="diff-fields">
      {rows.map((r) => (
        <div key={showPath(r.path)} className={`diff-row is-${r.as}`}>
          {onPath ? <button type="button" className="field-key" onClick={() => onPath(r.path)}>{showPath(r.path) || tr('整个文件')}</button> : <span className="field-key">{showPath(r.path) || tr('整个文件')}</span>}
          {r.as === 'text' ? (
            <div className="diff-text">
              <Side before={pick(r.before, 'zh')} after={pick(r.after, 'zh')} />
            </div>
          ) : r.as === 'lines' ? <Lines before={(r.before ?? []).join('\n')} after={(r.after ?? []).join('\n')} /> : (
            <div className="diff-value">
              {r.before !== undefined && <del>{show(r.before)}</del>}
              {r.after !== undefined && <ins>{show(r.after)}</ins>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const pick = (v, side) => (v === undefined ? undefined : typeof v === 'string' ? v : v[side])
/** A value as JSON: on one line when it is short, indented when it is a long object or list. */
const show = (v) => {
  const line = JSON.stringify(v)
  return line.length <= 100 || v === null || typeof v !== 'object' ? line : JSON.stringify(v, null, 2)
}

/** A text as a line a token (a word, a run of spaces, a Chinese character), for a diff word by word. */
const tokens = (s) => (s ?? '').match(/[　-鿿＀-￯]|[^\S\n]+|\n|[^\s　-鿿＀-￯]+/g)?.map((t) => (t === '\n' ? '↵' : t)).join('\n') ?? ''

/** One side of a text: before and after, the words that changed marked. */
function Side({ before, after }) {
  if (before === after) return <p className="diff-same">{after}</p>
  const words = lineDiff(tokens(before), tokens(after))
  return (
    <div className="diff-side">
      <p>{words.filter(([k]) => k !== '+').map(([k, w], i) => (k === '-' ? <del key={i}>{w}</del> : <span key={i}>{w}</span>))}</p>
      <p>{words.filter(([k]) => k !== '-').map(([k, w], i) => (k === '+' ? <ins key={i}>{w}</ins> : <span key={i}>{w}</span>))}</p>
    </div>
  )
}

export function Lines({ before, after }) {
  return (
    <pre className="diff-lines">
      {lineDiff(before, after).map(([k, line], i) => <span key={i} className={k === '-' ? 'is-del' : k === '+' ? 'is-ins' : ''}>{k} {line}{'\n'}</span>)}
    </pre>
  )
}
