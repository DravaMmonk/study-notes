// The changeset review (DIRECTION decision 5): the pending operations, each in the operation set's own words,
// removable, or the changeset taken back to just before it (and what was taken back put again: redo); why the change is made; the save migration it adds; every file it changes, read field by field (a text
// pair side by side, a board line by line, any other value before and after) or as a line diff; then apply it, or
// discard it. A changeset from a file (what an agent hands in) opens as the pending one. Below, the game's change log
// (changes.jsonl), whose last change can be undone.
import { useState } from 'react'
import { Check, FileUp, Redo2, Undo2, X } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { fieldDiff, parsed } from './diff.js'
import { DiffFields, Lines } from './DiffView.jsx'

export default function Review({ ops, redo, result, shown, why, setWhy, said, onRemove, onBack, onRedo, onDiscard, onApply, onUndo, onSelect, onOpen }) {
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
        <FileUp size={14} aria-hidden="true" />{tr('打开变更集')}
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
                  {k < ops.length - 1 && <button type="button" className="field-x" onClick={() => onBack(k + 1)} title={tr('撤回到这里')} aria-label={tr('撤回到这里')}><Undo2 size={13} /></button>}
                  <button type="button" className="field-x" onClick={() => onRemove(k)} aria-label={tr('去掉这个操作')}><X size={13} /></button>
                </li>
              )
            })}
          </ol>
          <input className="field-input review-why" value={why} onChange={(e) => setWhy(e.target.value)} placeholder={tr('为什么改')} />
          {result.problems?.length > 0 && <ul className="audit-lines">{result.problems.map((p) => <li key={p} className="audit-line is-fail">{p}</li>)}</ul>}
          <div className="review-actions">
            <button type="button" className="kit-btn is-label is-solid review-apply" disabled={!ok} onClick={onApply}><Check size={14} aria-hidden="true" />{result.fresh || failed !== null ? tr('应用') : tr('检查中……')}</button>
            <button type="button" className="kit-btn is-label" onClick={onDiscard}><X size={14} aria-hidden="true" />{tr('全部放弃')}</button>
            {redo.length > 0 && <button type="button" className="kit-btn is-label" onClick={onRedo} title="Ctrl/⌘+Shift+Z"><Redo2 size={14} aria-hidden="true" />{redo.length}</button>}
          </div>
          {shown.migration && (
            <section className="review-block">
              <h2>{tr(`存档迁移 v${shown.migration.version}`, `Save migration v${shown.migration.version}`)}</h2>
              <ul className="review-migration">{shown.migration.ops.map((m, k) => <li key={k}><code>{Object.keys(m)[0]}</code> {JSON.stringify(Object.values(m)[0])}</li>)}</ul>
            </section>
          )}
          {shown.changes.map((c) => <FileDiff key={c.file} change={c} onSelect={onSelect} />)}
        </>
      ) : (
        <p className="review-empty">
          {tr('没有待定的修改。')}
          {redo.length > 0 && <button type="button" className="kit-btn is-label" onClick={onRedo}><Redo2 size={14} aria-hidden="true" />{redo.length}</button>}
        </p>
      )}
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
  const state = change.before === null ? tr('新文件') : change.after === null ? tr('删除', 'removed') : null
  return (
    <section className="review-block">
      <h2>
        {level && change.after !== null ? <button type="button" onClick={() => onSelect(level)}>{change.file}</button> : change.file}
        {state && <small>{state}</small>}
        {json && <button type="button" className={`kit-btn is-label ${lines ? 'is-on' : ''}`} onClick={() => setLines(!lines)}>{tr('逐行')}</button>}
      </h2>
      {json && !lines
        ? <DiffFields rows={fieldDiff(parsed(change.before), parsed(change.after))} />
        : <Lines before={change.before ?? ''} after={change.after ?? ''} />}
    </section>
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
            {e.seq === undoable && <button type="button" className="kit-btn is-label" onClick={onUndo}><Undo2 size={14} aria-hidden="true" />{tr('撤销')}</button>}
          </li>
        ))}
      </ol>
    </section>
  )
}
