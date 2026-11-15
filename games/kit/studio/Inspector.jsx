// The side panel (games/DESIGN.md 6.7): the one field picked — on the game's page (a click on a text, a test, a task's
// name), in the rows of a file (Rows.jsx), by a finding, the palette or a search — with its control from the schema
// (Fields.jsx, the same controls the forms used), what it means, the findings on it and its undo. Above it the way to
// it, each step a link to the field around it; an item of a list can be moved, copied and taken out here; an optional
// field not written yet is added from here. A task of a level whose tasks have ids (../engine/tasks.js) is moved,
// copied, taken out, moved into another level and renamed by the task operations, so what players kept of it follows
// it. Picking another field, or another level, changes what it shows.
//
//   <Inspector content vocab at field ctx onEdit onOps onPick onLevel onRemoveLevel onRemoveSelection />
//   at: the file shown ({ level } | { game: true } | { parts: true }: pieces.json, with root: [collection, id] | { glossary: true }); field: { path } | { missing: text } | null
import { useEffect, useRef } from 'react'
import { ArrowDown, ArrowUp, ArrowRightLeft, Braces, ChevronRight, Copy, MousePointerClick, Pin, Trash2 } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { getAt, setAt, showPath } from '../engine/ops/edit.js'
import { settingReferences } from '../engine/pieces.js'
import { fieldAt, fileForm, moved, opFor, placeFindings, taskListOps } from './form.js'
import { Field } from './Fields.jsx'
import { AddFields, SettingUsers } from './PartFields.jsx'
import { Picker } from './Picker.jsx'
import { usePref } from './prefs.js'
import SourceEditor from './SourceEditor.jsx'
import { sourceOps } from './source.js'
import { confirmDelete, removesContent } from './delete.js'
import InspectorTabs, { inspectorTabKey } from './InspectorTabs.jsx'

export default function Inspector({ content, vocab, at, field, pendingFace, ctx, places, tabs, selection,
  onEdit, onOps, onPick, onNavigate, onLevel, onRemoveLevel, onRemoveSelection, onToggleTab, onOpenTab, onCloseTab }) {
  const [json, setJson] = usePref('inspector-json', false)
  const { vocabulary } = vocab
  const order = ctx.levels
  const root = at?.root ?? []
  const file = at?.level ? { level: at.level } : at?.parts ? { parts: true } : at?.glossary ? { glossary: content.glossary } : { game: true }
  const pathToFace = pendingFace && field.path.slice(0, 4)
  const partDefs = content.partDefs
  const part = pathToFace && partDefs?.parts?.[pathToFace[1]]
  const face = pathToFace && pathToFace[3]
  const preview = part && (part.views?.[face]?.length ?? -1) < pendingFace.length
    ? { ...content, partDefs: setAt(partDefs, pathToFace.slice(0, 3), { ...part.views, [face]: pendingFace }) }
    : content
  const shown = field?.path && fileForm(preview, vocabulary, at, order)
  // An item of a list drawn as one control (chips, a table, a row of numbers) has no field of its own: the list's.
  let held = field?.path ?? []
  let hit = shown ? fieldAt(shown.form, held) : null
  while (shown && !hit && typeof held.at(-1) === 'number') {
    held = held.slice(0, -1)
    hit = fieldAt(shown.form, held)
  }
  const path = hit ? held : field?.path ?? root
  const trail = field?.trail ?? path
  const currentKey = inspectorTabKey(selection, path)
  const pinned = Boolean(field?.path) && tabs.some((tab) => inspectorTabKey(tab.at, tab.path) === currentKey)
  const active = field?.path ? pinned ? currentKey : inspectorTabKey(selection, trail) : null
  const tabsRow = <InspectorTabs tabs={tabs} active={active} content={content} onOpen={onOpenTab} onClose={onCloseTab} />
  const openCrumb = (path) => {
    const target = getAt(shown?.value, path)
    if (!longConfig(target) || window.confirm(tr(
      '这段配置较长，打开可能需要一些时间。是否继续？',
      'This configuration is large and may take a while to open. Continue?',
    ))) onNavigate(path, trail)
  }
  const tasked = Boolean(at?.level)
  const edit = (path, change, type) => {
    // A task's id changes by task.rename, so what players kept of it follows.
    if (tasked && path.length === 3 && path[0] === 'tasks' && path[2] === 'id' && change.set !== undefined) return onEdit({ op: 'task.rename', task: getAt(shown.value, path), to: change.set })
    // The task list edited as a whole goes task by task, so each task's board stays with it.
    if (tasked && path.length === 1 && path[0] === 'tasks' && Array.isArray(change.set)) return onOps(taskListOps(at.level, getAt(shown.value, path) ?? [], change.set, content.levels))
    const op = opFor(file, path, change, type)
    if (op) onEdit(op)
    return undefined
  }
  const body = useRef(null)
  // A field picked by a finding, the palette or a search takes the caret.
  useEffect(() => {
    const panel = body.current?.closest('.studio-side')
    if (panel) panel.scrollTop = 0
    if (!field?.focus) return
    window.setTimeout(() => body.current?.querySelector('input, textarea, [contenteditable="true"], select, button:not(.insp-crumb)')?.focus({ preventScroll: true }))
  }, [field])

  if (!field) {
    return (
      <div className="insp is-empty">
        {tabs.length > 0 && <div className="insp-bar">{tabsRow}</div>}
        <div className="insp-empty-note"><p><MousePointerClick size={16} aria-hidden="true" />{tr('点画面上的字、测试、任务，或「字段」里的一行，在这里改它。')}</p></div>
      </div>
    )
  }
  const definition = hit?.field && root.length === 2 && path.length === 2 && root.every((key, i) => key === path[i])
  const inUse = definition && root[0] === 'settings' && settingReferences(partDefs, root[1]).length > 0
  const removeDefinition = () => {
    if (!confirmDelete(root[1])) return
    edit(path, { unset: true })
    onRemoveSelection()
  }
  const remove = tasked && !path.length && shown ? () => onRemoveLevel(at.level) : definition ? removeDefinition : null
  const header = (
    <div className="insp-bar">
      {tabsRow}
      <Head path={path} trail={trail} file={file} onPick={openCrumb} json={json} onToggleJson={() => setJson(!json)}
        pinned={pinned} onPin={hit ? () => onToggleTab(path) : null}
        about={L(hit?.entry?.about ?? hit?.field?.about ?? hit?.absent?.about)} onRemove={remove} inUse={inUse} />
    </div>
  )
  if (json) {
    return (
      <div className="insp">
        {header}
        <div className="insp-body" ref={body}>
          {!shown
            ? <p className="insp-about">{tr('这个字段没有 JSON 值。', 'This field has no JSON value.')}</p>
            : <SourceEditor key={JSON.stringify([content.id, at, path])} source={JSON.stringify(getAt(shown.value, path), null, 2) ?? ''}
              onApply={(value) => {
                const ops = sourceOps(file, shown.value, path, value, vocabulary, content.levels)
                if (ops.length && removesContent(getAt(shown.value, path), value) && !confirmDelete()) return false
                onOps(ops)
                return true
              }} />}
        </div>
      </div>
    )
  }
  if (field.missing || !hit) {
    return (
      <div className="insp">
        {header}
        <p className="insp-note">{field.missing ? tr(`「${field.missing}」不是这一关内容里的字段：它由领域生成，在「字段」里找它的来源。`, `“${field.missing}” is no field of the level’s content: the domain makes it; find where it comes from in the fields.`) : tr('这个字段已经不在了。')}</p>
      </div>
    )
  }
  const last = path.at(-1)
  const parent = path.slice(0, -1)
  const isTask = tasked && path.length === 2 && path[0] === 'tasks'
  const list = typeof last === 'number' && !isTask ? getAt(shown.value, parent) : null
  const optional = !list && hit.entry?.optional
  const { at: findings } = placeFindings(shown.form, places.filter((p) => (at?.level ? p.level === at.level : at?.parts ? p.file === 'parts' : at?.glossary ? p.file === 'glossary' : !p.level && !p.file)))
  const ctxHere = { ...ctx, findings, partDefs }
  return (
    <div className="insp">
      {header}
      {path[0] === 'settings' && typeof path[1] === 'string' && <SettingUsers file={partDefs} id={path[1]} onPiece={ctx.onPiece} />}
      {optional && (
        <div className="insp-tools">
          <span>{tr('可选的字段')}</span>
          <span className="kit-spacer" />
          <button type="button" onClick={() => { if (confirmDelete(showPath(path))) { edit(path, { unset: true }, null); onPick(parent) } }} title={tr('去掉这个字段')}><Trash2 size={13} /></button>
        </div>
      )}
      {isTask && <TaskTools content={content} level={at.level} tasks={shown.value.tasks} k={last} ctx={ctx} onEdit={onEdit} onOps={onOps} onPick={onPick} onLevel={onLevel} />}
      {list && (
        <div className="insp-tools">
          <span>{tr(`第 ${last + 1} 项，共 ${list.length} 项`, `Item ${last + 1} of ${list.length}`)}</span>
          <span className="kit-spacer" />
          <button type="button" disabled={last === 0} onClick={() => { edit(parent, { set: moved(list, last, last - 1) }, 'list'); onPick([...parent, last - 1]) }} title={tr('上移')}><ArrowUp size={13} /></button>
          <button type="button" disabled={last === list.length - 1} onClick={() => { edit(parent, { set: moved(list, last, last + 1) }, 'list'); onPick([...parent, last + 1]) }} title={tr('下移')}><ArrowDown size={13} /></button>
          {!(root[0] === 'parts' && path[2] === 'settings' && path.length === 4) && <button type="button" onClick={() => { edit(parent, { set: [...list.slice(0, last + 1), JSON.parse(JSON.stringify(list[last])), ...list.slice(last + 1)] }, 'list'); onPick([...parent, last + 1]) }} title={tr('复制一份')}><Copy size={13} /></button>}
          <button type="button" onClick={() => { if (confirmDelete(showPath(path))) { edit(path, { unset: true }, null); onPick(list.length > 1 ? [...parent, Math.max(0, last - 1)] : parent) } }} title={tr('去掉')}><Trash2 size={13} /></button>
        </div>
      )}
      <div className="insp-body" ref={body}>
        {hit.absent ? (
          <div className="insp-absent">
            <AddFields fields={[hit.absent]} ctx={ctxHere}
              onAdd={(f, value) => edit(f.path, { set: value }, f.schema.type)} />
          </div>
        ) : (
          <Field key={JSON.stringify([at, path])} field={hit.field} label={null} onEdit={edit} ctx={ctxHere} />
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
    if (only && !window.confirm(tr(`确定移走任务并删除关卡「${level}」吗？`, `Move the task and delete level “${level}”?`))) return
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
      <button type="button" disabled={only} onClick={() => { if (confirmDelete(task.id)) { onEdit({ op: 'task.remove', task: task.id }); onPick(['tasks', Math.max(0, k - 1)]) } }} title={only ? tr('一关至少留一个任务') : tr('去掉这个任务')}><Trash2 size={13} /></button>
      <span className="insp-move" title={only ? tr('并进另一关：这一关只有这个任务，挪过去后删掉这一关') : tr('挪进另一关（排在它的任务最后）')}>
        <ArrowRightLeft size={13} aria-hidden="true" />
        <small>{only ? tr('并进') : tr('挪进')}</small>
        <Picker options={others} value={undefined} onPick={into} label={only ? tr('并进…') : tr('挪进…')} />
      </span>
    </div>
  )
}

/** Stop counting once rendering the value would exceed the inspector's normal size. */
function longConfig(value) {
  const pending = [value]
  let budget = 1200
  while (pending.length && budget > 0) {
    const next = pending.pop()
    budget -= typeof next === 'string' ? Math.max(1, next.length / 36) : 1
    if (next && typeof next === 'object') {
      const children = Object.values(next)
      if (children.length > budget) return true
      pending.push(...children)
    }
  }
  return budget <= 0
}

/** Breadcrumbs always start at the original JSON file. */
function Head({ path, trail, file, onPick, json, onToggleJson, about, pinned, onPin, onRemove, inUse }) {
  const name = file.level ? `levels/${file.level}.json` : file.parts ? 'pieces.json' : file.glossary ? 'glossary.json' : 'game.json'
  const jsonLabel = tr('JSON 源码', 'JSON source')
  const pinLabel = tr('固定配置标签页', 'Pin configuration tab')
  return (
    <header className="insp-head">
      <button type="button" className="insp-pin" onClick={onPin} disabled={!onPin} aria-pressed={pinned}
        aria-label={pinLabel} title={pinned ? tr('取消固定', 'Unpin tab') : pinLabel}><Pin size={13} aria-hidden="true" /></button>
      <nav className="insp-path" aria-label={tr('字段的位置')}>
        <button type="button" className="insp-crumb" onClick={() => onPick([])} disabled={!path.length}
          aria-current={!path.length ? 'location' : undefined} title={!path.length ? about : undefined}>{name}</button>
        {trail.map((k, i) => {
          const at = trail.slice(0, i + 1)
          const current = at.length === path.length
          return (
            <span key={showPath(at)} className="insp-step" title={current ? about : undefined}>
              <ChevronRight size={11} aria-hidden="true" />
              <button type="button" className="insp-crumb" onClick={() => onPick(at)} disabled={current}
                aria-current={current ? 'location' : undefined}>{typeof k === 'number' ? k + 1 : k}</button>
            </span>
          )
        })}
      </nav>
      <button type="button" className="insp-source" onClick={onToggleJson} aria-pressed={json} aria-label={jsonLabel} title={jsonLabel}><Braces size={13} aria-hidden="true" /></button>
      {onRemove && <button type="button" className="insp-delete" onClick={onRemove} disabled={inUse}
        title={inUse ? tr('仍有件引用这项设置', 'This setting is still used by pieces') : tr('删除', 'Delete')} aria-label={tr('删除', 'Delete')}>
        <Trash2 size={13} aria-hidden="true" />
      </button>}
    </header>
  )
}
