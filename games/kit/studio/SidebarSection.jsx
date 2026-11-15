import { ChevronRight } from 'lucide-react'
import { tr } from '../shell/i18n.js'
import { usePref } from './prefs.js'

export function useSidebarFolds(key, game) {
  const [folds, setFolds] = usePref(key, {})
  return {
    folded: new Set(folds[game] ?? []),
    toggle: (id) => setFolds((previous) => {
      const current = new Set(previous[game] ?? [])
      if (current.has(id)) current.delete(id)
      else current.add(id)
      return { ...previous, [game]: [...current] }
    }),
  }
}

export default function SidebarSection({ title, name, active, collapsed, onSelect, onToggle, children }) {
  return (
    <section className={`sidebar-section ${collapsed ? 'is-folded' : ''}`}>
      <div className={`sidebar-section-head ${active ? 'is-on' : ''}`}>
        <button type="button" className="sidebar-section-fold" onClick={onToggle} aria-expanded={!collapsed}
          aria-label={collapsed ? tr('展开', 'Expand') : tr('折叠', 'Fold')}>
          <ChevronRight size={12} aria-hidden="true" />
        </button>
        <button type="button" className="sidebar-section-name" onClick={onSelect} title={name}>
          <span>{title}</span>
        </button>
      </div>
      {!collapsed && <div className="sidebar-section-items">{children}</div>}
    </section>
  )
}
