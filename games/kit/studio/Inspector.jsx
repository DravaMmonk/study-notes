// The side panel (games/DESIGN.md 6.7): the one field picked — on the game's page (a click on a text, a test, a task's
// name), in the rows of a file (Rows.jsx), by a finding, the palette or a search — with its control from the schema
// (Fields.jsx, the same controls the forms used), what it means, the findings on it and its undo. Above it the way to
// it, each step a link to the field around it; an item of a list can be moved, copied and taken out here; an optional
// field not written yet is added from here. Picking another field, or another level, changes what it shows.
//
//   <Inspector content base vocab at field ctx onEdit onPick onClose />
//   at: the file shown ({ level } | { game: true }); field: { path } | { missing: text } | null
import { useEffect, useRef } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, Copy, MousePointerClick, Plus, Trash2, X } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { getAt, showPath } from '../engine/ops/edit.js'
import { blank, fieldAt, fileForm, moved, opFor, placeFindings } from './form.js'
import { Field } from './Fields.jsx'

export default function Inspector({ content, vocab, at, field, ctx, places, onEdit, onPick, onClose }) {
  const { vocabulary } = vocab
  const order = ctx.levels
  const file = at?.level ? { level: at.level } : { game: true }
  const shown = field?.path && fileForm(content, vocabulary, at, order)
  const hit = shown ? fieldAt(shown.form, field.path) : null
  const edit = (path, change, type) => onEdit(opFor(file, path, change, type))
  const { at: findings } = shown ? placeFindings(shown.form, places.filter((p) => (at?.level ? p.level === at.level : !p.level))) : { at: new Map() }
  const body = useRef(null)
  // A field picked by a finding, the palette or a search takes the caret.
  useEffect(() => {
    if (!field?.focus) return
    window.setTimeout(() => body.current?.querySelector('input, textarea, [contenteditable="true"], select, button:not(.insp-crumb)')?.focus({ preventScroll: true }))
  }, [field])

  if (!field) {
    return (
      <div className="insp is-empty">
        <p><MousePointerClick size={16} aria-hidden="true" />{tr('点画面上的字、测试、任务，或「字段」里的一行，在这里改它。', 'Click a text, a test or a task on the page, or a row of the fields, to edit it here.')}</p>
      </div>
    )
  }
  if (field.missing || !hit) {
    return (
      <div className="insp">
        <Head path={[]} file={file} onPick={onPick} onClose={onClose} />
        <p className="insp-note">{field.missing ? tr(`「${field.missing}」不是这一关内容里的字段：它由领域生成，在「字段」里找它的来源。`, `“${field.missing}” is no field of the level’s content: the domain makes it; find where it comes from in the fields.`) : tr('这个字段已经不在了。', 'This field is gone.')}</p>
      </div>
    )
  }
  const path = field.path
  const last = path.at(-1)
  const parent = path.slice(0, -1)
  const list = typeof last === 'number' ? getAt(shown.value, parent) : null
  const optional = !list && hit.entry?.optional
  const ctxHere = { ...ctx, findings }
  return (
    <div className="insp">
      <Head path={path} file={file} onPick={onPick} onClose={onClose} />
      {optional && (
        <div className="insp-tools">
          <span>{tr('可选的字段', 'An optional field')}</span>
          <span className="kit-spacer" />
          <button type="button" onClick={() => { edit(path, { unset: true }, null); onPick(parent) }} title={tr('去掉这个字段', 'Remove the field')}><Trash2 size={13} /></button>
        </div>
      )}
      {list && (
        <div className="insp-tools">
          <span>{tr(`第 ${last + 1} 项，共 ${list.length} 项`, `Item ${last + 1} of ${list.length}`)}</span>
          <span className="kit-spacer" />
          <button type="button" disabled={last === 0} onClick={() => { edit(parent, { set: moved(list, last, last - 1) }, 'list'); onPick([...parent, last - 1]) }} title={tr('上移', 'Move up')}><ArrowUp size={13} /></button>
          <button type="button" disabled={last === list.length - 1} onClick={() => { edit(parent, { set: moved(list, last, last + 1) }, 'list'); onPick([...parent, last + 1]) }} title={tr('下移', 'Move down')}><ArrowDown size={13} /></button>
          <button type="button" onClick={() => { edit(parent, { set: [...list.slice(0, last + 1), JSON.parse(JSON.stringify(list[last])), ...list.slice(last + 1)] }, 'list'); onPick([...parent, last + 1]) }} title={tr('复制一份', 'Duplicate')}><Copy size={13} /></button>
          <button type="button" onClick={() => { edit(path, { unset: true }, null); onPick(list.length > 1 ? [...parent, Math.max(0, last - 1)] : parent) }} title={tr('去掉', 'Remove')}><Trash2 size={13} /></button>
        </div>
      )}
      <div className="insp-body" ref={body}>
        {hit.absent ? (
          <div className="insp-absent">
            {hit.absent.about && <p className="insp-about">{L(hit.absent.about)}</p>}
            <button type="button" className="kit-btn is-label" onClick={() => edit(hit.absent.path, { set: blank(hit.absent.schema, { vocabulary, levels: order }) }, hit.absent.schema.type)}><Plus size={13} aria-hidden="true" />{tr(`加上 ${hit.absent.key}`, `Add ${hit.absent.key}`)}</button>
          </div>
        ) : (
          <>
            {(hit.entry?.about ?? hit.field.about) && <p className="insp-about">{L(hit.entry?.about ?? hit.field.about)}</p>}
            <Field field={hit.field} label={null} onEdit={edit} ctx={ctxHere} />
          </>
        )}
      </div>
    </div>
  )
}

/** The way to the field: the file, then each step, a link to the field there. */
function Head({ path, file, onPick, onClose }) {
  const steps = path.map((k, i) => ({ k, at: path.slice(0, i + 1) }))
  return (
    <header className="insp-head">
      <nav className="insp-path" aria-label={tr('字段的位置', 'Where the field is')}>
        <button type="button" className="insp-crumb" onClick={() => onPick([])} disabled={!path.length}>{file.level ?? 'game.json'}</button>
        {steps.map(({ k, at }) => (
          <span key={showPath(at)} className="insp-step">
            <ChevronRight size={11} aria-hidden="true" />
            <button type="button" className="insp-crumb" onClick={() => onPick(at)} disabled={at.length === path.length}>{typeof k === 'number' ? k + 1 : k}</button>
          </span>
        ))}
      </nav>
      <button type="button" className="insp-close" onClick={onClose} aria-label={tr('关上', 'Close')}><X size={13} /></button>
    </header>
  )
}
