// A build list grouped (games/DESIGN.md 6.7): its objects under every group that names them (list-groups.js), each
// group folding, its heading row opening the group's own object (a tag, a tray, a relation, a section) in the middle;
// what no group names under the last heading. The tools above: a new object of the list, a search, then the grouping
// row (GroupingBar.jsx).
import { useState } from 'react'
import { L, tr } from '../shell/i18n.js'
import SidebarListTools from './SidebarListTools.jsx'
import SidebarSection, { useSidebarFolds } from './SidebarSection.jsx'
import GroupingBar from './GroupingBar.jsx'
import { groupsOf, ungrouped } from './list-groups.js'
import { shownName } from './objects-edit.js'
import { sidebarSearch } from './sidebar-list.js'

const LEFT = '\0rest'

/**
 * `kind` the list's objects (level, part, entry); `items` their full names, in order; `label(id)` what a row is called
 * (searched); `row(id)` draws one; `by`/`onBy` the grouping; `heading` the group open ({ kind, full }), `onHeading`;
 * `newGroup` as GroupingBar takes it; `addOptions`/`onAdd` a new object of the list.
 */
export default function GroupedList({ kind, name = null, content, namespace, game, items, label, row, groupings, by, onBy, heading, onHeading, newOptions, onNew, addOptions = [], addLabel, onAdd = () => {} }) {
  const [query, setQuery] = useState('')
  const { folded, toggle, setAll } = useSidebarFolds(`folded-${kind}-${by}`, game)
  const matches = sidebarSearch(query)
  const filtering = Boolean(query.trim())
  const known = new Set(items)
  const groups = groupsOf(content, kind, by).map((group) => ({ ...group, members: group.members.filter((id) => known.has(id)) }))
  const rest = ungrouped(items, groups)
  const shown = (ids) => ids.filter((id) => matches(id, label(id)))
  const keys = [...groups.map((group) => group.full), LEFT]
  const titleOf = (group) => L(content.registries?.[group.kind]?.[group.full]?.title) || shownName(namespace, group.full)
  return (
    <nav className="parts-list" aria-label={tr(...(name ?? { level: ['关卡', 'Levels'], part: ['元件', 'Parts'], symbol: ['符号', 'Symbols'], entry: ['词条', 'Entries'] }[kind] ?? [kind, kind]))}>
      <SidebarListTools addOptions={addOptions} addLabel={addLabel} onAdd={onAdd} query={query} onQuery={setQuery} />
      <GroupingBar groupings={groupings} by={by} onBy={onBy} newOptions={newOptions} onNew={onNew}
        folded={keys.every((key) => folded.has(key))} onFoldAll={(fold) => setAll(keys, fold)} />
      {groups.map((group) => {
        const members = shown(group.members)
        if (filtering && !members.length) return null
        return (
          <SidebarSection key={group.full} title={titleOf(group)} name={shownName(namespace, group.full)} collapsed={!filtering && folded.has(group.full)}
            active={heading?.kind === group.kind && heading.full === group.full} onSelect={() => onHeading({ kind: group.kind, full: group.full })} onToggle={() => toggle(group.full)}>
            {members.map(row)}
          </SidebarSection>
        )
      })}
      {shown(rest).length > 0 && (
        <SidebarSection key={LEFT} title={tr('未分组', 'Ungrouped')} name="" collapsed={!filtering && folded.has(LEFT)} onToggle={() => toggle(LEFT)}>
          {shown(rest).map(row)}
        </SidebarSection>
      )}
    </nav>
  )
}
