// The bar both workspaces of the studio share (Studio.jsx): the workspace switch, what the workspace edits (a package,
// a game: its children), the workspace's tabs, the command palette and the busy light.
import { useEffect, useRef } from 'react'
import { Command } from 'lucide-react'
import { mountBarMenus } from '../menu.js'
import { tr } from '../shell/i18n.js'
import { MOD } from './Shortcuts.jsx'

const SPACES = [['package', '关卡设计', 'Level design'], ['game', '游戏编排', 'Game arrangement']]

/** space: { value, onChange }; tabs: [[id, zh, en]]; ops, last: the pending changeset and its last preview. */
export default function StudioBar({ space, tabs, tab, onTab, ops, last, busy, fresh, onPalette, children }) {
  const actions = useRef(null)
  useEffect(() => {
    const menus = mountBarMenus(actions.current, {})
    return () => menus.destroy()
  }, [])
  const go = (next) => {
    if (next === space.value) return
    if (ops.length && !window.confirm(tr('切换工作区会放弃待定操作，确定吗？', 'Switching workspace discards the pending operations. Continue?'))) return
    space.onChange(next)
  }
  return (
    <header className="kit-bar studio-bar">
      <span className="kit-brand"><i className="kit-chip" aria-hidden="true" /></span>
      <nav className="studio-spaces" role="tablist" aria-label={tr('工作区', 'Workspace')}>
        {SPACES.map(([id, zh, en]) => (
          <button key={id} type="button" role="tab" aria-selected={space.value === id} className={`studio-space ${space.value === id ? 'is-on' : ''}`} onClick={() => go(id)}>{tr(zh, en)}</button>
        ))}
      </nav>
      {children}
      <nav className="studio-tabs" role="tablist">
        {tabs.map(([id, zh, en]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`studio-tab ${tab === id ? 'is-on' : ''}`} onClick={() => onTab(id)}>
            {tr(zh, en)}{id === 'review' && ops.length > 0 && <b className={`studio-count ${last?.failed !== null && last?.failed !== undefined ? 'is-fail' : ''}`}>{ops.length}</b>}
          </button>
        ))}
      </nav>
      <span className="kit-spacer" />
      {onPalette && <button type="button" className="studio-palette" onClick={onPalette} title={tr('命令面板')}><Command size={13} aria-hidden="true" /><kbd>{MOD}K</kbd></button>}
      <i className={`studio-busy ${busy || !fresh ? 'is-on' : ''}`} aria-hidden="true" />
      <div className="kit-actions" ref={actions} />
    </header>
  )
}
