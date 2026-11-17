// The tray and section editors of the build workspace (games/DESIGN.md 6.1, 6.7): objects that gather parts (a tray,
// with its menus) or encyclopedia entries (a section). What they hold is their `values` (members, stages, tags of
// them); the order they show them in is an order relation (`<tray>-order`, `<section>-order`; a menu's
// `<tray>-<menu>-order`, or an order relation of the layer that already lists them all), dragged or moved with Alt+↑/↓. Another package's tray or section is read only until it is
// overridden here; its order then goes as an override of its order relation.
import { grantObjects, grants } from '../engine/grants.js'
import { useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, X } from 'lucide-react'
import { L, getLang, tr } from '../shell/i18n.js'
import { Picker } from './Picker.jsx'
import { TextField } from './TextField.jsx'
import SourceMark from './SourceMark.jsx'
import { confirmDelete } from './delete.js'
import { localName, namespaceOf, shownName, tagMembers } from './objects-edit.js'
import { ownObjectData } from './object-file.js'
import { overridesIt } from './override-edit.js'
import { textWith } from './tag-edit.js'
import { canOrder, reordered, subsetOrderOps } from './tag-order.js'
import { useDragOrder } from './useDragOrder.js'
import { stageOwners } from './list-groups.js'

/** The writes of one gathering object: its own by `<kind>.set`/`.put`, another package's by an override of it whole. */
function writer({ kind, full, namespace, own, value, content, onEdit, onOps }) {
  const name = localName(namespace, full)
  return {
    set: (key, data) => (own
      ? onEdit({ op: `${kind}.set`, [kind]: name, path: [key], value: ownObjectData(namespace, data) })
      : onOps([{ op: 'override.put', layer: namespace, kind, name: full, data: { ...withoutId(content.registries[kind][full]), ...value, [key]: data } }])),
  }
}
const withoutId = ({ id: _, ...rest }) => rest

/** The members' rows: a reference (a member, a stage, `#tag`) and what it is called, removable. */
function Refs({ refs, titleOf, namespace, locked, onRemove }) {
  return (
    <ul className="gather-refs">
      {refs.map((ref) => (
        <li key={ref} className={ref.startsWith('#') ? 'is-tag' : ''}>
          <code>{shownName(namespace, ref)}</code><span>{titleOf(ref)}</span>
          {!locked && <button type="button" className="kit-btn editor-tool" aria-label={tr('去掉')} title={tr('去掉')} onClick={() => onRemove(ref)}><X size={12} aria-hidden="true" /></button>}
        </li>
      ))}
    </ul>
  )
}

/** A list in the order an order relation gives, dragged or moved with Alt+↑/↓ (or its buttons) when `onOrder` is given. */
function Ordered({ ids, label, onOrder }) {
  const move = (id, to) => onOrder?.(reordered(ids, [id], to))
  const { item } = useDragOrder({ ids, onMove: move, disabled: !onOrder || ids.length < 2 })
  return (
    <ol className="gather-order">
      {ids.map((id, k) => (
        <li key={id} className="tag-member" {...item(id)} tabIndex={onOrder ? 0 : undefined}>
          {onOrder && <span className="member-grip" aria-hidden="true"><GripVertical size={12} /></span>}
          {label(id)}
          {onOrder && ids.length > 1 && <span className="member-move">
            <button type="button" className="kit-btn editor-tool" disabled={k === 0} aria-label={tr('上移', 'Move up')} title={tr('上移', 'Move up') + ' (Alt+↑)'} onClick={() => move(id, { before: ids[k - 1] })}><ArrowUp size={12} aria-hidden="true" /></button>
            <button type="button" className="kit-btn editor-tool" disabled={k === ids.length - 1} aria-label={tr('下移', 'Move down')} title={tr('下移', 'Move down') + ' (Alt+↓)'} onClick={() => move(id, { after: ids[k + 1] })}><ArrowDown size={12} aria-hidden="true" /></button>
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
  const value = content?.registries?.tray?.[full]
  const [overriding, setOverriding] = useState(() => overridesIt(content, namespace, 'tray', full))
  if (!value) return <article className="arrange" />
  const own = namespaceOf(full) === namespace
  const editable = own || overriding
  const locked = pending || !editable
  const write = writer({ kind: 'tray', full, namespace, own, value: withoutId(value), content, onEdit, onOps })
  const parts = grantObjects(content)
  const owners = stageOwners(content)
  const titleOf = (ref) => {
    if (ref.startsWith('#')) return L(content.registries?.tag?.[ref.slice(1)]?.title)
    const part = parts[owners.get(ref) ?? ref]
    return L(part?.name) ?? ''
  }
  const candidates = (taken) => [
    ...[...owners.keys()].filter((id) => !taken.includes(id)).map((id) => ({ value: id, label: shownName(namespace, id), title: titleOf(id), group: owners.get(id) === id ? tr('元件', 'Parts') : tr('阶段', 'Stages') })),
    ...Object.entries(content.registries?.tag ?? {}).filter(([name, tag]) => grants.types.has(tag.kind) && !taken.includes(`#${name}`)).map(([name]) => ({ value: `#${name}`, label: shownName(namespace, `#${name}`), title: titleOf(`#${name}`), group: tr('标签', 'Tags') })),
  ]
  const menus = value.menus ?? []
  const setMenus = (next) => write.set('menus', next)
  const remove = () => {
    if (!own || pending || !confirmDelete(shownName(namespace, full))) return
    onEdit({ op: 'tray.remove', tray: localName(namespace, full) })
    onSelect(null)
  }
  // What the tray shows, in order: its parts and menus as the kernel lays them out.
  const shown = content.trays?.[full]?.items ?? []
  const shownIds = [...new Set(shown.map((item) => (typeof item === 'string' ? item : item.id)))]
  const ordering = (relation, ids) => (!pending && canOrder(content, namespace, relation, full, overriding) ? (sequence) => {
    const ops = subsetOrderOps(content, namespace, relation, ids, sequence, 'grant', full, overriding)
    if (ops?.length) onOps(ops)
  } : null)
  const menuOf = new Map(menus.map((menu) => [menu.id, menu]))
  const newMenu = () => {
    let k = menus.length + 1
    while (menus.some((menu) => localName(namespace, menu.id) === `menu-${k}` || menu.id === `menu-${k}`)) k += 1
    setMenus([...menus, { id: `menu-${k}`, title: { [getLang()]: tr('新的菜单', 'New menu') }, values: [] }])
  }
  return (
    <article className="arrange gather-editor">
      <Head kind="tray" full={full} value={value} own={own} overriding={overriding} setOverriding={setOverriding} content={content} namespace={namespace} pending={pending} write={write} onRemove={remove} onPick={onPick}>
        <label className="object-flag">
          <input type="checkbox" className="field-check" checked={value.workshop ?? true} disabled={locked} onChange={(e) => write.set('workshop', e.target.checked)} />
          {tr('工坊', 'Workshop')}
        </label>
      </Head>
      <section className="gather-part" onClick={() => onPick?.(['values'])}>
        <h3>{tr('托盘上', 'On the tray')}</h3>
        <Refs refs={value.values ?? []} titleOf={titleOf} namespace={namespace} locked={locked} onRemove={(ref) => write.set('values', value.values.filter((v) => v !== ref))} />
        {!locked && <Picker options={candidates(value.values ?? [])} add label={tr('加入', 'Add')} placeholder={tr('加入', 'Add')} onPick={(ref) => write.set('values', [...(value.values ?? []), ref])} />}
      </section>
      {menus.map((menu, m) => (
        <section key={menu.id} className="gather-part is-menu" onClick={() => onPick?.(['menus', m])}>
          <h3>
            <code>{shownName(namespace, menu.id)}</code>
            {editable ? <TextField key={getLang()} lang={getLang()} value={menu.title} label={tr('菜单名', 'Menu title')} compact
              onSet={(text) => { if (!pending) setMenus(menus.map((x, k) => (k === m ? { ...x, title: textWith(namespace, x.title, getLang(), text) } : x))) }} />
              : <span>{L(menu.title)}</span>}
            {!locked && <button type="button" className="kit-btn editor-tool" title={tr('删除菜单', 'Delete the menu')} aria-label={tr('删除菜单', 'Delete the menu')}
              onClick={() => { if (confirmDelete(shownName(namespace, menu.id))) setMenus(menus.filter((_, k) => k !== m)) }}><Trash2 size={13} aria-hidden="true" /></button>}
          </h3>
          <Refs refs={menu.values ?? []} titleOf={titleOf} namespace={namespace} locked={locked}
            onRemove={(ref) => setMenus(menus.map((x, k) => (k === m ? { ...x, values: x.values.filter((v) => v !== ref) } : x)))} />
          {!locked && <Picker options={candidates(menu.values ?? [])} add label={tr('加入', 'Add')} placeholder={tr('加入', 'Add')}
            onPick={(ref) => setMenus(menus.map((x, k) => (k === m ? { ...x, values: [...(x.values ?? []), ref] } : x)))} />}
        </section>
      ))}
      {!locked && <button type="button" className="kit-btn is-label gather-add" onClick={newMenu}><Plus size={13} aria-hidden="true" />{tr('新的菜单', 'New menu')}</button>}
      <section className="gather-part">
        <h3>{tr('顺序', 'Order')}</h3>
        <Ordered ids={shownIds} onOrder={ordering(`${full}-order`, shownIds)}
          label={(id) => (menuOf.has(id) || shown.some((item) => item.id === id)
            ? <><code>{shownName(namespace, id)}</code><span>{L(shown.find((item) => item.id === id)?.title)}</span></>
            : <><code>{shownName(namespace, id)}</code><span>{titleOf(id)}</span></>)} />
        {shown.filter((item) => typeof item !== 'string' && item.items.length > 1).map((menu) => (
          <div key={menu.id} className="gather-menu-order">
            <h4><code>{shownName(namespace, menu.id)}</code><span>{L(menu.title)}</span></h4>
            <Ordered ids={menu.items} onOrder={ordering(`${full}-${localName(namespace, menu.id) ?? menu.id.slice(menu.id.indexOf('/') + 1)}-order`, menu.items)}
              label={(id) => <><code>{shownName(namespace, id)}</code><span>{titleOf(id)}</span></>} />
          </div>
        ))}
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
  const titleOf = (ref) => (ref.startsWith('#') ? L(content.registries?.tag?.[ref.slice(1)]?.title) : L(entries[ref]?.title)) ?? ''
  const refs = value.values ?? []
  const candidates = [
    ...Object.keys(entries).filter((id) => !refs.includes(id)).map((id) => ({ value: id, label: shownName(namespace, id), title: titleOf(id), group: tr('词条', 'Entries') })),
    ...Object.entries(content.registries?.tag ?? {}).filter(([name, tag]) => tag.kind === 'entry' && !refs.includes(`#${name}`)).map(([name]) => ({ value: `#${name}`, label: shownName(namespace, `#${name}`), title: titleOf(`#${name}`), group: tr('标签', 'Tags') })),
  ]
  const remove = () => {
    if (!own || pending || !confirmDelete(shownName(namespace, full))) return
    onEdit({ op: 'section.remove', section: localName(namespace, full) })
    onSelect(null)
  }
  const shown = content.glossary?.groups?.find((group) => group.id === full)?.values ?? [...new Set(refs.flatMap((ref) => (ref.startsWith('#') ? tagMembers(content, ref.slice(1)) : [ref])))]
  const relation = `${full}-order`
  const ordering = !pending && canOrder(content, namespace, relation, full, overriding)
    ? (sequence) => { const ops = subsetOrderOps(content, namespace, relation, shown, sequence, 'entry', full, overriding); if (ops?.length) onOps(ops) }
    : null
  return (
    <article className="arrange gather-editor">
      <Head kind="section" full={full} value={value} own={own} overriding={overriding} setOverriding={setOverriding} content={content} namespace={namespace} pending={pending} write={write} onRemove={remove} onPick={onPick} />
      <section className="gather-part" onClick={() => onPick?.(['values'])}>
        <h3>{tr('词条', 'Entries')}</h3>
        <Refs refs={refs} titleOf={titleOf} namespace={namespace} locked={locked} onRemove={(ref) => write.set('values', refs.filter((v) => v !== ref))} />
        {!locked && <Picker options={candidates} add label={tr('加入', 'Add')} placeholder={tr('加入', 'Add')} onPick={(ref) => write.set('values', [...refs, ref])} />}
      </section>
      <section className="gather-part">
        <h3>{tr('顺序', 'Order')}</h3>
        <Ordered ids={shown} onOrder={ordering} label={(id) => <><code>{shownName(namespace, id)}</code><span>{titleOf(id)}</span></>} />
      </section>
    </article>
  )
}
