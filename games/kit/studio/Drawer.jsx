// The fold bar under the middle (games/PACKAGES.md 8.2): what helps rather than what is edited. On the bar how the check
// stands and the tabs — the audit (the check's findings, Audit.jsx), a file compared with its history (Compare.jsx),
// the change log (the pending changeset, applying it, undoing, the log: Review.jsx), and what the last preview said
// (debug); a tab clicked opens the bar on it, clicked again folds it.
import { ChevronUp } from 'lucide-react'
import { tr } from '../shell/i18n.js'

export const DRAWER_TABS = [['audit', '审计', 'Audit'], ['compare', '文件对比', 'Compare'], ['changes', '修改日志', 'Change log'], ['debug', '调试', 'Debug']]

/**
 * `sum`: { fail, label } (Audit.jsx auditSum); `audit`: the audit, always mounted (its keys work folded); `panel`: what
 * another tab shows; `tabs`: the ids of the tabs this workspace has.
 */
export default function Drawer({ open, tab, onTab, onToggle, sum, fresh, ops, audit, panel, tabs = DRAWER_TABS.map(([id]) => id) }) {
  const pick = (id) => (open && tab === id ? onToggle() : onTab(id))
  return (
    <div className={`drawer ${open ? 'is-open' : ''}`}>
      <div className={`drawer-bar ${sum.fail ? 'is-fail' : 'is-ok'}`}>
        <button type="button" className="audit-sum" onClick={onToggle} aria-expanded={open} title="Alt+]">
          <ChevronUp size={14} aria-hidden="true" />
          <b>{sum.label}</b>
          {!fresh && <i className="audit-wait" title={tr('检查中')} />}
        </button>
        <nav className="drawer-tabs" role="tablist" aria-label={tr('辅助', 'Helpers')}>
          {DRAWER_TABS.filter(([id]) => tabs.includes(id)).map(([id, zh, en]) => (
            <button key={id} type="button" role="tab" aria-selected={open && tab === id} className={`studio-tab ${open && tab === id ? 'is-on' : ''}`} onClick={() => pick(id)}>
              {tr(zh, en)}{id === 'changes' && ops.length > 0 && <b className="studio-count">{ops.length}</b>}
            </button>
          ))}
        </nav>
      </div>
      <div className="drawer-body" hidden={!open}>
        {audit}
        {open && tab !== 'audit' && panel}
      </div>
    </div>
  )
}

/** What the last preview said, and the pending changeset, as JSON. */
export function Debug({ ops, last }) {
  const said = last ? { ok: last.ok, failed: last.failed, says: last.says, problems: last.problems } : null
  return <pre className="drawer-debug">{JSON.stringify({ last: said, ops }, null, 2)}</pre>
}
