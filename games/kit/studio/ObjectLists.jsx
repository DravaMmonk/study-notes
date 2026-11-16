// The object lists of the package workspace's left column (games/PACKAGES.md 8): tags, relations, layouts and the
// encyclopedia's entries, each by layer (or kind), searched, with a new one made from the list; the one picked opens in
// the middle (TagEditor.jsx, RelationBoard.jsx, LayoutEditor.jsx; an entry in the copy) and its file on the right.
import { useState } from 'react'
import { BookOpen, Filter, LayoutGrid, Spline, Tag } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import SidebarListTools from './SidebarListTools.jsx'
import { freeObjectName, namespaceOf, objectsOf, ownNames, shownName, tagMembers } from './objects-edit.js'
import { sidebarSearch } from './sidebar-list.js'
import { TAG_KINDS, newTag } from './tag-edit.js'
import { newLayout } from './layout-edit.js'
import { orderedTags, tagMoveOps, tagsOfKind } from './tag-order.js'
import { useDragOrder } from './useDragOrder.js'

export const TAG_KIND_WORDS = { level: ['关卡', 'Levels'], item: ['项', 'Items'], entry: ['词条', 'Entries'] }
export const tagKindWord = (kind) => (TAG_KIND_WORDS[kind] ? tr(...TAG_KIND_WORDS[kind]) : kind)
export const RELATION_KINDS = [['requires', '先修', 'Requires'], ['order', '顺序', 'Order'], ['replaces', '取代', 'Replaces']]

/** One row of a list: its icon, what it is called, its name, a count. */
function Row({ icon: Icon, on, title, name, count, onClick, ...rest }) {
  return (
    <button type="button" className={`parts-row is-object ${on ? 'is-on' : ''}`} aria-current={on ? 'true' : undefined} onClick={onClick} {...rest}>
      <i className="family-chip"><Icon size={12} aria-hidden="true" /></i>
      <span>{title || name}</span>
      {title ? <code>{name}</code> : <i />}
      {count !== undefined ? <small className="object-count">{count}</small> : null}
    </button>
  )
}

/** Groups of rows under a heading each (none when there is only one group). */
function Groups({ groups, row }) {
  const shown = groups.filter(([, items]) => items.length)
  return shown.map(([label, items]) => (
    <div key={label} className="parts-group">
      {shown.length > 1 && <div className="palette-group">{label}</div>}
      {items.map(row)}
    </div>
  ))
}

const byNamespace = (entries) => [...new Set(entries.map(([full]) => namespaceOf(full)))].map((ns) => [ns, entries.filter(([full]) => namespaceOf(full) === ns)])

/** The members of each tag of `kind` (for the prerequisites that order level tags). */
const membersOf = (content, kind) => Object.fromEntries(tagsOfKind(content, kind).map((tag) => [tag, kind === 'level' ? tagMembers(content, tag) : []]))

/** Every tag in the order the list shows them: by kind, each kind in its order. */
export const tagListOrder = (content) => TAG_KINDS.flatMap((k) => orderedTags(content, k, membersOf(content, k)))

/**
 * The tags, by kind, each kind in its order (tag-order.js: dragged, or moved with Alt+↑/↓, it is the layer's
 * `<kind>-tags-order`); narrowed by kind and a search; a new one of a kind.
 */
export function TagList({ content, namespace, current, pending, onOpen, onEdit, onOps }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('')
  const all = objectsOf(content, 'tag', namespace)
  const registry = content?.registries?.tag ?? {}
  const matches = sidebarSearch(query)
  const kinds = TAG_KINDS.filter((k) => all.some(([, tag]) => tag.kind === k))
  const byKind = kinds.filter((k) => !kind || k === kind).map((k) => [k, orderedTags(content, k, membersOf(content, k)).filter((full) => matches(full, L(registry[full].title))).map((full) => [full, registry[full]])])
  const shown = byKind.flatMap(([, entries]) => entries)
  const ids = shown.map(([full]) => full)
  const { item } = useDragOrder({
    ids,
    disabled: pending || Boolean(query.trim()),
    onMove: (tag, to) => {
      const k = registry[tag]?.kind
      if (registry[to.before ?? to.after]?.kind !== k) return
      const ops = tagMoveOps(content, namespace, k, tag, to, membersOf(content, k))
      if (ops?.length) onOps(ops)
    },
  })
  const create = (k) => {
    if (pending) return
    const { full, op } = newTag(content, namespace, k)
    onEdit(op)
    onOpen(full)
  }
  return (
    <nav className="parts-list" aria-label={tr('标签', 'Tags')}>
      <SidebarListTools addOptions={TAG_KINDS.map((k) => ({ value: k, label: tagKindWord(k) }))} addLabel={tr('新的标签', 'New tag')} onAdd={create} query={query} onQuery={setQuery}
        sortOptions={kinds.length > 1 ? [{ value: '', label: tr('全部', 'All') }, ...kinds.map((k) => ({ value: k, label: tagKindWord(k) }))] : []} sort={kind} onSort={setKind} menuIcon={Filter} menuLabel={tr('种类', 'Kind')} />
      <Groups groups={byKind.map(([k, entries]) => [tagKindWord(k), entries])} row={([full, tag]) => (
        <Row key={full} icon={Tag} on={full === current} title={L(tag.title)} name={shownName(namespace, full)} count={tagMembers(content, full).length} onClick={() => onOpen(full)} {...item(full)} />
      )} />
    </nav>
  )
}

/** The relations, by kind; a search; a new one of a kind. */
export function RelationList({ content, namespace, current, pending, onOpen, onEdit }) {
  const [query, setQuery] = useState('')
  const all = objectsOf(content, 'relation', namespace)
  const matches = sidebarSearch(query)
  const shown = all.filter(([full]) => matches(full))
  const create = (kind) => {
    if (pending) return
    const name = freeObjectName(ownNames(content, 'relation', namespace), kind)
    onEdit({ op: 'relation.put', relation: name, data: { kind, edges: [] } })
    onOpen(`${namespace}/${name}`)
  }
  return (
    <nav className="parts-list" aria-label={tr('关系', 'Relations')}>
      <SidebarListTools addOptions={RELATION_KINDS.map(([kind, zh, en]) => ({ value: kind, label: tr(zh, en) }))} addLabel={tr('新的关系', 'New relation')} onAdd={create} query={query} onQuery={setQuery} />
      <Groups groups={RELATION_KINDS.map(([kind, zh, en]) => [tr(zh, en), shown.filter(([, relation]) => relation.kind === kind)])} row={([full, relation]) => (
        <Row key={full} icon={Spline} on={full === current} name={shownName(namespace, full)} count={(relation.edges ?? []).length + Math.max(0, (relation.sequence ?? []).length - 1)} onClick={() => onOpen(full)} />
      )} />
    </nav>
  )
}

/** The layouts, by layer; a search; a new one over a level tag. */
export function LayoutList({ content, namespace, current, pending, onOpen, onEdit }) {
  const [query, setQuery] = useState('')
  const all = objectsOf(content, 'layout', namespace)
  const matches = sidebarSearch(query)
  const shown = all.filter(([full, layout]) => matches(full, layout.of))
  const levelTags = objectsOf(content, 'tag', namespace).filter(([, tag]) => tag.kind === 'level')
    .map(([full, tag]) => ({ value: full, label: shownName(namespace, `#${full}`), title: tag.title }))
  const create = (tag) => {
    if (pending) return
    const { full, op } = newLayout(content, namespace, tag)
    onEdit(op)
    onOpen(full)
  }
  return (
    <nav className="parts-list" aria-label={tr('布局', 'Layouts')}>
      <SidebarListTools addOptions={levelTags} addLabel={tr('新的布局', 'New layout')} onAdd={create} query={query} onQuery={setQuery} />
      <Groups groups={byNamespace(shown)} row={([full, layout]) => (
        <Row key={full} icon={LayoutGrid} on={full === current} title={shownName(namespace, layout.of)} name={shownName(namespace, full)} count={(layout.rows ?? []).length} onClick={() => onOpen(full)} />
      )} />
    </nav>
  )
}

/** The encyclopedia's entries; a search. `onOpen(k)` opens the k-th. */
export function EntryList({ glossary, current, onOpen }) {
  const [query, setQuery] = useState('')
  const matches = sidebarSearch(query)
  const entries = (glossary?.entries ?? []).map((entry, k) => [k, entry]).filter(([, entry]) => matches(entry.id, L(entry.title)))
  return (
    <nav className="parts-list" aria-label={tr('词条', 'Entries')}>
      <SidebarListTools query={query} onQuery={setQuery} />
      {entries.map(([k, entry]) => (
        <Row key={entry.id} icon={BookOpen} on={k === current} title={L(entry.title)} name={entry.id.slice(entry.id.indexOf('/') + 1)} onClick={() => onOpen(k)} />
      ))}
    </nav>
  )
}
