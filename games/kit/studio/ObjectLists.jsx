// The encyclopedia's entries in the build workspace's left column (games/DESIGN.md 6.7), grouped by their tags, the
// sections or the relations that gather them (GroupedList.jsx); an entry opens on the right. The words the tag editor
// names kinds with.
import { BookOpen } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { shownName } from './objects-edit.js'
import GroupedList from './GroupedList.jsx'
import { GROUPINGS } from './list-groups.js'

export const TAG_KIND_WORDS = { level: ['关卡', 'Levels'], part: ['元件', 'Parts'], entry: ['词条', 'Entries'] }
export const tagKindWord = (kind) => (TAG_KIND_WORDS[kind] ? tr(...TAG_KIND_WORDS[kind]) : kind)

/** One row of a list: its icon, what it is called, its name. */
function Row({ icon: Icon, on, title, name, onClick }) {
  return (
    <button type="button" className={`parts-row is-object ${on ? 'is-on' : ''}`} aria-current={on ? 'true' : undefined} onClick={onClick}>
      <i className="family-chip"><Icon size={12} aria-hidden="true" /></i>
      <span>{title || name}</span>
      {title ? <code>{name}</code> : <i />}
    </button>
  )
}

/** The encyclopedia's entries, grouped by their tags, the sections or the relations that gather them. `onOpen(k)` opens the k-th. */
export function EntryList({ content, namespace, game, current, by, onBy, heading, onHeading, newOptions, onNew, onOpen }) {
  const entries = content.glossary?.entries ?? []
  const at = new Map(entries.map((entry, k) => [entry.id, k]))
  return (
    <GroupedList kind="entry" content={content} namespace={namespace} game={game} items={entries.map((entry) => entry.id)} label={(id) => L(entries[at.get(id)]?.title)}
      groupings={GROUPINGS.entry} by={by} onBy={onBy} heading={heading} onHeading={onHeading} newOptions={newOptions} onNew={onNew}
      row={(id) => <Row key={id} icon={BookOpen} on={at.get(id) === current} title={L(entries[at.get(id)]?.title)} name={shownName(namespace, id)} onClick={() => onOpen(at.get(id))} />} />
  )
}
