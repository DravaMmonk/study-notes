// The tray and section editors of the build workspace (games/MODULES.md 5.3.1): objects that gather parts (a tray,
// with its menus) or encyclopedia entries (a section). What they hold, and the order they show it in, is their own
// `list` fields — `values` (members, stages, tags of them) and a tray's `menus` — dragged or moved with Alt+↑/↓.
// Another package's tray or section is read only until it is overridden here; the override then writes what changed,
// a list by its patch (collection-edit.js), so what that package adds later still comes through.
import { useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Trash2, X } from 'lucide-react'
import { L, getLang, tr } from '../shell/i18n.js'
import { Picker } from './Picker.jsx'
import { TextField } from './TextField.jsx'
import SourceMark from './SourceMark.jsx'
import { confirmDelete } from './delete.js'
import { localName, namespaceOf, shownName, tagByRef, tagName } from './objects-edit.js'
import { objectOp } from './object-file.js'
import { objectOverrideOps, overridesIt } from './override-edit.js'
import { textWith } from './tag-edit.js'
import { reordered } from './list-order.js'
import { useDragOrder } from './useDragOrder.js'

// The collection fields of the gathering objects: how an override writes each (games/MODULES.md 5.3.1).
const FIELDS = { values: 'list', menus: 'list' }

/** The writes of one gathering object: its own by its object operation, another package's by an override of what changed. */
export function gatherWriter({ kind, full, namespace, own, value, content, onEdit, onOps }) {
  const declared = content.objectKinds?.[kind]?.extends ? null : content.objectKinds?.[kind] ?? null
  return {
    set: (key, data) => (own
      ? onEdit(objectOp({ kind, full, namespace, value, declared }, [key], { set: data }))
      : onOps(objectOverrideOps(content, namespace, kind, full, { ...value, [key]: data }, FIELDS))),
  }
}
export const withoutId = ({ id: _, ...rest }) => rest

/**
 * A list field's members in their order: each a reference (a member, a stage, `#tag`) and what it is called, dragged or
 * moved with Alt+↑/↓ (or its buttons) and taken out, unless `locked`. `onChange(next)` writes the whole new list.
 */
export function Members({ refs, titleOf, namespace, locked, onChange }) {
  const move = (id, to) => onChange(reordered(refs, [id], to))
  const { item } = useDragOrder({ ids: refs, onMove: move, disabled: locked || refs.length < 2 })
  return (
    <ol className="gather-order">
      {refs.map((ref, k) => (
        <li key={ref} className={`tag-member ${ref.startsWith('#') ? 'is-tag' : ''}`} {...item(ref)} tabIndex={locked ? undefined : 0}>
          {!locked && refs.length > 1 && <span className="member-grip" aria-hidden="true"><GripVertical size={12} /></span>}
          <code>{shownName(namespace, ref)}</code><span>{titleOf(ref)}</span>
          {!locked && <span className="member-move">
            {refs.length > 1 && <>
              <button type="button" className="kit-btn editor-tool" disabled={k === 0} aria-label={tr('上移', 'Move up')} title={tr('上移', 'Move up') + ' (Alt+↑)'} onClick={() => move(ref, { before: refs[k - 1] })}><ArrowUp size={12} aria-hidden="true" /></button>
              <button type="button" className="kit-btn editor-tool" disabled={k === refs.length - 1} aria-label={tr('下移', 'Move down')} title={tr('下移', 'Move down') + ' (Alt+↓)'} onClick={() => move(ref, { after: refs[k + 1] })}><ArrowDown size={12} aria-hidden="true" /></button>
            </>}
            <button type="button" className="kit-btn editor-tool" aria-label={tr('去掉')} title={tr('去掉')} onClick={() => onChange(refs.filter((r) => r !== ref))}><X size={12} aria-hidden="true" /></button>
          </span>}
        </li>
      ))}
    </ol>
  )
}

/** The head of a gathering object: its name, where it comes from, its title, and its removal. */
export function GatherHead({ kind, full, value, own, overriding, setOverriding, content, namespace, pending, write, onRemove, onPick, children }) {
  const lang = getLang()
  return (
    <>
      <div className="object-head">
        <code className="editor-id is-static">{shownName(namespace, full)}</code>
        <SourceMark content={content} kind={kind} full={full} own={own} overriding={overriding} pending={pending} onOverride={() => setOverriding(true)} />
        {children}
        <span className="kit-spacer" />
        {own && onRemove && <button type="button" className="kit-btn editor-tool" disabled={pending} title={tr('删除', 'Delete')} aria-label={tr('删除', 'Delete')} onClick={onRemove}><Trash2 size={14} aria-hidden="true" /></button>}
      </div>
      <div className="object-title" onClick={() => onPick?.(['title'])}>
        {own || overriding
          ? <TextField key={lang} lang={lang} value={value.title} label={tr('标题', 'Title')} placeholder={tr('标题', 'Title')} compact
            onSet={(text) => { if (!pending) write.set('title', textWith(namespace, value.title, lang, text)) }} />
          : <span>{L(value.title)}</span>}
      </div>
    </>
  )
}

/** The section `full`: its entries, and the order the encyclopedia shows them in. */
export function SectionEditor({ content, namespace, full, pending, onSelect, onEdit, onOps, onPick }) {
  const value = content?.registries?.section?.[full]
  const [overriding, setOverriding] = useState(() => overridesIt(content, namespace, 'section', full))
  if (!value) return <article className="arrange" />
  const own = namespaceOf(full) === namespace
  const editable = own || overriding
  const locked = pending || !editable
  const write = gatherWriter({ kind: 'section', full, namespace, own, value: withoutId(value), content, onEdit, onOps })
  const entries = content.registries?.entry ?? {}
  const titleOf = (ref) => (ref.startsWith('#') ? L(tagByRef(content, 'entry', ref)?.title) : L(entries[ref]?.title)) ?? ''
  const refs = value.values ?? []
  const candidates = [
    ...Object.keys(entries).filter((id) => !refs.includes(id)).map((id) => ({ value: id, label: shownName(namespace, id), title: titleOf(id), group: tr('词条', 'Entries') })),
    ...Object.entries(content.registries?.tag ?? {}).filter(([name, tag]) => tag.kind === 'entry' && !refs.includes(`#${tagName(name)}`)).map(([name]) => ({ value: `#${tagName(name)}`, label: shownName(namespace, `#${name}`), title: titleOf(`#${name}`), group: tr('标签', 'Tags') })),
  ]
  const remove = () => {
    if (!own || pending || !confirmDelete(shownName(namespace, full))) return
    onEdit({ op: 'section.remove', section: localName(namespace, full) })
    onSelect(null)
  }
  return (
    <article className="arrange gather-editor">
      <GatherHead kind="section" full={full} value={value} own={own} overriding={overriding} setOverriding={setOverriding} content={content} namespace={namespace} pending={pending} write={write} onRemove={remove} onPick={onPick} />
      <section className="gather-part" onClick={() => onPick?.(['values'])}>
        <h3>{tr('词条', 'Entries')}</h3>
        <Members refs={refs} titleOf={titleOf} namespace={namespace} locked={locked} onChange={(values) => write.set('values', values)} />
        {!locked && <Picker options={candidates} add label={tr('加入', 'Add')} placeholder={tr('加入', 'Add')} onPick={(ref) => write.set('values', [...refs, ref])} />}
      </section>
    </article>
  )
}
