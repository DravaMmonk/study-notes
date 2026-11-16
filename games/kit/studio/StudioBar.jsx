// The bar the studio's workspaces share (Studio.jsx; games/DESIGN.md 6.7): the workspace switch, what the workspace
// opens (a package, a game: its children), the command palette, the busy light, language and theme. No tabs: what is
// shown follows what is picked, and the helpers fold under the middle (Drawer.jsx).
import { useEffect, useRef } from 'react'
import { Command } from 'lucide-react'
import { mountBarMenus } from '../menu.js'
import { tr } from '../shell/i18n.js'
import { MOD } from './Shortcuts.jsx'

export const SPACES = [['build', '构建', 'Build'], ['arrange', '编排', 'Arrange'], ['copy', '文案', 'Copy']]

/** space: { value, onChange, spaces? (the ids offered) }; ops: the pending changeset. */
export default function StudioBar({ space, ops, busy, fresh, onPalette, children }) {
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
        {SPACES.filter(([id]) => !space.spaces || space.spaces.includes(id)).map(([id, zh, en]) => (
          <button key={id} type="button" role="tab" aria-selected={space.value === id} className={`studio-space ${space.value === id ? 'is-on' : ''}`} onClick={() => go(id)}>{tr(zh, en)}</button>
        ))}
      </nav>
      {children}
      <span className="kit-spacer" />
      {onPalette && <button type="button" className="studio-palette" onClick={onPalette} title={tr('命令面板')}><Command size={13} aria-hidden="true" /><kbd>{MOD}K</kbd></button>}
      <i className={`studio-busy ${busy || !fresh ? 'is-on' : ''}`} aria-hidden="true" />
      <div className="kit-actions" ref={actions} />
    </header>
  )
}
