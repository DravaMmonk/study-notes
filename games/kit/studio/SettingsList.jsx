import { SlidersHorizontal } from 'lucide-react'
import { settingControlOptions } from '../engine/parts/schema.js'
import { L, tr } from '../shell/i18n.js'
import { freeName } from './PartsList.jsx'
import { useState } from 'react'
import SidebarListTools from './SidebarListTools.jsx'
import { usePref } from './prefs.js'
import { NAME_ASC, sidebarSearch, sidebarSortOptions, sortSidebarIds } from './sidebar-list.js'

export default function SettingsList({ file, vocabulary, selected, onSelect, onEdit }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = usePref('setting-list-sort', NAME_ASC)
  const settings = file?.settings ?? {}
  const ids = Object.keys(settings)
  const matches = sidebarSearch(query)
  const shown = sortSidebarIds(ids.filter((id) => matches(id, L(settings[id].label))), sort, (id) => L(settings[id].label))
  const controls = settingControlOptions(vocabulary)
  const add = (control) => {
    const setting = freeName(ids, 'setting')
    onEdit({ op: 'setting.add', setting, data: controls.find(({ value }) => value === control).data })
    onSelect(setting)
  }
  return (
    <nav className="parts-list" aria-label={tr('设置', 'Settings')}>
      <SidebarListTools addOptions={controls} onAdd={add} query={query} onQuery={setQuery}
        sortOptions={sidebarSortOptions()} sort={sort} onSort={setSort} />
      {shown.map((id) => {
        const setting = settings[id]
        return (
          <button key={id} type="button" className={`parts-row ${selected === id ? 'is-on' : ''}`}
            aria-current={selected === id ? 'true' : undefined} onClick={() => onSelect(id)} title={L(setting.about ?? '')}>
            <i className="family-chip"><SlidersHorizontal size={12} aria-hidden="true" /></i>
            <span>{L(setting.label) || id}</span>
            {setting.label && <code>{id}</code>}
          </button>
        )
      })}
    </nav>
  )
}
