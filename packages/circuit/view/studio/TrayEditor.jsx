import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { L, tr, getLang, Picker, TextField, confirmDelete, localName, namespaceOf, shownName, tagKeyOfRef, tagName, overridesIt, textWith, reordered, stageOwners, gatherWriter as writer, withoutId, Members, GatherHead as Head } from 'kernel/view'
import { grantObjects, grants } from '../../core/index.js'

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
