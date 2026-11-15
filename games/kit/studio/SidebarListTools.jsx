import { ArrowDownWideNarrow, Plus, Search } from 'lucide-react'
import { tr } from '../shell/i18n.js'
import { AddMenu, Picker } from './Picker.jsx'

export default function SidebarListTools({ addOptions, onAdd, query, onQuery, sortOptions, sort, onSort }) {
  return (
    <div className="sidebar-list-tools">
      <AddMenu icon={Plus} options={addOptions} onPick={(value) => { onQuery(''); onAdd(value) }} />
      <label className="sidebar-list-search">
        <Search size={13} aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => onQuery(e.target.value)}
          placeholder={tr('搜索')} aria-label={tr('搜索当前列表', 'Search this list')} />
      </label>
      <Picker icon={ArrowDownWideNarrow} options={sortOptions} value={sort} onPick={onSort} label={tr('排序方式', 'Sort order')} />
    </div>
  )
}
