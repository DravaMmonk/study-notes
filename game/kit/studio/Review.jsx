// The changeset review (DIRECTION decision 5): the pending operations, each in the operation set's own words and
// removable; why the change is made; the save migration it adds; every file it changes, read field by field (a text
// pair side by side, a board line by line, any other value before and after) or as a line diff; then apply it, or
// discard it. A changeset from a file (what an agent hands in) opens as the pending one. Below, the game's change log
// (changes.jsonl), whose last change can be undone.
import { useState } from 'react'
import { Check, FileUp, Undo2, X } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { showPath } from '../engine/ops/edit.js'
import { lineDiff } from '../engine/ops/diff.js'
import { fieldDiff, parsed } from './diff.js'

export default function Review({ ops, result, shown, why, setWhy, said, onRemove, onDiscard, onApply, onUndo, onSelect, onOpen }) {
  const failed = result.failed
  const ok = result.ok && ops.length > 0
  const [wrong, setWrong] = useState(null)
  // A changeset from a file ({ why?, ops }, what an agent hands in): it becomes the pending one.
  const open = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    file.text().then((text) => {
      try {
        const changeset = JSON.parse(text)
        if (!Array.isArray(changeset.ops)) throw new Error('no ops')
        setWrong(null)
        onOpen(changeset)
      } catch (error) {
        setWrong(`${file.name}: ${error.message}`)
      }
    })
  }
  return (
    <article className="review">
      <label className="kit-btn is-label review-open">
        <FileUp size={14} aria-hidden="true" />{tr('打开变更集', 'Open a changeset')}
        <input type="file" accept=".json,application/json" onChange={open} hidden />
      </label>
      {wrong && <p className="review-said is-fail">{wrong}</p>}
      {ops.length > 0 ? (
        <>
          <ol className="review-ops">
            {ops.map((op, k) => {
              const { op: name, ...args } = op
              return (
                <li key={k} className={failed === k ? 'is-fail' : ''}>
                  <code>{name}</code>
                  <span>{result.says?.[k] ?? JSON.stringify(args).slice(0, 120)}</span>
                  <button type="button" className="field-x" onClick={() => onRemove(k)} aria-label={tr('去掉这个操作', 'Drop this operation')}><X size={13} /></button>
                </li>
              )
            })}
          </ol>
          <input className="field-input review-why" value={why} onChange={(e) => setWhy(e.target.value)} placeholder={tr('为什么改', 'Why')} />
          {result.problems?.length > 0 && <ul className="audit-lines">{result.problems.map((p) => <li key={p} className="audit-line is-fail">{p}</li>)}</ul>}
          <div className="review-actions">
            <button type="button" className="kit-btn is-label is-solid review-apply" disabled={!ok} onClick={onApply}><Check size={14} aria-hidden="true" />{result.fresh || failed !== null ? tr('应用', 'Apply') : tr('检查中……', 'Checking…')}</button>
            <button type="button" className="kit-btn is-label" onClick={onDiscard}><X size={14} aria-hidden="true" />{tr('全部放弃', 'Discard all')}</button>
          </div>
          {shown.migration && (
            <section className="review-block">
              <h2>{tr(`存档迁移 v${shown.migration.version}`, `Save migration v${shown.migration.version}`)}</h2>
              <ul className="review-migration">{shown.migration.ops.map((m, k) => <li key={k}><code>{Object.keys(m)[0]}</code> {JSON.stringify(Object.values(m)[0])}</li>)}</ul>
            </section>
          )}
          {shown.changes.map((c) => <FileDiff key={c.file} change={c} onSelect={onSelect} />)}
        </>
      ) : <p className="review-empty">{tr('没有待定的修改。', 'Nothing pending.')}</p>}
      {said && <p className={`review-said ${said.ok ? '' : 'is-fail'}`}>{said.text}</p>}
      <Log log={shown.log} undoable={shown.undoable} onUndo={onUndo} />
    </article>
  )
}

/** One changed file: field by field for JSON, line by line otherwise (or when asked). */
function FileDiff({ change, onSelect }) {
  const [lines, setLines] = useState(false)
  const json = change.file.endsWith('.json')
  const level = /\/levels\/(.+)\.json$/.exec(change.file)?.[1]
  const state = change.before === null ? tr('新文件', 'new') : change.after === null ? tr('删除', 'removed') : null
  return (
    <section className="review-block">
      <h2>
        {level && change.after !== null ? <button type="button" onClick={() => onSelect(level)}>{change.file}</button> : change.file}
        {state && <small>{state}</small>}
        {json && <button type="button" className={`kit-btn is-label ${lines ? 'is-on' : ''}`} onClick={() => setLines(!lines)}>{tr('逐行', 'Lines')}</button>}
      </h2>
      {json && !lines
        ? <Fields rows={fieldDiff(parsed(change.before), parsed(change.after))} />
        : <Lines before={change.before ?? ''} after={change.after ?? ''} />}
    </section>
  )
}

function Fields({ rows }) {
  return (
    <div className="diff-fields">
      {rows.map((r) => (
        <div key={showPath(r.path)} className={`diff-row is-${r.as}`}>
          <span className="field-key">{showPath(r.path) || tr('整个文件', 'whole file')}</span>
          {r.as === 'text' ? (
            <div className="diff-text">
              {['zh', 'en'].map((side) => <Side key={side} before={pick(r.before, side)} after={pick(r.after, side)} />)}
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

function Lines({ before, after }) {
  return (
    <pre className="diff-lines">
      {lineDiff(before, after).map(([k, line], i) => <span key={i} className={k === '-' ? 'is-del' : k === '+' ? 'is-ins' : ''}>{k} {line}{'\n'}</span>)}
    </pre>
  )
}

function Log({ log, undoable, onUndo }) {
  if (!log.length) return null
  const undone = new Set(log.map((e) => e.undoes).filter((x) => x !== undefined))
  return (
    <section className="review-block review-log">
      <h2>changes.jsonl</h2>
      <ol>
        {[...log].reverse().map((e) => (
          <li key={e.seq} className={undone.has(e.seq) ? 'is-undone' : ''}>
            <b>#{e.seq}</b>
            <span>{e.why ? L(e.why) : e.ops.map((o) => o.op).join(', ')}</span>
            <small>{e.at.slice(0, 16).replace('T', ' ')}</small>
            {e.seq === undoable && <button type="button" className="kit-btn is-label" onClick={onUndo}><Undo2 size={14} aria-hidden="true" />{tr('撤销', 'Undo')}</button>}
          </li>
        ))}
      </ol>
    </section>
  )
}
