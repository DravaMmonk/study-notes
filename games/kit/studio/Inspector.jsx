// The side panel (games/DESIGN.md 6.7): the one field picked — on the game's page (a click on a text, a test, a task's
// name), in the rows of a file (Rows.jsx), by a finding, the palette or a search — with its control from the schema
// (Fields.jsx, the same controls the forms used), what it means, the findings on it and its undo. Above it the way to
// it, each step a link to the field around it; an item of a list can be moved, copied and taken out here; an optional
// field not written yet is added from here. A task of a level whose tasks have ids (../engine/tasks.js) is moved,
// copied, taken out, moved into another level and renamed by the task operations, so what players kept of it follows
// it. Picking another field, or another level, changes what it shows.
//
//   <Inspector content base vocab at field ctx onEdit onOps onPick onClose onLevel />
//   at: the file shown ({ level } | { game: true } | { parts: true }: parts.json); field: { path } | { missing: text } | null
import { useEffect, useRef } from 'react'
import { ArrowDown, ArrowUp, ArrowRightLeft, ChevronRight, Copy, MousePointerClick, Plus, Trash2, X } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { getAt, showPath } from '../engine/ops/edit.js'
import { blank, fieldAt, fileForm, moved, opFor, placeFindings, taskListOps } from './form.js'
import { Field } from './Fields.jsx'
import { Picker } from './Picker.jsx'

export default function Inspector({ content, vocab, at, field, ctx, places, onEdit, onOps, onPick, onClose, onLevel }) {
  const { vocabulary } = vocab
  const order = ctx.levels
  const file = at?.level ? { level: at.level } : at?.parts ? { parts: true } : { game: true }
  const shown = field?.path && fileForm(content, vocabulary, at, order)
  const hit = shown ? fieldAt(shown.form, field.path) : null
  const tasked = Boolean(at?.level)
  const edit = (path, change, type) => {
    // A task's id changes by task.rename, so what players kept of it follows.
    if (tasked && path.length === 3 && path[0] === 'tasks' && path[2] === 'id' && change.set !== undefined) return onEdit({ op: 'task.rename', task: getAt(shown.value, path), to: change.set })
    // The task list edited as a whole goes task by task, so each task's board stays with it.
    if (tasked && path.length === 1 && path[0] === 'tasks' && Array.isArray(change.set)) return onOps(taskListOps(at.level, getAt(shown.value, path) ?? [], change.set, content.levels))
    return onEdit(opFor(file, path, change, type))
  }
  const { at: findings } = shown ? placeFindings(shown.form, places.filter((p) => (at?.level ? p.level === at.level : at?.parts ? p.file === 'parts' : !p.level && !p.file))) : { at: new Map() }
  const body = useRef(null)
  // A field picked by a finding, the palette or a search takes the caret.
  useEffect(() => {
    if (!field?.focus) return
    window.setTimeout(() => body.current?.querySelector('input, textarea, [contenteditable="true"], select, button:not(.insp-crumb)')?.focus({ preventScroll: true }))
  }, [field])

  if (!field) {
    return (
      <div className="insp is-empty">
        <p><MousePointerClick size={16} aria-hidden="true" />{tr('点画面上的字、测试、任务，或「字段」里的一行，在这里改它。')}</p>
      </div>
    )
  }
  if (field.missing || !hit) {
    return (
      <div className="insp">
        <Head path={[]} file={file} onPick={onPick} onClose={onClose} />
        <p className="insp-note">{field.missing ? tr(`「${field.missing}」不是这一关内容里的字段：它由领域生成，在「字段」里找它的来源。`, `“${field.missing}” is no field of the level’s content: the domain makes it; find where it comes from in the fields.`) : tr('这个字段已经不在了。')}</p>
      </div>
    )
  }
  const path = field.path
  const last = path.at(-1)
  const parent = path.slice(0, -1)
  const isTask = tasked && path.length === 2 && path[0] === 'tasks'
  const list = typeof last === 'number' && !isTask ? getAt(shown.value, parent) : null
  const optional = !list && hit.entry?.optional
  const ctxHere = { ...ctx, findings, partDefs: content.partDefs }
  return (
    <div className="insp">
      <Head path={path} file={file} onPick={onPick} onClose={onClose} />
      {optional && (
        <div className="insp-tools">
          <span>{tr('可选的字段')}</span>
          <span className="kit-spacer" />
          <button type="button" onClick={() => { edit(path, { unset: true }, null); onPick(parent) }} title={tr('去掉这个字段')}><Trash2 size={13} /></button>
        </div>
      )}
      {isTask && <TaskTools content={content} level={at.level} tasks={shown.value.tasks} k={last} ctx={ctx} onEdit={onEdit} onOps={onOps} onPick={onPick} onLevel={onLevel} />}
      {list && (
        <div className="insp-tools">
          <span>{tr(`第 ${last + 1} 项，共 ${list.length} 项`, `Item ${last + 1} of ${list.length}`)}</span>
          <span className="kit-spacer" />
          <button type="button" disabled={last === 0} onClick={() => { edit(parent, { set: moved(list, last, last - 1) }, 'list'); onPick([...parent, last - 1]) }} title={tr('上移')}><ArrowUp size={13} /></button>
          <button type="button" disabled={last === list.length - 1} onClick={() => { edit(parent, { set: moved(list, last, last + 1) }, 'list'); onPick([...parent, last + 1]) }} title={tr('下移')}><ArrowDown size={13} /></button>
          <button type="button" onClick={() => { edit(parent, { set: [...list.slice(0, last + 1), JSON.parse(JSON.stringify(list[last])), ...list.slice(last + 1)] }, 'list'); onPick([...parent, last + 1]) }} title={tr('复制一份')}><Copy size={13} /></button>
          <button type="button" onClick={() => { edit(path, { unset: true }, null); onPick(list.length > 1 ? [...parent, Math.max(0, last - 1)] : parent) }} title={tr('去掉')}><Trash2 size={13} /></button>
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

/**
 * A task's own tools: up, down, a copy after it (a new id), out of the level (not its only task), and into another
 * level — its only task too, the level then removed with it. Each is a task operation, the saves following the id.
 */
function TaskTools({ content, level, tasks, k, ctx, onEdit, onOps, onPick, onLevel }) {
  const task = tasks[k]
  const place = (j) => (j === 0 ? { first: true } : { after: tasks[j - 1].id })
  const only = tasks.length === 1
  const others = (ctx.levelOptions ?? []).filter((o) => o.value !== level)
  const into = (to) => {
    const ops = [{ op: 'task.move', task: task.id, to: { level: to } }, ...(only ? [{ op: 'level.remove', level }] : [])]
    onOps(ops)
    const n = content.levels.find((l) => l.id === to)?.tasks?.length ?? 0
    onLevel(to, ['tasks', n])
  }
  return (
    <div className="insp-tools is-task">
      <span>{tr(`任务 ${k + 1} / ${tasks.length}`, `Task ${k + 1} of ${tasks.length}`)}</span>
      <span className="kit-spacer" />
      <button type="button" disabled={k === 0} onClick={() => { onEdit({ op: 'task.move', task: task.id, to: { level, ...place(k - 1) } }); onPick(['tasks', k - 1]) }} title={tr('上移')}><ArrowUp size={13} /></button>
      <button type="button" disabled={k === tasks.length - 1} onClick={() => { onEdit({ op: 'task.move', task: task.id, to: { level, after: tasks[k + 1].id } }); onPick(['tasks', k + 1]) }} title={tr('下移')}><ArrowDown size={13} /></button>
      <button type="button" onClick={() => { const { id: _id, ...data } = task; onEdit({ op: 'task.add', level, data, after: task.id }); onPick(['tasks', k + 1]) }} title={tr('复制成新的任务')}><Copy size={13} /></button>
      <button type="button" disabled={only} onClick={() => { onEdit({ op: 'task.remove', task: task.id }); onPick(['tasks', Math.max(0, k - 1)]) }} title={only ? tr('一关至少留一个任务') : tr('去掉这个任务')}><Trash2 size={13} /></button>
      <span className="insp-move" title={only ? tr('并进另一关：这一关只有这个任务，挪过去后删掉这一关') : tr('挪进另一关（排在它的任务最后）')}>
        <ArrowRightLeft size={13} aria-hidden="true" />
        <small>{only ? tr('并进') : tr('挪进')}</small>
        <Picker options={others} value={undefined} onPick={into} label={only ? tr('并进…') : tr('挪进…')} />
      </span>
    </div>
  )
}

/** The way to the field: the file, then each step, a link to the field there. */
function Head({ path, file, onPick, onClose }) {
  const steps = path.map((k, i) => ({ k, at: path.slice(0, i + 1) }))
  return (
    <header className="insp-head">
      <nav className="insp-path" aria-label={tr('字段的位置')}>
        <button type="button" className="insp-crumb" onClick={() => onPick([])} disabled={!path.length}>{file.level ?? (file.parts ? 'parts.json' : 'game.json')}</button>
        {steps.map(({ k, at }) => (
          <span key={showPath(at)} className="insp-step">
            <ChevronRight size={11} aria-hidden="true" />
            <button type="button" className="insp-crumb" onClick={() => onPick(at)} disabled={at.length === path.length}>{typeof k === 'number' ? k + 1 : k}</button>
          </span>
        ))}
      </nav>
      <button type="button" className="insp-close" onClick={onClose} aria-label={tr('关上')}><X size={13} /></button>
    </header>
  )
}
