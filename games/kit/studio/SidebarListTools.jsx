import { ArrowDownWideNarrow, Plus, Search } from 'lucide-react'
import { tr } from '../shell/i18n.js'
import { AddMenu, Picker } from './Picker.jsx'

/**
 * A left list's tools: a new item (`addOptions`), a search, and a menu (the sort order, or a filter: `menuIcon`,
 * `menuLabel`). The add and the menu are left out without options.
 */
export default function SidebarListTools({ addOptions = [], addLabel, onAdd, query, onQuery, sortOptions = [], sort, onSort, menuIcon = ArrowDownWideNarrow, menuLabel }) {
  return (
    <div className="sidebar-list-tools">
      <AddMenu searchable={false} icon={Plus} options={addOptions} {...(addLabel && { label: addLabel })} onPick={(value) => { onQuery(''); onAdd(value) }} />
      <label className="sidebar-list-search">
        <Search size={13} aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => onQuery(e.target.value)}
          placeholder={tr('搜索')} aria-label={tr('搜索当前列表', 'Search this list')} />
      </label>
      {sortOptions.length > 0 && <Picker searchable={false} icon={menuIcon} options={sortOptions} value={sort} onPick={onSort} label={menuLabel ?? tr('排序方式', 'Sort order')} />}
    </div>
  )
}
