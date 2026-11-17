// The tray and section editors of the build workspace (games/MODULES.md 5.3.1): objects that gather parts (a tray,
// with its menus) or encyclopedia entries (a section). What they hold, and the order they show it in, is their own
// `list` fields — `values` (members, stages, tags of them) and a tray's `menus` — dragged or moved with Alt+↑/↓.
// Another package's tray or section is read only until it is overridden here; the override then writes what changed,
// a list by its patch (collection-edit.js), so what that package adds later still comes through.
import { grantObjects, grants } from '../../../packages/circuit/core/index.js'
import { useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, X } from 'lucide-react'
import { L, getLang, tr } from '../shell/i18n.js'
import { Picker } from './Picker.jsx'
import { TextField } from './TextField.jsx'
import SourceMark from './SourceMark.jsx'
import { confirmDelete } from './delete.js'
import { localName, namespaceOf, shownName, tagByRef, tagKeyOfRef, tagName } from './objects-edit.js'
import { objectOp } from './object-file.js'
import { objectOverrideOps, overridesIt } from './override-edit.js'
import { textWith } from './tag-edit.js'
import { reordered } from './list-order.js'
import { useDragOrder } from './useDragOrder.js'
import { stageOwners } from './list-groups.js'

// The collection fields of the gathering objects: how an override writes each (games/MODULES.md 5.3.1).
const FIELDS = { values: 'list', menus: 'list' }

/** The writes of one gathering object: its own by its object operation, another package's by an override of what changed. */
function writer({ kind, full, namespace, own, value, content, onEdit, onOps }) {
  const declared = content.objectKinds?.[kind]?.extends ? null : content.objectKinds?.[kind] ?? null
  return {
    set: (key, data) => (own
      ? onEdit(objectOp({ kind, full, namespace, value, declared }, [key], { set: data }))
      : onOps(objectOverrideOps(content, namespace, kind, full, { ...value, [key]: data }, FIELDS))),
  }
}
const withoutId = ({ id: _, ...rest }) => rest

/**
 * A list field's members in their order: each a reference (a member, a stage, `#tag`) and what it is called, dragged or
 * moved with Alt+↑/↓ (or its buttons) and taken out, unless `locked`. `onChange(next)` writes the whole new list.
 */
function Members({ refs, titleOf, namespace, locked, onChange }) {
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
function Head({ kind, full, value, own, overriding, setOverriding, content, namespace, pending, write, onRemove, onPick, children }) {
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

/** The tray `full`: its members and menus, and the order the tray shows them in. */
export function TrayEditor({ content, namespace, full, pending, onSelect, onEdit, onOps, onPick }) {
  const value = content?.registries?.['circuit/tray']?.[full]
  const [overriding, setOverriding] = useState(() => overridesIt(content, namespace, 'circuit/tray', full))
  if (!value) return <article className="arrange" />
  const own = namespaceOf(full) === namespace
  const editable = own || overriding
  const locked = pending || !editable
  const write = writer({ kind: 'circuit/tray', full, namespace, own, value: withoutId(value), content, onEdit, onOps })
  const parts = grantObjects(content)
  const owners = stageOwners(content)
  const titleOf = (ref) => {
    if (ref.startsWith('#')) return L(content.registries?.tag?.[tagKeyOfRef(content, [...grants.types.keys()], ref)]?.title)
    const part = parts[owners.get(ref) ?? ref]
    return L(part?.name) ?? ''
  }
  const candidates = (taken) => [
    ...[...owners.keys()].filter((id) => !taken.includes(id)).map((id) => ({ value: id, label: shownName(namespace, id), title: titleOf(id), group: owners.get(id) === id ? tr('元件', 'Parts') : tr('阶段', 'Stages') })),
    ...Object.entries(content.registries?.tag ?? {}).filter(([name, tag]) => grants.types.has(tag.kind) && !taken.includes(`#${tagName(name)}`)).map(([name]) => ({ value: `#${tagName(name)}`, label: shownName(namespace, `#${name}`), title: titleOf(`#${name}`), group: tr('标签', 'Tags') })),
  ]
  const menus = value.menus ?? []
  const setMenus = (next) => write.set('menus', next)
  const remove = () => {
    if (!own || pending || !confirmDelete(shownName(namespace, full))) return
    onEdit({ op: 'object.remove', kind: 'circuit/tray', name: localName(namespace, full) })
    onSelect(null)
  }
  const setMenu = (m, change) => setMenus(menus.map((x, k) => (k === m ? { ...x, ...change } : x)))
  const newMenu = () => {
    let k = menus.length + 1
    while (menus.some((menu) => localName(namespace, menu.id) === `menu-${k}` || menu.id === `menu-${k}`)) k += 1
    setMenus([...menus, { id: `menu-${k}`, title: { [getLang()]: tr('新的菜单', 'New menu') }, values: [] }])
  }
  return (
    <article className="arrange gather-editor">
      <Head kind="circuit/tray" full={full} value={value} own={own} overriding={overriding} setOverriding={setOverriding} content={content} namespace={namespace} pending={pending} write={write} onRemove={remove} onPick={onPick}>
        <label className="object-flag">
          <input type="checkbox" className="field-check" checked={value.workshop ?? true} disabled={locked} onChange={(e) => write.set('workshop', e.target.checked)} />
          {tr('工坊', 'Workshop')}
        </label>
      </Head>
      {menus.map((menu, m) => (
        <section key={menu.id} className="gather-part is-menu" onClick={() => onPick?.(['menus', m])}>
          <h3>
            <code>{shownName(namespace, menu.id)}</code>
            {editable ? <TextField key={getLang()} lang={getLang()} value={menu.title} label={tr('菜单名', 'Menu title')} compact
              onSet={(text) => { if (!pending) setMenus(menus.map((x, k) => (k === m ? { ...x, title: textWith(namespace, x.title, getLang(), text) } : x))) }} />
              : <span>{L(menu.title)}</span>}
            {!locked && menus.length > 1 && <>
              <button type="button" className="kit-btn editor-tool" disabled={m === 0} aria-label={tr('菜单上移', 'Move the menu up')} title={tr('菜单上移', 'Move the menu up')}
                onClick={() => setMenus(reordered(menus.map((x) => x.id), [menu.id], { before: menus[m - 1].id }).map((id) => menus.find((x) => x.id === id)))}><ArrowUp size={13} aria-hidden="true" /></button>
              <button type="button" className="kit-btn editor-tool" disabled={m === menus.length - 1} aria-label={tr('菜单下移', 'Move the menu down')} title={tr('菜单下移', 'Move the menu down')}
                onClick={() => setMenus(reordered(menus.map((x) => x.id), [menu.id], { after: menus[m + 1].id }).map((id) => menus.find((x) => x.id === id)))}><ArrowDown size={13} aria-hidden="true" /></button>
            </>}
            {!locked && <button type="button" className="kit-btn editor-tool" title={tr('删除菜单', 'Delete the menu')} aria-label={tr('删除菜单', 'Delete the menu')}
              onClick={() => { if (confirmDelete(shownName(namespace, menu.id))) setMenus(menus.filter((_, k) => k !== m)) }}><Trash2 size={13} aria-hidden="true" /></button>}
          </h3>
          <Members refs={menu.values ?? []} titleOf={titleOf} namespace={namespace} locked={locked} onChange={(values) => setMenu(m, { values })} />
          {!locked && <Picker options={candidates(menu.values ?? [])} add label={tr('加入', 'Add')} placeholder={tr('加入', 'Add')}
            onPick={(ref) => setMenu(m, { values: [...(menu.values ?? []), ref] })} />}
        </section>
      ))}
      {!locked && <button type="button" className="kit-btn is-label gather-add" onClick={newMenu}><Plus size={13} aria-hidden="true" />{tr('新的菜单', 'New menu')}</button>}
      <section className="gather-part" onClick={() => onPick?.(['values'])}>
        <h3>{tr('托盘上', 'On the tray')}</h3>
        <Members refs={value.values ?? []} titleOf={titleOf} namespace={namespace} locked={locked} onChange={(values) => write.set('values', values)} />
        {!locked && <Picker options={candidates(value.values ?? [])} add label={tr('加入', 'Add')} placeholder={tr('加入', 'Add')} onPick={(ref) => write.set('values', [...(value.values ?? []), ref])} />}
      </section>
    </article>
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
  const write = writer({ kind: 'section', full, namespace, own, value: withoutId(value), content, onEdit, onOps })
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
      <Head kind="section" full={full} value={value} own={own} overriding={overriding} setOverriding={setOverriding} content={content} namespace={namespace} pending={pending} write={write} onRemove={remove} onPick={onPick} />
      <section className="gather-part" onClick={() => onPick?.(['values'])}>
        <h3>{tr('词条', 'Entries')}</h3>
        <Members refs={refs} titleOf={titleOf} namespace={namespace} locked={locked} onChange={(values) => write.set('values', values)} />
        {!locked && <Picker options={candidates} add label={tr('加入', 'Add')} placeholder={tr('加入', 'Add')} onPick={(ref) => write.set('values', [...refs, ref])} />}
      </section>
    </article>
  )
}
